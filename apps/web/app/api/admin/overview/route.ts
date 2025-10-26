import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Admin Overview API called');
    
    const supabase = createServiceClient();

    // Get pending review queue items
    const { data: pendingItems, error: pendingError } = await supabase
      .from('admin_review_queue')
      .select('*')
      .eq('status', 'pending');

    if (pendingError) {
      console.error('❌ Error fetching pending items:', pendingError);
    }

    // Get urgent items
    const { data: urgentItems, error: urgentError } = await supabase
      .from('admin_review_queue')
      .select('*')
      .eq('priority', 'urgent')
      .in('status', ['pending', 'assigned']);

    if (urgentError) {
      console.error('❌ Error fetching urgent items:', urgentError);
    }

    // Get DMCA requests
    const { data: dmcaRequests, error: dmcaError } = await supabase
      .from('admin_review_queue')
      .select('*')
      .eq('queue_type', 'dmca')
      .in('status', ['pending', 'assigned', 'in_review']);

    if (dmcaError) {
      console.error('❌ Error fetching DMCA requests:', dmcaError);
    }

    // Get content reports
    const { data: contentReports, error: reportsError } = await supabase
      .from('admin_review_queue')
      .select('*')
      .eq('queue_type', 'content_report')
      .in('status', ['pending', 'assigned', 'in_review']);

    if (reportsError) {
      console.error('❌ Error fetching content reports:', reportsError);
    }

    // Get total users
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      console.error('❌ Error fetching total users:', usersError);
    }

    // Get active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: activeUsers, error: activeError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_login_at', thirtyDaysAgo.toISOString());

    if (activeError) {
      console.error('❌ Error fetching active users:', activeError);
    }

    // Get new users this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const { count: newUsers, error: newUsersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneWeekAgo.toISOString());

    if (newUsersError) {
      console.error('❌ Error fetching new users:', newUsersError);
    }

    // Get total tracks
    const { count: totalTracks, error: tracksError } = await supabase
      .from('audio_tracks')
      .select('*', { count: 'exact', head: true });

    if (tracksError) {
      console.error('❌ Error fetching total tracks:', tracksError);
    }

    // Get total events
    const { count: totalEvents, error: eventsError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });

    if (eventsError) {
      console.error('❌ Error fetching total events:', eventsError);
    }

    // Get total messages
    const { count: totalMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    if (messagesError) {
      console.error('❌ Error fetching total messages:', messagesError);
    }

    // Get revenue data (from ticket purchases)
    let totalRevenue = 0;
    try {
      const { data: revenueData, error: revenueError } = await supabase
        .from('ticket_purchases')
        .select('amount_paid')
        .eq('status', 'completed') as { data: Array<{ amount_paid: number }> | null; error: any };

      if (revenueError) {
        console.error('❌ Error fetching revenue data:', revenueError);
      } else {
        totalRevenue = revenueData?.reduce((sum, purchase) => sum + (purchase.amount_paid || 0), 0) || 0;
      }
    } catch (error) {
      console.error('❌ Error fetching revenue data:', error);
    }

    const overviewData = {
      statistics: {
        // Review Queue Stats
        total_pending: pendingItems?.length || 0,
        urgent_items: urgentItems?.length || 0,
        dmca_requests: dmcaRequests?.length || 0,
        content_reports: contentReports?.length || 0,
        
        // User Stats
        total_users: totalUsers || 0,
        active_users: activeUsers || 0,
        new_users_this_week: newUsers || 0,
        
        // Platform Stats
        total_tracks: totalTracks || 0,
        total_events: totalEvents || 0,
        total_messages: totalMessages || 0,
        total_revenue: totalRevenue
      },
      
      // Recent activity
      recent_activity: ([
        ...(pendingItems?.slice(0, 5) || []),
        ...(urgentItems?.slice(0, 3) || [])
      ] as Array<{ created_at: string; [key: string]: any }>).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8)
    };

    console.log('✅ Overview data fetched successfully');

    return NextResponse.json({
      success: true,
      data: overviewData
    });

  } catch (error: any) {
    console.error('❌ Error fetching overview data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
