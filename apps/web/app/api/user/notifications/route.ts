/**
 * API Endpoint: Notification History
 * GET /api/user/notifications
 * 
 * Get notification history with pagination
 * 
 * Authentication: Required (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    console.log('📜 Get Notification History: Starting...');
    
    // Get authenticated user
    const { supabase, user } = await getSupabaseRouteClient(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    
    // Build query
    let query = supabase
      .from('notification_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false });
    
    if (unreadOnly) {
      query = query.is('read_at', null);
    }
    
    query = query.range(offset, offset + limit - 1);
    
    const { data: notifications, error, count } = await query;
    
    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }
    
    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notification_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);
    
    console.log(`✅ Fetched ${notifications?.length || 0} notifications for user ${user.id}`);
    
    return NextResponse.json({
      notifications: notifications?.map((n) => ({
        id: n.id,
        type: n.notification_type,
        title: n.title,
        body: n.body,
        data: n.data,
        sentAt: n.sent_at,
        readAt: n.read_at,
        clickedAt: n.clicked_at,
      })) || [],
      total: count || 0,
      unreadCount: unreadCount || 0,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error: any) {
    console.error('❌ Error fetching notification history:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

