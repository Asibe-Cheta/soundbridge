import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { canUserUploadNow } from '@/src/lib/upload-entitlement';

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

    const { allowed, effectiveTier, limitRow } = await canUserUploadNow(supabase, user.id);

    if (!limitRow) {
      return NextResponse.json(
        { error: 'Failed to check upload limit' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        can_upload: allowed,
        uploads_used: limitRow.uploads_used,
        uploads_limit: limitRow.uploads_limit,
        limit_type: limitRow.limit_type,
        reset_date: limitRow.reset_date,
        subscription_tier: effectiveTier,
        message: getUploadLimitMessage(limitRow.uploads_used, limitRow.uploads_limit, limitRow.limit_type),
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
function getUploadLimitMessage(uploadsUsed: number, uploadsLimit: number, limitType: string): string {
  // No tier has a hard upload-count cap any more — storage is the only
  // real limit, so canUserUploadNow() always resolves can_upload: true and
  // limit_type: 'unlimited' in the normal case.
  if (limitType === 'unlimited') {
    return 'You have unlimited uploads';
  }

  return `Uploads used: ${uploadsUsed} of ${uploadsLimit}`;
}
