import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { requireAdmin } from '@/src/lib/admin-auth';

type AdminAction = 'cancel' | 'process_now';

async function anonymizeUser(serviceClient: ReturnType<typeof createServiceClient>, userId: string) {
  const now = new Date().toISOString();
  const { error } = await serviceClient
    .from('profiles')
    .update({
      display_name: 'Deleted User',
      username: `deleted_${userId}`,
      bio: null,
      avatar_url: null,
      banner_url: null,
      website: null,
      phone: null,
      social_links: {},
      is_active: false,
      is_public: false,
      deleted_at: now,
      updated_at: now,
    })
    .eq('id', userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get('limit') ?? 50);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50;

    const serviceClient = adminCheck.serviceClient;
    const { data, error } = await serviceClient
      .from('account_deletion_requests')
      .select(`
        id,
        user_id,
        reason,
        detail,
        created_at,
        processed_at,
        status,
        requested_by_ip,
        profile:profiles (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching account deletion requests:', error);
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }

    const requests = data || [];
    const enriched = await Promise.all(
      requests.map(async (request) => {
        try {
          const { data: userResult } = await serviceClient.auth.admin.getUserById(
            request.user_id
          );
          return {
            ...request,
            email: userResult?.user?.email ?? null,
          };
        } catch (err) {
          return { ...request, email: null };
        }
      })
    );

    return NextResponse.json({ data: enriched });
  } catch (error: any) {
    console.error('Admin account deletions error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const body = await request.json();
    const action = body?.action as AdminAction;
    const requestId = body?.requestId as string;

    if (!requestId || !action) {
      return NextResponse.json({ error: 'requestId and action are required' }, { status: 400 });
    }

    const serviceClient = adminCheck.serviceClient;
    const { data: existing, error: existingError } = await serviceClient
      .from('account_deletion_requests')
      .select('id, user_id, status')
      .eq('id', requestId)
      .maybeSingle();

    if (existingError) {
      console.error('Error fetching deletion request:', existingError);
      return NextResponse.json({ error: 'Failed to fetch request' }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (action === 'cancel') {
      const now = new Date().toISOString();
      const { error: updateError } = await serviceClient
        .from('account_deletion_requests')
        .update({ status: 'cancelled', processed_at: now })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error cancelling request:', updateError);
        return NextResponse.json({ error: 'Failed to cancel request' }, { status: 500 });
      }

      await serviceClient
        .from('profiles')
        .update({ deleted_at: null, is_active: true, is_public: true, updated_at: now })
        .eq('id', existing.user_id);

      return NextResponse.json({ success: true });
    }

    if (action === 'process_now') {
      await anonymizeUser(serviceClient, existing.user_id);
      const now = new Date().toISOString();
      const { error: updateError } = await serviceClient
        .from('account_deletion_requests')
        .update({ status: 'processed', processed_at: now })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error processing request:', updateError);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin account deletions update error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
