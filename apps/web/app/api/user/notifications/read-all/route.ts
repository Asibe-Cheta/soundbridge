/**
 * API Endpoint: Mark All Notifications as Read
 * PUT /api/user/notifications/read-all
 * 
 * Mark all notifications as read for the authenticated user
 * 
 * Authentication: Required (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function PUT(request: NextRequest) {
  try {
    console.log('✅ Mark All Notifications as Read: Starting...');
    
    // Get authenticated user
    const { supabase, user } = await getSupabaseRouteClient(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get count of unread notifications
    const { count: unreadCount } = await supabase
      .from('notification_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);
    
    // Mark all as read
    const { error } = await supabase
      .from('notification_logs')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);
    
    if (error) {
      console.error('Error marking all notifications as read:', error);
      return NextResponse.json(
        { error: 'Failed to mark notifications as read' },
        { status: 500 }
      );
    }
    
    console.log(`✅ Marked ${unreadCount || 0} notifications as read for user ${user.id}`);
    
    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
      count: unreadCount || 0,
    });
  } catch (error: any) {
    console.error('❌ Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

