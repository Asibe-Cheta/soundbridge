/**
 * Follow (one-way, no acceptance): distinct from Connect (mutual, requires acceptance).
 * POST   /api/user/[userId]/follow - Follow user
 * DELETE /api/user/[userId]/follow - Unfollow user
 * GET    /api/user/[userId]/follow - Follow status (is_following, followed_at)
 *
 * Uses `follows` table. Auth: Bearer token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { sendExpoPush } from '@/src/lib/push-notifications';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
  'Content-Type': 'application/json',
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params;
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    if (user.id === targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot follow yourself' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: existing } = await supabase
      .from('follows')
      .select('id, created_at')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          success: true,
          message: 'Already following this user',
          is_following: true,
          followed_at: existing.created_at,
        },
        { headers: corsHeaders }
      );
    }

    const { data: row, error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: targetUserId })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('POST /api/user/[userId]/follow:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to follow user', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Push: New Follower — notify User B (targetUserId)
    try {
      const service = createServiceClient();
      const { data: followerProfile } = await service
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .single();
      const displayName = followerProfile?.display_name || followerProfile?.username || 'Someone';
      await sendExpoPush(service, targetUserId, {
        title: 'New Follower',
        body: `${displayName} started following you`,
        data: { type: 'new_follower', followerId: user.id, userId: user.id },
        channelId: 'social',
      });
    } catch (pushErr) {
      console.error('Follow push notification:', pushErr);
    }

    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', targetUserId);

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully followed user',
        is_following: true,
        followed_at: row.created_at,
        follower_count: count ?? 0,
      },
      { headers: corsHeaders }
    );
  } catch (err: unknown) {
    console.error('POST /api/user/[userId]/follow:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params;
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId);

    if (error) {
      console.error('DELETE /api/user/[userId]/follow:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to unfollow user', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Unfollowed user', is_following: false },
      { headers: corsHeaders }
    );
  } catch (err: unknown) {
    console.error('DELETE /api/user/[userId]/follow:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
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
      console.error('GET /api/user/[userId]/follow:', error);
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
    console.error('GET /api/user/[userId]/follow:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
