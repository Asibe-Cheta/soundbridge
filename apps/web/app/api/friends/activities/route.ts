import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔥 Friends Activities API called');
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('❌ Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // First check if follows table exists and has data
    const { data: followsTest, error: followsTestError } = await supabase
      .from('follows')
      .select('count')
      .limit(1);

    if (followsTestError) {
      console.error('❌ Follows table error:', followsTestError);
      // Return empty activities instead of error - user might not have follows table set up
      return NextResponse.json({
        activities: [],
        message: 'Follows feature not available'
      });
    }

    // Get friends (mutual follows - people who follow each other)
    const { data: friends, error: friendsError } = await supabase
      .from('follows')
      .select(`
        following_id,
        creator:following_id (
          id,
          display_name,
          profile_image_url,
          created_at
        )
      `)
      .eq('follower_id', user.id);

    if (friendsError) {
      console.error('❌ Error fetching friends:', friendsError);
      // Return empty activities instead of error
      return NextResponse.json({
        activities: [],
        message: 'Could not fetch friends data'
      });
    }

    console.log('👥 Friends found:', friends?.length || 0);

    // Filter to get mutual follows only
    const friendIds = friends?.map(f => f.following_id) || [];
    
    if (friendIds.length === 0) {
      console.log('❌ No friends found, returning empty activities');
      return NextResponse.json({
        activities: []
      });
    }

    console.log('🔍 Friend IDs:', friendIds);

    // Get mutual follows (people who also follow the current user)
    const { data: mutualFollows, error: mutualError } = await supabase
      .from('follows')
      .select(`
        follower_id,
        creator:follower_id (
          id,
          display_name,
          profile_image_url,
          created_at
        )
      `)
      .in('follower_id', friendIds)
      .eq('following_id', user.id);

    if (mutualError) {
      console.error('Error fetching mutual follows:', mutualError);
      return NextResponse.json(
        { error: 'Failed to fetch mutual follows' },
        { status: 500 }
      );
    }

    // Get recent audio activities from friends
    const { data: recentAudio, error: audioError } = await supabase
      .from('audio_tracks')
      .select(`
        id,
        title,
        artist,
        cover_art_url,
        created_at,
        creator_id,
        creator:creator_id (
          display_name,
          profile_image_url
        )
      `)
      .in('creator_id', friendIds)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (audioError) {
      console.error('Error fetching recent audio:', audioError);
      return NextResponse.json(
        { error: 'Failed to fetch recent audio' },
        { status: 500 }
      );
    }

    // Get recent podcast activities from friends
    const { data: recentPodcasts, error: podcastError } = await supabase
      .from('podcasts')
      .select(`
        id,
        title,
        description,
        cover_image_url,
        created_at,
        creator_id,
        creator:creator_id (
          display_name,
          profile_image_url
        )
      `)
      .in('creator_id', friendIds)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (podcastError) {
      console.error('Error fetching recent podcasts:', podcastError);
      return NextResponse.json(
        { error: 'Failed to fetch recent podcasts' },
        { status: 500 }
      );
    }

    // Combine and format activities
    const activities = [];
    
    // Add audio activities
    recentAudio?.forEach(audio => {
      if (audio.creator) {
        activities.push({
          id: `audio-${audio.id}`,
          type: 'audio',
          creator: {
            id: audio.creator.id,
            display_name: audio.creator.display_name,
            profile_image_url: audio.creator.profile_image_url
          },
          content: {
            title: audio.title,
            artist: audio.artist,
            cover_art_url: audio.cover_art_url
          },
          action: 'listened to',
          created_at: audio.created_at
        });
      }
    });

    // Add podcast activities
    recentPodcasts?.forEach(podcast => {
      if (podcast.creator) {
        activities.push({
          id: `podcast-${podcast.id}`,
          type: 'podcast',
          creator: {
            id: podcast.creator.id,
            display_name: podcast.creator.display_name,
            profile_image_url: podcast.creator.profile_image_url
          },
          content: {
            title: podcast.title,
            description: podcast.description,
            cover_image_url: podcast.cover_image_url
          },
          action: 'listened to podcast',
          created_at: podcast.created_at
        });
      }
    });

    // Sort by creation date and limit to 5 most recent
    const sortedActivities = activities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    console.log('🎉 Final activities count:', sortedActivities.length);
    console.log('🎉 Activities:', sortedActivities);

    return NextResponse.json({
      activities: sortedActivities,
      friendsCount: mutualFollows?.length || 0
    });

  } catch (error) {
    console.error('Unexpected error fetching friends activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
