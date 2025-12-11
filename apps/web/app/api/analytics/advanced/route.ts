import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * GET /api/analytics/advanced
 * Get advanced analytics for Premium/Unlimited users
 * Query params:
 * - period: '7d' | '30d' | '90d' | '1y' | 'all'
 * - trackId: (optional) specific track ID
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

    // Check user's subscription tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    // Only Premium and Unlimited users can access advanced analytics
    if (!profile || !['premium', 'unlimited'].includes(profile.subscription_tier)) {
      return NextResponse.json(
        {
          error: 'Advanced analytics is only available for Premium and Unlimited users',
          upgrade_required: true,
          current_tier: profile?.subscription_tier || 'free'
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';
    const trackId = searchParams.get('trackId');

    // Calculate date range
    const { startDate, endDate } = getDateRange(period);

    // Get overview stats
    const overviewStats = await getOverviewStats(supabase, user.id, startDate, endDate, trackId);

    // Get geographic data (top countries)
    const { data: topCountries } = await supabase.rpc('get_creator_top_countries', {
      p_creator_id: user.id,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
      p_limit: 10,
    });

    // Get peak listening hours
    const { data: peakHours } = await supabase.rpc('get_creator_peak_hours', {
      p_creator_id: user.id,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    // Get referrer stats
    const { data: referrerStats } = await supabase.rpc('get_creator_referrer_stats', {
      p_creator_id: user.id,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    // Get demographics
    const { data: demographics } = await supabase.rpc('get_creator_demographics', {
      p_creator_id: user.id,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    // Get top tracks by completion rate
    const topTracksByCompletion = await getTopTracksByCompletion(supabase, user.id, startDate, endDate);

    // Get engagement metrics
    const engagementMetrics = await getEngagementMetrics(supabase, user.id, startDate, endDate);

    // Get listening behavior trends (daily breakdown)
    const listeningTrends = await getListeningTrends(supabase, user.id, startDate, endDate);

    return NextResponse.json(
      {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        overview: overviewStats,
        geographic: {
          topCountries: topCountries || [],
        },
        listeningBehavior: {
          peakHours: peakHours || [],
          trends: listeningTrends,
        },
        referrers: referrerStats || [],
        demographics: demographics || [],
        topTracks: topTracksByCompletion,
        engagement: engagementMetrics,
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error fetching advanced analytics:', error);
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
 * Get date range based on period
 */
function getDateRange(period: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    case 'all':
      startDate.setFullYear(2020, 0, 1); // Start from 2020
      break;
    default:
      startDate.setDate(endDate.getDate() - 30); // Default to 30 days
  }

  return { startDate, endDate };
}

/**
 * Get overview statistics
 */
async function getOverviewStats(supabase: any, userId: string, startDate: Date, endDate: Date, trackId?: string | null) {
  const query = supabase
    .from('stream_events')
    .select('*')
    .eq('creator_id', userId)
    .gte('played_at', startDate.toISOString())
    .lte('played_at', endDate.toISOString());

  if (trackId) {
    query.eq('track_id', trackId);
  }

  const { data: events, error } = await query;

  if (error || !events) {
    return {
      totalPlays: 0,
      uniqueListeners: 0,
      totalListeningTime: 0,
      avgCompletionRate: 0,
      totalCountries: 0,
    };
  }

  const uniqueListeners = new Set(events.filter(e => e.listener_id).map(e => e.listener_id)).size;
  const totalListeningTime = events.reduce((sum, e) => sum + (e.duration_listened || 0), 0);
  const avgCompletionRate = events.length > 0
    ? events.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / events.length
    : 0;
  const uniqueCountries = new Set(events.filter(e => e.country_code).map(e => e.country_code)).size;

  return {
    totalPlays: events.length,
    uniqueListeners,
    totalListeningTime: Math.floor(totalListeningTime), // in seconds
    avgCompletionRate: Math.round(avgCompletionRate * 10) / 10, // round to 1 decimal
    totalCountries: uniqueCountries,
  };
}

/**
 * Get top tracks by completion rate
 */
async function getTopTracksByCompletion(supabase: any, userId: string, startDate: Date, endDate: Date) {
  const { data, error } = await supabase
    .from('stream_events')
    .select(`
      track_id,
      audio_tracks!inner(id, title, cover_art_url)
    `)
    .eq('creator_id', userId)
    .gte('played_at', startDate.toISOString())
    .lte('played_at', endDate.toISOString());

  if (error || !data) {
    return [];
  }

  // Group by track and calculate stats
  const trackStats = data.reduce((acc: any, event: any) => {
    const trackId = event.track_id;
    if (!acc[trackId]) {
      acc[trackId] = {
        trackId,
        title: event.audio_tracks?.title || 'Unknown',
        coverArt: event.audio_tracks?.cover_art_url,
        plays: 0,
        totalCompletion: 0,
      };
    }
    acc[trackId].plays++;
    acc[trackId].totalCompletion += event.completion_percentage || 0;
    return acc;
  }, {});

  // Calculate average and sort
  const topTracks = Object.values(trackStats)
    .map((track: any) => ({
      ...track,
      avgCompletion: Math.round((track.totalCompletion / track.plays) * 10) / 10,
    }))
    .sort((a: any, b: any) => b.avgCompletion - a.avgCompletion)
    .slice(0, 10);

  return topTracks;
}

/**
 * Get engagement metrics
 */
async function getEngagementMetrics(supabase: any, userId: string, startDate: Date, endDate: Date) {
  const { data: events, error } = await supabase
    .from('stream_events')
    .select('liked_track, shared_track, followed_creator, tipped_creator, purchased_ticket')
    .eq('creator_id', userId)
    .gte('played_at', startDate.toISOString())
    .lte('played_at', endDate.toISOString());

  if (error || !events) {
    return {
      totalLikes: 0,
      totalShares: 0,
      totalFollows: 0,
      totalTips: 0,
      totalTicketPurchases: 0,
      engagementRate: 0,
    };
  }

  const totalLikes = events.filter(e => e.liked_track).length;
  const totalShares = events.filter(e => e.shared_track).length;
  const totalFollows = events.filter(e => e.followed_creator).length;
  const totalTips = events.filter(e => e.tipped_creator).length;
  const totalTicketPurchases = events.filter(e => e.purchased_ticket).length;

  const totalEngagements = totalLikes + totalShares + totalFollows + totalTips + totalTicketPurchases;
  const engagementRate = events.length > 0 ? (totalEngagements / events.length) * 100 : 0;

  return {
    totalLikes,
    totalShares,
    totalFollows,
    totalTips,
    totalTicketPurchases,
    engagementRate: Math.round(engagementRate * 10) / 10,
  };
}

/**
 * Get listening trends (daily breakdown)
 */
async function getListeningTrends(supabase: any, userId: string, startDate: Date, endDate: Date) {
  const { data, error } = await supabase
    .from('stream_events')
    .select('played_at, completion_percentage')
    .eq('creator_id', userId)
    .gte('played_at', startDate.toISOString())
    .lte('played_at', endDate.toISOString())
    .order('played_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  // Group by date
  const dailyStats = data.reduce((acc: any, event: any) => {
    const date = new Date(event.played_at).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = {
        date,
        plays: 0,
        totalCompletion: 0,
      };
    }
    acc[date].plays++;
    acc[date].totalCompletion += event.completion_percentage || 0;
    return acc;
  }, {});

  // Calculate averages
  return Object.values(dailyStats).map((day: any) => ({
    date: day.date,
    plays: day.plays,
    avgCompletion: Math.round((day.totalCompletion / day.plays) * 10) / 10,
  }));
}
