import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { isEarlyAdopterPremiumGrant, resolveEffectiveTier } from '@/src/lib/effective-subscription-tier';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET upload quota status
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Call the database function to check upload quota
    const { data: quotaData, error: quotaError } = await supabase
      .rpc('check_upload_quota', { p_user_id: user.id });

    if (quotaError) {
      console.error('Error checking upload quota:', quotaError);
      return NextResponse.json(
        { error: 'Failed to check upload quota', details: quotaError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse the JSONB response from the function
    const quota = quotaData as {
      tier: string;
      upload_limit: number;
      uploads_this_month: number;
      remaining: number;
      reset_date: string;
      is_unlimited: boolean;
    };

    // Resolve tier from DB grants (service role) so RLS/column quirks never hide early_adopter flags.
    const service = createServiceClient();
    const [{ data: profile }, { data: subscription }] = await Promise.all([
      service
        .from('profiles')
        .select('subscription_tier, early_adopter, subscription_period_end')
        .eq('id', user.id)
        .maybeSingle(),
      service
        .from('user_subscriptions')
        .select('tier')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    // Normalize tier names: convert legacy names to current names
    // Database may return 'pro' or 'enterprise', but mobile app expects 'premium' or 'unlimited'
    function normalizeTierName(tier: string): string {
      if (tier === 'pro') return 'premium';
      if (tier === 'enterprise') return 'unlimited';
      return tier; // 'free', 'premium', 'unlimited' pass through unchanged
    }

    const normalizedTier = normalizeTierName(quota.tier);
    const effectiveTier = resolveEffectiveTier(
      profile,
      (subscription?.tier as string | null | undefined) || normalizedTier,
    );

    if (profile && isEarlyAdopterPremiumGrant(profile)) {
      return NextResponse.json(
        {
          success: true,
          quota: {
            tier: effectiveTier,
            upload_limit: null,
            uploads_this_month: quota.uploads_this_month,
            remaining: null,
            reset_date: quota.reset_date ?? null,
            is_unlimited: effectiveTier === 'unlimited',
            can_upload: true,
          },
        },
        { status: 200, headers: corsHeaders },
      );
    }

    // If quota function returns free while user has active manual premium/unlimited grant,
    // override response tier and minimum limits so frontend gates align with backend grants.
    const resolvedQuota = { ...quota };
    if (effectiveTier !== 'free' && normalizedTier === 'free') {
      if (effectiveTier === 'premium') {
        resolvedQuota.tier = 'premium';
        resolvedQuota.is_unlimited = false;
        resolvedQuota.upload_limit = Math.max(Number(resolvedQuota.upload_limit || 0), 7);
        resolvedQuota.remaining = Math.max(
          0,
          resolvedQuota.upload_limit - Number(resolvedQuota.uploads_this_month || 0),
        );
      } else if (effectiveTier === 'unlimited') {
        resolvedQuota.tier = 'unlimited';
        resolvedQuota.is_unlimited = true;
        resolvedQuota.upload_limit = Math.max(Number(resolvedQuota.upload_limit || 0), 999999);
        resolvedQuota.remaining = Math.max(Number(resolvedQuota.remaining || 0), 1);
      }
    } else {
      resolvedQuota.tier = effectiveTier;
    }

    return NextResponse.json(
      {
        success: true,
        quota: {
          tier: resolvedQuota.tier,
          upload_limit: resolvedQuota.upload_limit,
          uploads_this_month: resolvedQuota.uploads_this_month,
          remaining: resolvedQuota.remaining,
          reset_date: resolvedQuota.reset_date,
          is_unlimited: resolvedQuota.is_unlimited,
          can_upload: resolvedQuota.remaining > 0 || resolvedQuota.is_unlimited
        }
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error in GET /api/upload/quota:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

