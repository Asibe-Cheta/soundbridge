import { NextRequest, NextResponse } from 'next/server';
import { JWT } from 'google-auth-library';
import { createServiceClient } from '@/src/lib/supabase';
import { requireAdmin } from '@/src/lib/admin-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const parsePeriod = (period: string | null) => {
  switch (period) {
    case '7d':
      return { startDate: '7daysAgo', endDate: 'today' };
    case '30d':
      return { startDate: '30daysAgo', endDate: 'today' };
    case '90d':
      return { startDate: '90daysAgo', endDate: 'today' };
    case '1y':
      return { startDate: '365daysAgo', endDate: 'today' };
    default:
      return { startDate: '30daysAgo', endDate: 'today' };
  }
};

const toNumber = (value?: string) => {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fetchGaData = async (startDate: string, endDate: string) => {
  const gaPropertyId = process.env.GA_PROPERTY_ID;
  const gaServiceAccountEmail = process.env.GA_SERVICE_ACCOUNT_EMAIL;
  const gaPrivateKeyRaw = process.env.GA_SERVICE_ACCOUNT_PRIVATE_KEY;
  const gaPrivateKey = gaPrivateKeyRaw ? gaPrivateKeyRaw.replace(/\\n/g, '\n') : null;

  if (!gaPropertyId || !gaServiceAccountEmail || !gaPrivateKey) {
    return { enabled: false, reason: 'GA configuration missing' };
  }

  const authClient = new JWT({
    email: gaServiceAccountEmail,
    key: gaPrivateKey,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });
  const accessToken = await authClient.getAccessToken();
  if (!accessToken?.token) {
    throw new Error('Failed to obtain GA access token');
  }

  const baseUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${gaPropertyId}:runReport`;
  const headers = {
    Authorization: `Bearer ${accessToken.token}`,
    'Content-Type': 'application/json',
  };

  const summaryResponse = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'engagementRate' },
      ],
    }),
  });

  const summaryData = await summaryResponse.json();
  if (!summaryResponse.ok) {
    throw new Error(summaryData?.error?.message || 'GA summary request failed');
  }

  const metricValues = summaryData?.rows?.[0]?.metricValues || [];

  const topPagesResponse = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    }),
  });

  const topPagesData = await topPagesResponse.json();
  if (!topPagesResponse.ok) {
    throw new Error(topPagesData?.error?.message || 'GA top pages request failed');
  }

  const topPages = (topPagesData?.rows || []).map((row: any) => ({
    path: row?.dimensionValues?.[0]?.value || '',
    views: toNumber(row?.metricValues?.[0]?.value),
  }));

  const trafficSourcesResponse = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionSourceMedium' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    }),
  });

  const trafficSourcesData = await trafficSourcesResponse.json();
  if (!trafficSourcesResponse.ok) {
    throw new Error(trafficSourcesData?.error?.message || 'GA traffic sources request failed');
  }

  const topSources = (trafficSourcesData?.rows || []).map((row: any) => ({
    source: row?.dimensionValues?.[0]?.value || 'unknown',
    sessions: toNumber(row?.metricValues?.[0]?.value),
  }));

  const geoResponse = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 10,
    }),
  });

  const geoData = await geoResponse.json();
  if (!geoResponse.ok) {
    throw new Error(geoData?.error?.message || 'GA geo request failed');
  }

  const topCountries = (geoData?.rows || []).map((row: any) => ({
    country: row?.dimensionValues?.[0]?.value || 'Unknown',
    users: toNumber(row?.metricValues?.[0]?.value),
  }));

  const deviceResponse = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 5,
    }),
  });

  const deviceData = await deviceResponse.json();
  if (!deviceResponse.ok) {
    throw new Error(deviceData?.error?.message || 'GA device request failed');
  }

  const devices = (deviceData?.rows || []).map((row: any) => ({
    device: row?.dimensionValues?.[0]?.value || 'unknown',
    users: toNumber(row?.metricValues?.[0]?.value),
  }));

  const seriesResponse = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
      orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
      limit: 1000,
    }),
  });

  const seriesData = await seriesResponse.json();
  if (!seriesResponse.ok) {
    throw new Error(seriesData?.error?.message || 'GA series request failed');
  }

  const series = (seriesData?.rows || []).map((row: any) => {
    const rawDate = row?.dimensionValues?.[0]?.value || '';
    const formattedDate =
      rawDate.length === 8
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
        : rawDate;
    return {
      date: formattedDate,
      activeUsers: toNumber(row?.metricValues?.[0]?.value),
      sessions: toNumber(row?.metricValues?.[1]?.value),
      pageViews: toNumber(row?.metricValues?.[2]?.value),
    };
  });

  return {
    enabled: true,
    activeUsers: toNumber(metricValues[0]?.value),
    sessions: toNumber(metricValues[1]?.value),
    pageViews: toNumber(metricValues[2]?.value),
    avgSessionDuration: toNumber(metricValues[3]?.value),
    engagementRate: toNumber(metricValues[4]?.value),
    topPages,
    topSources,
    topCountries,
    devices,
    series,
    period: { startDate, endDate },
  };
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status, headers: corsHeaders });
    }

    console.log('📈 Admin Analytics API called');

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y

    const supabase = createServiceClient();

    // Calculate date range based on period
    const now = new Date();
    let startDateObj: Date;
    
    switch (period) {
      case '7d':
        startDateObj = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDateObj = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDateObj = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDateObj = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDateObj = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get user growth data
    const { data: userGrowth, error: userGrowthError } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', startDateObj.toISOString())
      .order('created_at', { ascending: true });

    if (userGrowthError) {
      console.error('❌ Error fetching user growth:', userGrowthError);
    }

    // Get track uploads data
    const { data: trackUploads, error: trackUploadsError } = await supabase
      .from('audio_tracks')
      .select('created_at')
      .gte('created_at', startDateObj.toISOString())
      .order('created_at', { ascending: true });

    if (trackUploadsError) {
      console.error('❌ Error fetching track uploads:', trackUploadsError);
    }

    // Get event creation data
    const { data: eventCreations, error: eventCreationsError } = await supabase
      .from('events')
      .select('created_at')
      .gte('created_at', startDateObj.toISOString())
      .order('created_at', { ascending: true });

    if (eventCreationsError) {
      console.error('❌ Error fetching event creations:', eventCreationsError);
    }

    // Get message activity data
    const { data: messageActivity, error: messageActivityError } = await supabase
      .from('messages')
      .select('created_at')
      .gte('created_at', startDateObj.toISOString())
      .order('created_at', { ascending: true });

    if (messageActivityError) {
      console.error('❌ Error fetching message activity:', messageActivityError);
    }

    // Get revenue data from ticket purchases
    const { data: revenueData, error: revenueError } = await supabase
      .from('ticket_purchases')
      .select('created_at, amount_paid')
      .gte('created_at', startDateObj.toISOString())
      .eq('status', 'completed')
      .order('created_at', { ascending: true }) as { data: Array<{ created_at: string; amount_paid: number }> | null; error: any };

    if (revenueError) {
      console.error('❌ Error fetching revenue data:', revenueError);
    }

    // Get subscription revenue
    const { data: subscriptionRevenue, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('created_at, amount_paid')
      .gte('created_at', startDateObj.toISOString())
      .eq('status', 'active')
      .order('created_at', { ascending: true }) as { data: Array<{ created_at: string; amount_paid: number }> | null; error: any };

    if (subscriptionError) {
      console.error('❌ Error fetching subscription revenue:', subscriptionError);
    }

    // Get top creators by followers
    const { data: topCreators, error: topCreatorsError } = await supabase
      .from('profiles')
      .select('id, username, display_name, followers_count, avatar_url')
      .not('followers_count', 'is', null)
      .order('followers_count', { ascending: false })
      .limit(10);

    if (topCreatorsError) {
      console.error('❌ Error fetching top creators:', topCreatorsError);
    }

    // Get most popular tracks
    const { data: popularTracks, error: popularTracksError } = await supabase
      .from('audio_tracks')
      .select(`
        id,
        title,
        play_count,
        likes_count,
        creator:profiles!audio_tracks_creator_id_fkey(username, display_name)
      `)
      .is('deleted_at', null)
      .order('play_count', { ascending: false })
      .limit(10);

    if (popularTracksError) {
      console.error('❌ Error fetching popular tracks:', popularTracksError);
    }

    // Get most popular events
    const { data: popularEvents, error: popularEventsError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        current_attendees,
        max_attendees,
        organizer:profiles!events_organizer_id_fkey(username, display_name)
      `)
      .is('deleted_at', null)
      .order('current_attendees', { ascending: false })
      .limit(10);

    if (popularEventsError) {
      console.error('❌ Error fetching popular events:', popularEventsError);
    }

    // Process data into time series
    const processTimeSeries = (data: any[], dateField: string = 'created_at') => {
      const dailyData: { [key: string]: number } = {};
      
      data?.forEach(item => {
        const date = new Date(item[dateField]).toISOString().split('T')[0];
        dailyData[date] = (dailyData[date] || 0) + 1;
      });

      return Object.entries(dailyData)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    };

    const processRevenueTimeSeries = (data: any[]) => {
      const dailyData: { [key: string]: number } = {};
      
      data?.forEach(item => {
        const date = new Date(item.created_at).toISOString().split('T')[0];
        dailyData[date] = (dailyData[date] || 0) + (item.amount_paid || 0);
      });

      return Object.entries(dailyData)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));
    };

    const { startDate, endDate } = parsePeriod(period);
    let gaData: any = { enabled: false, reason: 'GA configuration missing' };

    try {
      gaData = await fetchGaData(startDate, endDate);
    } catch (error: any) {
      gaData = { enabled: false, reason: error?.message || 'GA fetch failed' };
    }

    const analyticsData = {
      period,
      timeSeries: {
        userGrowth: processTimeSeries(userGrowth || []),
        trackUploads: processTimeSeries(trackUploads || []),
        eventCreations: processTimeSeries(eventCreations || []),
        messageActivity: processTimeSeries(messageActivity || []),
        revenue: processRevenueTimeSeries(revenueData || []),
        subscriptionRevenue: processRevenueTimeSeries(subscriptionRevenue || [])
      },
      topContent: {
        creators: topCreators || [],
        tracks: popularTracks || [],
        events: popularEvents || []
      },
      summary: {
        totalUsers: userGrowth?.length || 0,
        totalTracks: trackUploads?.length || 0,
        totalEvents: eventCreations?.length || 0,
        totalMessages: messageActivity?.length || 0,
        totalRevenue: revenueData?.reduce((sum, item) => sum + (item.amount_paid || 0), 0) || 0,
        totalSubscriptionRevenue: subscriptionRevenue?.reduce((sum, item) => sum + (item.amount_paid || 0), 0) || 0
      },
      ga: gaData
    };

    console.log('✅ Analytics data fetched successfully');

    return NextResponse.json(
      {
        success: true,
        data: analyticsData,
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Error fetching analytics data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
