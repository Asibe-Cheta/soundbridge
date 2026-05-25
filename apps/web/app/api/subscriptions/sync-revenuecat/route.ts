/**
 * POST /api/subscriptions/sync-revenuecat
 * Called by mobile app after every successful RevenueCat purchase.
 * Updates profile tier and sends upgrade confirmation email when tier goes up.
 * @see WEB_TEAM_SUBSCRIPTION_UPGRADE_EMAIL.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { SendGridService } from '@/src/lib/sendgrid-service';
import {
  isUpgrade,
  getPlanPriceLabel,
  getPlanFeatures,
  type SubscriptionTier,
} from '@/src/lib/subscription-plan-email';
import { hasManualPermanentSubscriptionGrant } from '@/src/lib/revenuecat-entitlements';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

const MANAGE_URL = 'https://soundbridge.live/settings/billing';

function normalizeTier(value: unknown): SubscriptionTier {
  const s = String(value || 'free').toLowerCase();
  if (s === 'unlimited') return 'unlimited';
  if (s === 'premium') return 'premium';
  return 'free';
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const body = await request.json().catch(() => ({}));
    const tier = normalizeTier(body.tier ?? body.subscription_tier);
    const activeSubscriptions: string[] = Array.isArray(body.activeSubscriptions)
      ? body.activeSubscriptions
      : [];

    // Current tier from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status, subscription_period_end, subscription_renewal_date, updated_at')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[sync-revenuecat] Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to load profile' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const previousTier = normalizeTier(profile?.subscription_tier ?? 'free');

    if (await hasManualPermanentSubscriptionGrant(supabase, user.id)) {
      console.log('[sync-revenuecat] Skipping overwrite for manual permanent subscription grant:', user.id);
      return NextResponse.json(
        { success: true, tier: previousTier, skipped: 'manual_permanent_grant' },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: tier,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[sync-revenuecat] Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // Send upgrade email only when tier goes up
    if (isUpgrade(previousTier, tier) && (tier === 'premium' || tier === 'unlimited')) {
      const email = user.email?.trim();
      if (email) {
        const planPrice = getPlanPriceLabel(tier, activeSubscriptions);
        const planFeatures = getPlanFeatures(tier);
        await SendGridService.sendSubscriptionUpgradeEmail({
          to: email,
          plan_name: tier === 'premium' ? 'Premium' : 'Unlimited',
          plan_price: planPrice,
          plan_features: planFeatures,
          manage_url: MANAGE_URL,
        });
      }
    }

    return NextResponse.json(
      { success: true, tier },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[sync-revenuecat] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
