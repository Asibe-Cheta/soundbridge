/**
 * GET /api/user/[userId]/follow-status
 * Returns whether the current user follows the target user. Same as GET /api/user/[userId]/follow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
  'Content-Type': 'application/json',
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params;
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, false);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: row, error } = await supabase
      .from('follows')
      .select('id, created_at')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .maybeSingle();

    if (error) {
      console.error('GET /api/user/[userId]/follow-status:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to check follow status', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        is_following: !!row,
        followed_at: row?.created_at ?? null,
      },
      { headers: corsHeaders }
    );
  } catch (err: unknown) {
    console.error('GET /api/user/[userId]/follow-status:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
