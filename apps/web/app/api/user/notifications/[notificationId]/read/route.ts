/**
 * API Endpoint: Mark Notification as Read
 * PUT /api/user/notifications/:notificationId/read
 * 
 * Mark a single notification as read
 * 
 * Authentication: Required (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { notificationId: string } }
) {
  try {
    console.log('✅ Mark Notification as Read: Starting...');
    
    // Get authenticated user
    const { supabase, user } = await getSupabaseRouteClient(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { notificationId } = params;
    
    // Mark as read
    const { data, error } = await supabase
      .from('notification_logs')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .select('read_at')
      .single();
    
    if (error) {
      console.error('Error marking notification as read:', error);
      return NextResponse.json(
        { error: 'Failed to mark notification as read' },
        { status: 500 }
      );
    }
    
    console.log(`✅ Notification ${notificationId} marked as read`);
    
    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
      readAt: data.read_at,
    });
  } catch (error: any) {
    console.error('❌ Error marking notification as read:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

