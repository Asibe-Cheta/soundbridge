import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { resolveEffectiveTier } from '@/src/lib/effective-subscription-tier';
import { formatAvailabilityPreference } from '@/src/lib/discovery-intelligence';

export const dynamic = 'force-dynamic';
export const revalidate = 86400;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, early_adopter, subscription_period_end, genre, genres')
      .eq('id', user.id)
      .single();

    const tier = resolveEffectiveTier(profile, 'free');

    if (tier === 'free') {
      return NextResponse.json(
        {
          success: true,
          tier: 'free',
          locked: true,
        },
        { headers: { ...corsHeaders, 'Cache-Control': 'private, max-age=86400' } },
      );
    }

    const service = (await import('@/src/lib/supabase')).createServiceClient();

    const { data: trackRows } = await service
      .from('audio_tracks')
      .select(
        `
        id, title, cover_art_url, genre,
        track_quality_signals (
          total_plays, unique_listeners, repeat_listens,
          tip_count, tip_rate, live_interest_yes_count, quality_score,
          share_count, bookmark_count, live_interest_rate, updated_at
        )
      `,
      )
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    const tracks = (trackRows || []).map((t: Record<string, unknown>) => {
      const tqs = Array.isArray(t.track_quality_signals)
        ? t.track_quality_signals[0]
        : t.track_quality_signals;
      const sig = (tqs || {}) as Record<string, number>;
      const totalPlays = sig.total_plays || 0;
      const repeatRate = totalPlays > 0 ? ((sig.repeat_listens || 0) / totalPlays) * 100 : 0;
      return {
        id: t.id,
        title: t.title,
        cover_art_url: t.cover_art_url,
        genre: t.genre,
        total_plays: totalPlays,
        unique_listeners: sig.unique_listeners || 0,
        repeat_listen_rate_percent: Math.round(repeatRate * 10) / 10,
        tip_rate_percent: Math.round((sig.tip_rate || 0) * 1000) / 10,
        live_interest_count: sig.live_interest_yes_count || 0,
        quality_score: Math.round((sig.quality_score || 0) * 10) / 10,
        signal_breakdown:
          tier === 'unlimited'
            ? {
                repeat_component: totalPlays > 0 ? ((sig.repeat_listens || 0) / totalPlays) * 40 : 0,
                tip_component: (sig.tip_rate || 0) * 35,
                live_interest_component: (sig.live_interest_rate || 0) * 15,
                social_component:
                  (sig.unique_listeners || 0) > 0
                    ? (((sig.share_count || 0) + (sig.bookmark_count || 0)) / (sig.unique_listeners || 1)) * 10
                    : 0,
              }
            : undefined,
      };
    });

    tracks.sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0));

    const { data: affinityRows } = await service
      .from('listener_genre_affinity')
      .select(
        `
        user_id,
        tips_sent,
        repeat_listens,
        live_interest_expressed,
        profiles!listener_genre_affinity_user_id_fkey (city, country)
      `,
      )
      .eq('creator_id', user.id)
      .or('tips_sent.gt.0,repeat_listens.gt.0,live_interest_expressed.eq.true');

    const cityMap = new Map<string, number>();
    for (const row of affinityRows || []) {
      const p = row.profiles as { city?: string; country?: string } | { city?: string; country?: string }[] | null;
      const prof = Array.isArray(p) ? p[0] : p;
      const city = prof?.city?.trim();
      const country = prof?.country?.trim();
      const label = city ? (country ? `${city}, ${country}` : city) : country || 'Unknown';
      cityMap.set(label, (cityMap.get(label) || 0) + 1);
    }

    const audience_locations = [...cityMap.entries()]
      .map(([city, engaged_listeners]) => ({ city, engaged_listeners }))
      .sort((a, b) => b.engaged_listeners - a.engaged_listeners)
      .slice(0, 10);

    const { data: creatorTracks } = await service.from('audio_tracks').select('id').eq('creator_id', user.id);
    const trackIds = (creatorTracks || []).map((t: { id: string }) => t.id);

    let live_interest_summary = {
      total_yes: 0,
      top_cities: [] as { city: string; yes_count: number }[],
      top_availability: null as string | null,
    };

    if (trackIds.length > 0) {
      const { data: lirRows } = await service
        .from('live_interest_responses')
        .select(
          `
          responded_yes,
          availability_preference,
          profiles!live_interest_responses_user_id_fkey (city)
        `,
        )
        .in('track_id', trackIds);

      const cityYes = new Map<string, number>();
      const prefCounts = new Map<string, number>();
      let totalYes = 0;

      for (const row of lirRows || []) {
        if (!row.responded_yes) continue;
        totalYes += 1;
        const p = row.profiles as { city?: string } | { city?: string }[] | null;
        const prof = Array.isArray(p) ? p[0] : p;
        const city = prof?.city?.trim() || 'Unknown';
        cityYes.set(city, (cityYes.get(city) || 0) + 1);
        if (row.availability_preference) {
          prefCounts.set(
            row.availability_preference,
            (prefCounts.get(row.availability_preference) || 0) + 1,
          );
        }
      }

      live_interest_summary = {
        total_yes: totalYes,
        top_cities: [...cityYes.entries()]
          .map(([city, yes_count]) => ({ city, yes_count }))
          .sort((a, b) => b.yes_count - a.yes_count)
          .slice(0, 3),
        top_availability:
          prefCounts.size > 0
            ? formatAvailabilityPreference(
                [...prefCounts.entries()].sort((a, b) => b[1] - a[1])[0][0],
              )
            : null,
      };
    }

    let unlimited: Record<string, unknown> | undefined;

    if (tier === 'unlimited') {
      const primaryGenre =
        (profile?.genre as string) ||
        ((profile?.genres as string[] | undefined)?.[0] ?? null);

      let genre_avg = 0;
      if (primaryGenre) {
        const { data: genreTracks } = await service
          .from('audio_tracks')
          .select('id')
          .eq('genre', primaryGenre);
        const ids = (genreTracks || []).map((t: { id: string }) => t.id);
        if (ids.length) {
          const { data: scores } = await service
            .from('track_quality_signals')
            .select('quality_score')
            .in('track_id', ids);
          const vals = (scores || []).map((s: { quality_score: number }) => Number(s.quality_score || 0));
          genre_avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        }
      }

      const { data: myAffinity } = await service
        .from('listener_genre_affinity')
        .select('user_id')
        .eq('creator_id', user.id)
        .gt('affinity_score', 0);

      const fanIds = [...new Set((myAffinity || []).map((r: { user_id: string }) => r.user_id))];
      const similar_creators: { username: string; shared_fans: number }[] = [];

      if (fanIds.length > 0) {
        const { data: overlap } = await service
          .from('listener_genre_affinity')
          .select('creator_id, profiles!listener_genre_affinity_creator_id_fkey(username)')
          .in('user_id', fanIds)
          .neq('creator_id', user.id)
          .gt('affinity_score', 0);

        const countMap = new Map<string, { username: string; count: number }>();
        for (const row of overlap || []) {
          const cid = row.creator_id as string;
          const p = row.profiles as { username?: string } | { username?: string }[] | null;
          const prof = Array.isArray(p) ? p[0] : p;
          const existing = countMap.get(cid) || { username: prof?.username || 'creator', count: 0 };
          existing.count += 1;
          countMap.set(cid, existing);
        }
        similar_creators.push(
          ...[...countMap.values()]
            .map((v) => ({ username: v.username, shared_fans: v.count }))
            .sort((a, b) => b.shared_fans - a.shared_fans)
            .slice(0, 5),
        );
      }

      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const prevMonth = new Date(monthStart);
      prevMonth.setUTCMonth(prevMonth.getUTCMonth() - 1);

      const growth_signals = {
        current_month: monthStart.toISOString().slice(0, 10),
        tracks: tracks.map((t) => ({
          track_id: t.id,
          title: t.title,
          quality_score: t.quality_score,
          repeat_listen_rate_percent: t.repeat_listen_rate_percent,
          tip_rate_percent: t.tip_rate_percent,
        })),
        genre_average_quality_score: Math.round(genre_avg * 10) / 10,
      };

      unlimited = {
        similar_creators,
        genre_average_quality_score: Math.round(genre_avg * 10) / 10,
        growth_signals,
        optimal_timing: live_interest_summary,
      };
    }

    return NextResponse.json(
      {
        success: true,
        tier,
        locked: false,
        track_performance: tracks,
        audience_locations,
        live_interest_summary,
        unlimited,
        updated_at: new Date().toISOString(),
      },
      { headers: { ...corsHeaders, 'Cache-Control': 'private, max-age=86400' } },
    );
  } catch (e) {
    console.error('[audience-intelligence]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
