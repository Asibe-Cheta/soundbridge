/**
 * GET /api/admin/live-streams — Who's gone live, past and present, with tips received per session.
 * Query: page, limit, status (active|ended|failed), search (creator username/display name)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

type StreamRow = {
  id: string;
  user_id: string;
  cloudflare_stream_id: string;
  status: 'active' | 'ended' | 'failed';
  started_at: string;
  ended_at: string | null;
  title: string | null;
  viewer_count: number;
  created_at: string;
};

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }

  const service = admin.serviceClient;
  const { searchParams } = new URL(request.url);
  const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
  const status = searchParams.get('status');
  const search = (searchParams.get('search') || '').trim();

  try {
    const [totalRes, activeRes, uniqueCreatorsRes] = await Promise.all([
      service.from('live_streams').select('*', { count: 'exact', head: true }),
      service.from('live_streams').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      service.from('live_streams').select('user_id'),
    ]);

    const uniqueCreators = new Set((uniqueCreatorsRes.data ?? []).map((r: { user_id: string }) => r.user_id)).size;

    let query = service
      .from('live_streams')
      .select('id, user_id, cloudflare_stream_id, status, started_at, ended_at, title, viewer_count, created_at', {
        count: 'exact',
      })
      .order('started_at', { ascending: false });

    if (status && ['active', 'ended', 'failed'].includes(status)) {
      query = query.eq('status', status);
    }

    if (search) {
      const { data: matchingProfiles } = await service
        .from('profiles')
        .select('id')
        .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
        .limit(200);
      const matchingIds = (matchingProfiles ?? []).map((p: { id: string }) => p.id);
      if (matchingIds.length === 0) {
        return NextResponse.json(
          {
            summary: { total_streams: totalRes.count ?? 0, active_now: activeRes.count ?? 0, unique_creators: uniqueCreators },
            streams: [],
            total: 0,
            page,
            limit,
          },
          { headers: CORS },
        );
      }
      query = query.in('user_id', matchingIds);
    }

    const { data: streamRows, error: streamsError, count: streamsTotal } = await query.range(
      page * limit,
      page * limit + limit - 1,
    );

    if (streamsError) {
      console.error('[admin/live-streams] streams:', streamsError);
      return NextResponse.json(
        { error: 'Failed to load live streams', details: streamsError.message },
        { status: 500, headers: CORS },
      );
    }

    const streams = (streamRows ?? []) as StreamRow[];
    const streamIds = streams.map((s) => s.id);
    const userIds = [...new Set(streams.map((s) => s.user_id))];

    const [profilesRes, tipsRes] = await Promise.all([
      userIds.length
        ? service.from('profiles').select('id, username, display_name, avatar_url').in('id', userIds)
        : Promise.resolve({ data: [] }),
      streamIds.length
        ? service
            .from('tips')
            .select('live_stream_id, amount, currency')
            .in('live_stream_id', streamIds)
            .eq('status', 'completed')
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map(
      (profilesRes.data ?? []).map((p: { id: string; username: string | null; display_name: string | null; avatar_url: string | null }) => [p.id, p]),
    );

    const tipsByStream = new Map<string, { count: number; totalsByCurrency: Record<string, number> }>();
    for (const tip of (tipsRes.data ?? []) as { live_stream_id: string; amount: number | string; currency: string | null }[]) {
      const entry = tipsByStream.get(tip.live_stream_id) ?? { count: 0, totalsByCurrency: {} };
      entry.count += 1;
      const currency = (tip.currency || 'USD').toUpperCase();
      entry.totalsByCurrency[currency] = (entry.totalsByCurrency[currency] ?? 0) + Number(tip.amount || 0);
      tipsByStream.set(tip.live_stream_id, entry);
    }

    const rows = streams.map((s) => {
      const profile = profileMap.get(s.user_id) as
        | { username: string | null; display_name: string | null; avatar_url: string | null }
        | undefined;
      const tipStats = tipsByStream.get(s.id) ?? { count: 0, totalsByCurrency: {} };
      const startedMs = new Date(s.started_at).getTime();
      const endedMs = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
      const durationSeconds = Number.isFinite(startedMs) ? Math.max(0, Math.round((endedMs - startedMs) / 1000)) : null;

      return {
        id: s.id,
        creator_id: s.user_id,
        creator_username: profile?.username ?? null,
        creator_display_name: profile?.display_name ?? null,
        creator_avatar_url: profile?.avatar_url ?? null,
        cloudflare_stream_id: s.cloudflare_stream_id,
        status: s.status,
        title: s.title,
        started_at: s.started_at,
        ended_at: s.ended_at,
        duration_seconds: durationSeconds,
        viewer_count: s.viewer_count,
        tip_count: tipStats.count,
        tip_totals_by_currency: Object.entries(tipStats.totalsByCurrency).map(([currency, amount]) => ({
          currency,
          amount: Math.round(amount * 100) / 100,
        })),
      };
    });

    return NextResponse.json(
      {
        summary: { total_streams: totalRes.count ?? 0, active_now: activeRes.count ?? 0, unique_creators: uniqueCreators },
        streams: rows,
        total: streamsTotal ?? rows.length,
        page,
        limit,
      },
      { headers: CORS },
    );
  } catch (e) {
    console.error('GET /api/admin/live-streams:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
