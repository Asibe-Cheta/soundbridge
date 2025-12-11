import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * GET /api/upload/check-limit
 * Check if user can upload based on their tier limits
 * Returns: can_upload, uploads_used, uploads_limit, limit_type, reset_date
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Call database function to check upload limit
    const { data, error } = await supabase.rpc('check_upload_limit', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Error checking upload limit:', error);
      return NextResponse.json(
        { error: 'Failed to check upload limit', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get user's tier for additional context
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_renewal_date')
      .eq('id', user.id)
      .single();

    const result = data[0]; // RPC returns array

    return NextResponse.json(
      {
        can_upload: result.can_upload,
        uploads_used: result.uploads_used,
        uploads_limit: result.uploads_limit,
        limit_type: result.limit_type, // 'lifetime', 'monthly', 'unlimited'
        reset_date: result.reset_date,
        subscription_tier: profile?.subscription_tier || 'free',
        message: getUploadLimitMessage(
          result.can_upload,
          result.uploads_used,
          result.uploads_limit,
          result.limit_type,
          profile?.subscription_tier
        ),
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in check-limit endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * Generate user-friendly message based on upload limit status
 */
function getUploadLimitMessage(
  canUpload: boolean,
  uploadsUsed: number,
  uploadsLimit: number,
  limitType: string,
  tier?: string
): string {
  if (limitType === 'unlimited') {
    return 'You have unlimited uploads';
  }

  if (!canUpload) {
    if (limitType === 'lifetime') {
      return `You've reached your limit of ${uploadsLimit} tracks. Upgrade to Premium for 7 tracks/month or Unlimited for unlimited uploads.`;
    } else if (limitType === 'monthly') {
      return `You've uploaded ${uploadsUsed} of ${uploadsLimit} tracks this month. Upgrade to Unlimited for unlimited uploads.`;
    }
  }

  if (limitType === 'lifetime') {
    return `You've uploaded ${uploadsUsed} of ${uploadsLimit} free tracks`;
  } else if (limitType === 'monthly') {
    const remaining = uploadsLimit - uploadsUsed;
    return `You have ${remaining} upload${remaining === 1 ? '' : 's'} remaining this month`;
  }

  return `Uploads used: ${uploadsUsed} of ${uploadsLimit}`;
}
