/**
 * API Endpoints: Follow/Unfollow Creator
 * POST /api/user/follow/:creatorId - Follow creator
 * PUT /api/user/follow/:creatorId/notifications - Update notification settings
 * DELETE /api/user/follow/:creatorId - Unfollow creator
 * 
 * Authentication: Required (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { creatorId: string } }
) {
  try {
    console.log('👤 Follow Creator: Starting...');
    
    // Get authenticated user
    const { supabase, user } = await getSupabaseRouteClient(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { creatorId } = params;
    
    // Validate creator ID
    if (user.id === creatorId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }
    
    // Parse request body for notification preferences
    const body = await request.json();
    const {
      notifyOnMusicUpload = false,
      notifyOnEventPost = false,
      notifyOnPodcastUpload = false,
      notifyOnCollaborationAvailability = false,
    } = body;
    
    // Create subscription
    const { data: subscription, error } = await supabase
      .from('creator_subscriptions')
      .insert({
        user_id: user.id,
        creator_id: creatorId,
        notify_on_music_upload: notifyOnMusicUpload,
        notify_on_event_post: notifyOnEventPost,
        notify_on_podcast_upload: notifyOnPodcastUpload,
        notify_on_collaboration_availability: notifyOnCollaborationAvailability,
      })
      .select('*')
      .single();
    
    if (error) {
      if (error.code === '23505') {
        // Already following
        return NextResponse.json(
          { error: 'Already following this creator' },
          { status: 409 }
        );
      }
      console.error('Error creating subscription:', error);
      return NextResponse.json(
        { error: 'Failed to follow creator' },
        { status: 500 }
      );
    }
    
    console.log(`✅ User ${user.id} now following creator ${creatorId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Now following creator',
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
    console.error('❌ Error following creator:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { creatorId: string } }
) {
  try {
    console.log('👤 Unfollow Creator: Starting...');
    
    // Get authenticated user
    const { supabase, user } = await getSupabaseRouteClient(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { creatorId } = params;
    
    // Delete subscription
    const { error } = await supabase
      .from('creator_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('creator_id', creatorId);
    
    if (error) {
      console.error('Error deleting subscription:', error);
      return NextResponse.json(
        { error: 'Failed to unfollow creator' },
        { status: 500 }
      );
    }
    
    console.log(`✅ User ${user.id} unfollowed creator ${creatorId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Unfollowed creator',
    });
  } catch (error: any) {
    console.error('❌ Error unfollowing creator:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

