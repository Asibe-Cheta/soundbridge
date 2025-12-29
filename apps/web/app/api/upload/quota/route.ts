import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

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

    // Normalize tier names: convert legacy names to current names
    // Database may return 'pro' or 'enterprise', but mobile app expects 'premium' or 'unlimited'
    function normalizeTierName(tier: string): string {
      if (tier === 'pro') return 'premium';
      if (tier === 'enterprise') return 'unlimited';
      return tier; // 'free', 'premium', 'unlimited' pass through unchanged
    }

    const normalizedTier = normalizeTierName(quota.tier);

    return NextResponse.json(
      {
        success: true,
        quota: {
          tier: normalizedTier, // Use normalized tier name
          upload_limit: quota.upload_limit,
          uploads_this_month: quota.uploads_this_month,
          remaining: quota.remaining,
          reset_date: quota.reset_date,
          is_unlimited: quota.is_unlimited,
          can_upload: quota.remaining > 0 || quota.is_unlimited
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

