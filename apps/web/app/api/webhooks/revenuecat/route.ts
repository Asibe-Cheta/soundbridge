/**
 * POST /api/webhooks/revenuecat
 * RevenueCat webhook backup for subscription events (INITIAL_PURCHASE, RENEWAL, CANCELLATION, etc.).
 * Updates profile tier and sends upgrade email when appropriate.
 * Do not send duplicate email if /api/subscriptions/sync-revenuecat ran within last 60 seconds.
 * @see WEB_TEAM_SUBSCRIPTION_UPGRADE_EMAIL.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SubscriptionEmailService } from '@/src/services/SubscriptionEmailService';
import { SendGridService } from '@/src/lib/sendgrid-service';
import {
  isUpgrade,
  getPlanPriceLabel,
  getPlanFeatures,
  type SubscriptionTier,
} from '@/src/lib/subscription-plan-email';

const MANAGE_URL = 'https://soundbridge.live/settings/billing';
const DUPLICATE_EMAIL_WINDOW_MS = 60 * 1000; // 60 seconds

function normalizeTier(value: string): SubscriptionTier {
  const s = String(value || 'free').toLowerCase();
  if (s === 'unlimited') return 'unlimited';
  if (s === 'premium') return 'premium';
  return 'free';
}

/** Map RevenueCat product_id to tier (e.g. "premium_monthly", "unlimited_annual"). */
function productIdToTier(productId: string | null | undefined): SubscriptionTier {
  if (!productId) return 'free';
  const id = productId.toLowerCase();
  if (id.includes('unlimited')) return 'unlimited';
  if (id.includes('premium')) return 'premium';
  return 'free';
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const secret = process.env.REVENUECAT_WEBHOOK_AUTHORIZATION?.trim();
    if (secret) {
      const expected = secret.startsWith('Bearer ') ? secret : `Bearer ${secret}`;
      if (authHeader !== expected) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const event = body.event ?? body;
    const eventType = event.type ?? event.event_type;
    const appUserId = event.app_user_id ?? event.original_app_user_id;
    const productId = event.product_id ?? event.new_product_id;

    if (!appUserId) {
      return NextResponse.json({ error: 'Missing app_user_id' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Resolve tier from event type and product
    let newTier: SubscriptionTier = 'free';
    if (eventType === 'CANCELLATION' || eventType === 'EXPIRATION') {
      newTier = 'free';
    } else if (
      eventType === 'INITIAL_PURCHASE' ||
      eventType === 'RENEWAL' ||
      eventType === 'PRODUCT_CHANGE' ||
      eventType === 'UNCANCELLATION' ||
      eventType === 'SUBSCRIPTION_EXTENDED' ||
      eventType === 'TEMPORARY_ENTITLEMENT_GRANT'
    ) {
      newTier = productIdToTier(productId);
    }
    // Ignore TEST, BILLING_ISSUE, etc. for tier updates unless you want to handle them

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, subscription_tier, updated_at')
      .eq('id', appUserId)
      .single();

    if (fetchError || !profile) {
      console.error('[webhooks/revenuecat] Profile not found for app_user_id:', appUserId, fetchError);
      return NextResponse.json({ received: true });
    }

    const previousTier = normalizeTier(profile.subscription_tier ?? 'free');
    const updatedAt = profile.updated_at ? new Date(profile.updated_at).getTime() : 0;
    const withinDuplicateWindow = Date.now() - updatedAt < DUPLICATE_EMAIL_WINDOW_MS;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: newTier,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appUserId);

    if (updateError) {
      console.error('[webhooks/revenuecat] Error updating profile:', updateError);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Send upgrade email only when tier went up and not within 60s of last update (avoid duplicate with sync-revenuecat)
    if (
      isUpgrade(previousTier, newTier) &&
      (newTier === 'premium' || newTier === 'unlimited') &&
      !withinDuplicateWindow
    ) {
      const userInfo = await SubscriptionEmailService.getUserInfo(appUserId);
      if (userInfo?.email) {
        const activeSubscriptions = event.period_type === 'NORMAL' ? ['monthly'] : [];
        if (productId?.toLowerCase().includes('annual')) activeSubscriptions.push('annual');
        const planPrice = getPlanPriceLabel(newTier, activeSubscriptions);
        const planFeatures = getPlanFeatures(newTier);
        await SendGridService.sendSubscriptionUpgradeEmail({
          to: userInfo.email,
          plan_name: newTier === 'premium' ? 'Premium' : 'Unlimited',
          plan_price: planPrice,
          plan_features: planFeatures,
          manage_url: MANAGE_URL,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[webhooks/revenuecat] Error:', err);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
