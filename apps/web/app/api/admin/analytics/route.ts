import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('📈 Admin Analytics API called');
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y
    
    const supabase = createServiceClient();

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get user growth data
    const { data: userGrowth, error: userGrowthError } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (userGrowthError) {
      console.error('❌ Error fetching user growth:', userGrowthError);
    }

    // Get track uploads data
    const { data: trackUploads, error: trackUploadsError } = await supabase
      .from('audio_tracks')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (trackUploadsError) {
      console.error('❌ Error fetching track uploads:', trackUploadsError);
    }

    // Get event creation data
    const { data: eventCreations, error: eventCreationsError } = await supabase
      .from('events')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (eventCreationsError) {
      console.error('❌ Error fetching event creations:', eventCreationsError);
    }

    // Get message activity data
    const { data: messageActivity, error: messageActivityError } = await supabase
      .from('messages')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (messageActivityError) {
      console.error('❌ Error fetching message activity:', messageActivityError);
    }

    // Get revenue data from ticket purchases
    const { data: revenueData, error: revenueError } = await supabase
      .from('ticket_purchases')
      .select('created_at, amount_paid')
      .gte('created_at', startDate.toISOString())
      .eq('status', 'completed')
      .order('created_at', { ascending: true });

    if (revenueError) {
      console.error('❌ Error fetching revenue data:', revenueError);
    }

    // Get subscription revenue
    const { data: subscriptionRevenue, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('created_at, amount_paid')
      .gte('created_at', startDate.toISOString())
      .eq('status', 'active')
      .order('created_at', { ascending: true });

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
      }
    };

    console.log('✅ Analytics data fetched successfully');

    return NextResponse.json({
      success: true,
      data: analyticsData
    });

  } catch (error: any) {
    console.error('❌ Error fetching analytics data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
