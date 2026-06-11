/**
 * GET /api/admin/music-tips — Song upload totals + track tip activity (paginated).
 * Query: page, limit, search, date_from, date_to, export=csv
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import type { SupabaseClient } from '@supabase/supabase-js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const CSV_EXPORT_LIMIT = 5000;

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

export type MusicTipExportRow = {
  id: string;
  amount: number;
  currency: string;
  tipped_at: string;
  is_anonymous: boolean;
  message: string | null;
  platform_fee: number | null;
  creator_earnings: number | null;
  track_id: string;
  track_title: string;
  track_content_type: string | null;
  artist_username: string | null;
  artist_display_name: string | null;
  tipper_label: string;
  tipper_username: string | null;
};

function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function tipsToCsv(rows: MusicTipExportRow[]): string {
  const headers = [
    'tip_id',
    'tipped_at',
    'track_id',
    'track_title',
    'track_content_type',
    'artist',
    'tipper',
    'tipper_username',
    'is_anonymous',
    'amount',
    'currency',
    'platform_fee',
    'creator_earnings',
    'message',
  ];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(
      [
        escapeCsv(row.id),
        escapeCsv(row.tipped_at),
        escapeCsv(row.track_id),
        escapeCsv(row.track_title),
        escapeCsv(row.track_content_type),
        escapeCsv(row.artist_display_name),
        escapeCsv(row.tipper_label),
        escapeCsv(row.tipper_username),
        escapeCsv(row.is_anonymous ? 'yes' : 'no'),
        escapeCsv(row.amount),
        escapeCsv(row.currency),
        escapeCsv(row.platform_fee),
        escapeCsv(row.creator_earnings),
        escapeCsv(row.message),
      ].join(','),
    );
  }
  return lines.join('\n');
}

function endOfDayIso(dateTo: string): string | null {
  const end = new Date(dateTo);
  if (Number.isNaN(end.getTime())) return null;
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
}

function buildTipsQuery(
  service: SupabaseClient,
  dateFrom: string | null,
  dateTo: string | null,
  withCount = true,
) {
  let query = service
    .from('tips')
    .select(
      'id, amount, currency, created_at, completed_at, is_anonymous, message, sender_id, recipient_id, track_id, platform_fee, creator_earnings',
      withCount ? { count: 'exact' } : undefined,
    )
    .not('track_id', 'is', null)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false, nullsFirst: false });

  if (dateFrom) query = query.gte('completed_at', dateFrom);
  if (dateTo) {
    const endIso = endOfDayIso(dateTo);
    if (endIso) query = query.lte('completed_at', endIso);
  }

  return query;
}

async function applySearchFilter(
  service: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tipsQuery: any,
  search: string,
) {
  const [{ data: tracks }, { data: profiles }] = await Promise.all([
    service.from('audio_tracks').select('id').ilike('title', `%${search}%`).limit(200),
    service
      .from('profiles')
      .select('id')
      .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
      .limit(200),
  ]);
  const matchingTrackIds = (tracks ?? []).map((t: { id: string }) => t.id);
  const matchingProfileIds = (profiles ?? []).map((p: { id: string }) => p.id);

  if (!matchingTrackIds.length && !matchingProfileIds.length) {
    return { query: tipsQuery, empty: true };
  }

  const filters: string[] = [];
  if (matchingTrackIds.length) filters.push(`track_id.in.(${matchingTrackIds.join(',')})`);
  if (matchingProfileIds.length) {
    filters.push(`sender_id.in.(${matchingProfileIds.join(',')})`);
    filters.push(`recipient_id.in.(${matchingProfileIds.join(',')})`);
  }
  return { query: tipsQuery.or(filters.join(',')), empty: false };
}

async function mapTipsToRows(service: SupabaseClient, tips: TipRow[]): Promise<MusicTipExportRow[]> {
  const trackIds = [...new Set(tips.map((t) => t.track_id).filter(Boolean))];
  const profileIds = [...new Set(tips.flatMap((t) => [t.sender_id, t.recipient_id]).filter(Boolean))];

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

  return tips.map((tip) => {
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
      artist_username: recipient?.username ?? recipient?.display_name ?? null,
      artist_display_name: recipient?.display_name ?? recipient?.username ?? null,
      tipper_label: tip.is_anonymous
        ? 'Anonymous'
        : sender?.display_name || sender?.username || 'Unknown user',
      tipper_username: tip.is_anonymous ? null : sender?.username ?? null,
    };
  });
}

function totalsFromTips(tips: Pick<TipRow, 'track_id' | 'amount' | 'currency'>[]) {
  const tracksWithTips = new Set(tips.map((t) => t.track_id).filter(Boolean)).size;
  const totalsByCurrency: Record<string, number> = {};
  for (const tip of tips) {
    const currency = (tip.currency || 'USD').toUpperCase();
    totalsByCurrency[currency] = (totalsByCurrency[currency] ?? 0) + Number(tip.amount || 0);
  }
  return {
    tracks_with_tips: tracksWithTips,
    total_track_tips: tips.length,
    has_any_track_tips: tips.length > 0,
    tip_totals_by_currency: Object.entries(totalsByCurrency).map(([currency, amount]) => ({
      currency,
      amount: Math.round(amount * 100) / 100,
    })),
  };
}

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
  const exportFormat = (searchParams.get('export') || 'json').toLowerCase();
  const exportMode = exportFormat === 'csv';
  const hasDateFilter = Boolean(dateFrom || dateTo);

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
      allTrackTipsRes,
      filteredTrackTipsRes,
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
      hasDateFilter
        ? buildTipsQuery(service, dateFrom, dateTo, false).select('track_id, amount, currency')
        : Promise.resolve({ data: null as Pick<TipRow, 'track_id' | 'amount' | 'currency'>[] | null }),
    ]);

    const allTrackTips = (allTrackTipsRes.data ?? []) as Pick<TipRow, 'track_id' | 'amount' | 'currency'>[];
    const filteredTrackTips = hasDateFilter
      ? ((filteredTrackTipsRes.data ?? []) as Pick<TipRow, 'track_id' | 'amount' | 'currency'>[])
      : allTrackTips;

    const tipStats = totalsFromTips(filteredTrackTips);

    if (search && !exportMode) {
      let tipsQuery = buildTipsQuery(service, dateFrom, dateTo, true);
      const { query, empty } = await applySearchFilter(service, tipsQuery, search);
      tipsQuery = query;

      if (empty) {
        return NextResponse.json(
          {
            summary: {
              total_songs_uploaded: totalSongsRes.count ?? 0,
              total_audio_uploads: totalAudioRes.count ?? 0,
              songs_uploaded_this_month: songsThisMonthRes.count ?? 0,
              total_podcasts: podcastsRes.count ?? 0,
              total_mixtapes: mixtapesRes.count ?? 0,
              ...tipStats,
              date_from: dateFrom,
              date_to: dateTo,
            },
            tips: [],
            total: 0,
            page,
            limit,
          },
          { headers: CORS },
        );
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

      const rows = await mapTipsToRows(service, (tipRows ?? []) as TipRow[]);

      return NextResponse.json(
        {
          summary: {
            total_songs_uploaded: totalSongsRes.count ?? 0,
            total_audio_uploads: totalAudioRes.count ?? 0,
            songs_uploaded_this_month: songsThisMonthRes.count ?? 0,
            total_podcasts: podcastsRes.count ?? 0,
            total_mixtapes: mixtapesRes.count ?? 0,
            ...tipStats,
            date_from: dateFrom,
            date_to: dateTo,
          },
          tips: rows,
          total: tipsTotal ?? rows.length,
          page,
          limit,
        },
        { headers: CORS },
      );
    }

    let tipsQuery = buildTipsQuery(service, dateFrom, dateTo, !exportMode);
    if (search) {
      const { query, empty } = await applySearchFilter(service, tipsQuery, search);
      tipsQuery = query;
      if (empty) {
        if (exportMode) {
          const csv = tipsToCsv([]);
          return new NextResponse(csv, {
            status: 200,
            headers: {
              ...CORS,
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': 'attachment; filename="soundbridge-track-tips-empty.csv"',
            },
          });
        }
        return NextResponse.json(
          {
            summary: {
              total_songs_uploaded: totalSongsRes.count ?? 0,
              total_audio_uploads: totalAudioRes.count ?? 0,
              songs_uploaded_this_month: songsThisMonthRes.count ?? 0,
              total_podcasts: podcastsRes.count ?? 0,
              total_mixtapes: mixtapesRes.count ?? 0,
              ...tipStats,
              date_from: dateFrom,
              date_to: dateTo,
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

    const rangeFrom = exportMode ? 0 : page * limit;
    const rangeTo = exportMode ? CSV_EXPORT_LIMIT - 1 : page * limit + limit - 1;

    const { data: tipRows, error: tipsError, count: tipsTotal } = await tipsQuery.range(rangeFrom, rangeTo);

    if (tipsError) {
      console.error('[admin/music-tips] tips:', tipsError);
      return NextResponse.json(
        { error: 'Failed to load track tips', details: tipsError.message },
        { status: 500, headers: CORS },
      );
    }

    const rows = await mapTipsToRows(service, (tipRows ?? []) as TipRow[]);

    if (exportMode) {
      const csv = tipsToCsv(rows);
      const slug = dateFrom && dateTo ? `${dateFrom}_to_${dateTo}` : 'all';
      return new NextResponse(csv, {
        status: 200,
        headers: {
          ...CORS,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="soundbridge-track-tips-${slug}.csv"`,
        },
      });
    }

    return NextResponse.json(
      {
        summary: {
          total_songs_uploaded: totalSongsRes.count ?? 0,
          total_audio_uploads: totalAudioRes.count ?? 0,
          songs_uploaded_this_month: songsThisMonthRes.count ?? 0,
          total_podcasts: podcastsRes.count ?? 0,
          total_mixtapes: mixtapesRes.count ?? 0,
          ...tipStats,
          date_from: dateFrom,
          date_to: dateTo,
        },
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
