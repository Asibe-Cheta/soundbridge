/**
 * GET /api/admin/music-tips — Song upload totals + track tip activity (paginated).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

type TipRow = {
  id: string;
  amount: number | string;
  currency: string | null;
  created_at: string;
  completed_at: string | null;
  is_anonymous: boolean | null;
  message: string | null;
  sender_id: string;
  recipient_id: string;
  track_id: string;
  platform_fee: number | string | null;
  creator_earnings: number | string | null;
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
  const search = (searchParams.get('search') || '').trim().toLowerCase();
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');

  try {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const [
      totalSongsRes,
      totalAudioRes,
      songsThisMonthRes,
      podcastsRes,
      mixtapesRes,
      tipsCountRes,
    ] = await Promise.all([
      service
        .from('audio_tracks')
        .select('*', { count: 'exact', head: true })
        .or('content_type.eq.music,content_type.is.null'),
      service.from('audio_tracks').select('*', { count: 'exact', head: true }),
      service
        .from('audio_tracks')
        .select('*', { count: 'exact', head: true })
        .or('content_type.eq.music,content_type.is.null')
        .gte('created_at', startOfMonth.toISOString()),
      service
        .from('audio_tracks')
        .select('*', { count: 'exact', head: true })
        .eq('content_type', 'podcast'),
      service
        .from('audio_tracks')
        .select('*', { count: 'exact', head: true })
        .eq('content_type', 'mixtape'),
      service
        .from('tips')
        .select('track_id, amount, currency', { count: 'exact' })
        .not('track_id', 'is', null)
        .eq('status', 'completed'),
    ]);

    const allTrackTips = (tipsCountRes.data ?? []) as Pick<TipRow, 'track_id' | 'amount' | 'currency'>[];
    const tracksWithTips = new Set(allTrackTips.map((t) => t.track_id).filter(Boolean)).size;

    const totalsByCurrency: Record<string, number> = {};
    for (const tip of allTrackTips) {
      const currency = (tip.currency || 'USD').toUpperCase();
      totalsByCurrency[currency] = (totalsByCurrency[currency] ?? 0) + Number(tip.amount || 0);
    }

    let matchingTrackIds: string[] | null = null;
    let matchingProfileIds: string[] | null = null;

    if (search) {
      const [{ data: tracks }, { data: profiles }] = await Promise.all([
        service.from('audio_tracks').select('id').ilike('title', `%${search}%`).limit(200),
        service
          .from('profiles')
          .select('id')
          .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
          .limit(200),
      ]);
      matchingTrackIds = (tracks ?? []).map((t: { id: string }) => t.id);
      matchingProfileIds = (profiles ?? []).map((p: { id: string }) => p.id);

      if (!matchingTrackIds.length && !matchingProfileIds.length) {
        return NextResponse.json(
          {
            summary: {
              total_songs_uploaded: totalSongsRes.count ?? 0,
              total_audio_uploads: totalAudioRes.count ?? 0,
              songs_uploaded_this_month: songsThisMonthRes.count ?? 0,
              total_podcasts: podcastsRes.count ?? 0,
              total_mixtapes: mixtapesRes.count ?? 0,
              tracks_with_tips: tracksWithTips,
              total_track_tips: tipsCountRes.count ?? allTrackTips.length,
              has_any_track_tips: allTrackTips.length > 0,
              tip_totals_by_currency: Object.entries(totalsByCurrency).map(([currency, amount]) => ({
                currency,
                amount: Math.round(amount * 100) / 100,
              })),
            },
            tips: [],
            total: 0,
            page,
            limit,
          },
          { headers: CORS },
        );
      }
    }

    let tipsQuery = service
      .from('tips')
      .select(
        'id, amount, currency, created_at, completed_at, is_anonymous, message, sender_id, recipient_id, track_id, platform_fee, creator_earnings',
        { count: 'exact' },
      )
      .not('track_id', 'is', null)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false, nullsFirst: false });

    if (dateFrom) {
      tipsQuery = tipsQuery.gte('completed_at', dateFrom);
    }
    if (dateTo) {
      tipsQuery = tipsQuery.lte('completed_at', dateTo);
    }

    if (search && matchingTrackIds && matchingProfileIds) {
      const filters: string[] = [];
      if (matchingTrackIds.length) {
        filters.push(`track_id.in.(${matchingTrackIds.join(',')})`);
      }
      if (matchingProfileIds.length) {
        filters.push(`sender_id.in.(${matchingProfileIds.join(',')})`);
        filters.push(`recipient_id.in.(${matchingProfileIds.join(',')})`);
      }
      tipsQuery = tipsQuery.or(filters.join(','));
    }

    const { data: tipRows, error: tipsError, count: tipsTotal } = await tipsQuery.range(
      page * limit,
      page * limit + limit - 1,
    );

    if (tipsError) {
      console.error('[admin/music-tips] tips:', tipsError);
      return NextResponse.json(
        { error: 'Failed to load track tips', details: tipsError.message },
        { status: 500, headers: CORS },
      );
    }

    const tips = (tipRows ?? []) as TipRow[];
    const trackIds = [...new Set(tips.map((t) => t.track_id).filter(Boolean))];
    const profileIds = [
      ...new Set(tips.flatMap((t) => [t.sender_id, t.recipient_id]).filter(Boolean)),
    ];

    const [tracksRes, profilesRes] = await Promise.all([
      trackIds.length
        ? service
            .from('audio_tracks')
            .select('id, title, content_type, creator_id, created_at')
            .in('id', trackIds)
        : Promise.resolve({ data: [] }),
      profileIds.length
        ? service.from('profiles').select('id, username, display_name').in('id', profileIds)
        : Promise.resolve({ data: [] }),
    ]);

    const trackMap = new Map((tracksRes.data ?? []).map((t: { id: string }) => [t.id, t]));
    const profileMap = new Map((profilesRes.data ?? []).map((p: { id: string }) => [p.id, p]));

    let rows = tips.map((tip) => {
      const track = trackMap.get(tip.track_id) as
        | { id: string; title: string; content_type: string | null; creator_id: string; created_at: string }
        | undefined;
      const sender = profileMap.get(tip.sender_id) as
        | { username: string | null; display_name: string | null }
        | undefined;
      const recipient = profileMap.get(tip.recipient_id) as
        | { username: string | null; display_name: string | null }
        | undefined;

      return {
        id: tip.id,
        amount: Number(tip.amount),
        currency: (tip.currency || 'USD').toUpperCase(),
        tipped_at: tip.completed_at || tip.created_at,
        is_anonymous: Boolean(tip.is_anonymous),
        message: tip.message,
        platform_fee: tip.platform_fee != null ? Number(tip.platform_fee) : null,
        creator_earnings: tip.creator_earnings != null ? Number(tip.creator_earnings) : null,
        track_id: tip.track_id,
        track_title: track?.title ?? 'Unknown track',
        track_content_type: track?.content_type ?? null,
        track_uploaded_at: track?.created_at ?? null,
        artist_username: recipient?.username ?? recipient?.display_name ?? null,
        artist_display_name: recipient?.display_name ?? recipient?.username ?? null,
        tipper_label: tip.is_anonymous
          ? 'Anonymous'
          : sender?.display_name || sender?.username || 'Unknown user',
        tipper_username: tip.is_anonymous ? null : sender?.username ?? null,
      };
    });

    const summary = {
      total_songs_uploaded: totalSongsRes.count ?? 0,
      total_audio_uploads: totalAudioRes.count ?? 0,
      songs_uploaded_this_month: songsThisMonthRes.count ?? 0,
      total_podcasts: podcastsRes.count ?? 0,
      total_mixtapes: mixtapesRes.count ?? 0,
      tracks_with_tips: tracksWithTips,
      total_track_tips: tipsCountRes.count ?? allTrackTips.length,
      has_any_track_tips: allTrackTips.length > 0,
      tip_totals_by_currency: Object.entries(totalsByCurrency).map(([currency, amount]) => ({
        currency,
        amount: Math.round(amount * 100) / 100,
      })),
    };

    return NextResponse.json(
      {
        summary,
        tips: rows,
        total: tipsTotal ?? rows.length,
        page,
        limit,
      },
      { headers: CORS },
    );
  } catch (e) {
    console.error('GET /api/admin/music-tips:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
