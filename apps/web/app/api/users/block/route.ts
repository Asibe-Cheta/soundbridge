import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const BlockUserSchema = z.object({
  blockedUserId: z.string().uuid('valid blockedUserId is required'),
  reason: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = BlockUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data', details: parsed.error.flatten() }, { status: 400 });
    }

    const { blockedUserId, reason } = parsed.data;
    if (blockedUserId === user.id) {
      return NextResponse.json({ error: 'cannot block yourself' }, { status: 400 });
    }

    const service = createServiceClient();

    const { data: target } = await service.from('profiles').select('id').eq('id', blockedUserId).maybeSingle();
    if (!target) {
      return NextResponse.json({ error: 'target user not found' }, { status: 404 });
    }

    const { data: existing } = await service
      .from('user_blocks')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedUserId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'already blocked' }, { status: 409 });
    }

    const { data, error } = await service
      .from('user_blocks')
      .insert({ blocker_id: user.id, blocked_id: blockedUserId, reason: reason?.trim() || null })
      .select('id, blocker_id, blocked_id, reason, created_at')
      .single();

    if (error || !data) {
      console.error('POST /api/users/block:', error);
      return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'User blocked successfully',
      data,
    });
  } catch (error) {
    console.error('POST /api/users/block:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: existing } = await service
      .from('user_blocks')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: 'block record not found' }, { status: 404 });
    }

    const { error } = await service
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId);
    if (error) {
      console.error('DELETE /api/users/block:', error);
      return NextResponse.json({ error: 'Failed to unblock user' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    console.error('DELETE /api/users/block:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const service = createServiceClient();
    const searchParams = new URL(request.url).searchParams;
    const checkUserId = searchParams.get('checkUserId');
    const list = searchParams.get('list');

    if (checkUserId) {
      const { data: rows, error } = await service
        .from('user_blocks')
        .select('id, blocker_id, blocked_id, reason, created_at')
        .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${checkUserId}),and(blocker_id.eq.${checkUserId},blocked_id.eq.${user.id})`);
      if (error) {
        console.error('GET /api/users/block check:', error);
        return NextResponse.json({ error: 'Failed to check block status' }, { status: 500 });
      }

      const isBlockingRow = (rows || []).find((r) => r.blocker_id === user.id && r.blocked_id === checkUserId) || null;
      const isBlockedBy = (rows || []).some((r) => r.blocker_id === checkUserId && r.blocked_id === user.id);
      const isBlocking = !!isBlockingRow;
      return NextResponse.json({
        success: true,
        isBlocked: isBlocking || isBlockedBy,
        isBlockedBy,
        isBlocking,
        block: isBlockingRow
          ? {
              id: isBlockingRow.id,
              reason: isBlockingRow.reason,
              created_at: isBlockingRow.created_at,
            }
          : null,
      });
    }

    if (list === 'blocked') {
      const { data, error } = await service
        .from('user_blocks')
        .select(
          `
          id,
          reason,
          created_at,
          blocked:profiles!user_blocks_blocked_id_fkey(
            id,
            display_name,
            username,
            avatar_url
          )
        `,
        )
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('GET /api/users/block list=blocked:', error);
        return NextResponse.json({ error: 'Failed to fetch blocked users' }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: data || [], count: data?.length || 0 });
    }

    return NextResponse.json({ error: 'Invalid query. Use list=blocked or checkUserId=<userId>' }, { status: 400 });
  } catch (error) {
    console.error('GET /api/users/block:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

