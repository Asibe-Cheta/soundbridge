/**
 * API Endpoint: Update Creator Notification Settings
 * PUT /api/user/follow/:creatorId/notifications
 * 
 * Update notification preferences for a specific creator
 * 
 * Authentication: Required (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { creatorId: string } }
) {
  try {
    console.log('🔔 Update Creator Notification Settings: Starting...');
    
    // Get authenticated user
    const { supabase, user } = await getSupabaseRouteClient(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { creatorId } = params;
    
    // Parse request body
    const updates = await request.json();
    
    // Build update object
    const updateData: any = {};
    
    if (updates.notifyOnMusicUpload !== undefined) {
      updateData.notify_on_music_upload = updates.notifyOnMusicUpload;
    }
    if (updates.notifyOnEventPost !== undefined) {
      updateData.notify_on_event_post = updates.notifyOnEventPost;
    }
    if (updates.notifyOnPodcastUpload !== undefined) {
      updateData.notify_on_podcast_upload = updates.notifyOnPodcastUpload;
    }
    if (updates.notifyOnCollaborationAvailability !== undefined) {
      updateData.notify_on_collaboration_availability = updates.notifyOnCollaborationAvailability;
    }
    
    // Update subscription
    const { data: subscription, error } = await supabase
      .from('creator_subscriptions')
      .update(updateData)
      .eq('user_id', user.id)
      .eq('creator_id', creatorId)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error updating creator notification settings:', error);
      return NextResponse.json(
        { error: 'Failed to update notification settings' },
        { status: 500 }
      );
    }
    
    console.log(`✅ Updated notification settings for creator ${creatorId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Notification settings updated',
      subscription: {
        creatorId: subscription.creator_id,
        notifyOnMusicUpload: subscription.notify_on_music_upload,
        notifyOnEventPost: subscription.notify_on_event_post,
        notifyOnPodcastUpload: subscription.notify_on_podcast_upload,
        notifyOnCollaborationAvailability: subscription.notify_on_collaboration_availability,
        followedAt: subscription.followed_at,
      },
    });
  } catch (error: any) {
    console.error('❌ Error updating creator notification settings:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

