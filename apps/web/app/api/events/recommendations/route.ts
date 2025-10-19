import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get personalized event recommendations
    const { data: recommendations, error: recError } = await supabase
      .rpc('get_personalized_event_recommendations', {
        p_user_id: user.id,
        p_limit: limit
      });

    if (recError) {
      console.error('Error getting recommendations:', recError);
      throw recError;
    }

    // Enhance recommendations with additional data
    const enhancedRecommendations = await Promise.all(
      (recommendations || []).map(async (rec: any) => {
        // Get ticket info
        const { data: tickets } = await supabase
          .from('event_tickets')
          .select('*')
          .eq('event_id', rec.event_id)
          .eq('is_active', true)
          .order('price_gbp', { ascending: true });

        // Get friends attending
        const { data: friendsAttending } = await supabase
          .from('user_friends_attending_events')
          .select('friend_id, friend_name, friend_avatar')
          .eq('event_id', rec.event_id)
          .eq('user_id', user.id)
          .limit(5);

        // Get event bundles
        const { data: bundles } = await supabase
          .from('event_bundles')
          .select('*')
          .eq('event_id', rec.event_id)
          .eq('is_active', true);

        return {
          ...rec,
          tickets: tickets || [],
          friends_attending: friendsAttending || [],
          friends_count: friendsAttending?.length || 0,
          bundles: bundles || [],
          has_bundle: (bundles && bundles.length > 0) || false,
        };
      })
    );

    return NextResponse.json({
      success: true,
      recommendations: enhancedRecommendations,
      total: enhancedRecommendations.length
    });

  } catch (error) {
    console.error('Event recommendations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Track user's music listening for recommendations
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { trackId, artistId, genre, listenDuration } = body;

    if (!trackId || !artistId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update or create listening history
    const { data: existing } = await supabase
      .from('user_listening_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('track_id', trackId)
      .single();

    if (existing) {
      // Update existing record
      await supabase
        .from('user_listening_history')
        .update({
          play_count: existing.play_count + 1,
          total_listen_duration: existing.total_listen_duration + (listenDuration || 0),
          last_played_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // Create new record
      await supabase
        .from('user_listening_history')
        .insert({
          user_id: user.id,
          track_id: trackId,
          artist_id: artistId,
          genre: genre,
          play_count: 1,
          total_listen_duration: listenDuration || 0,
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Listening history updated'
    });

  } catch (error) {
    console.error('Track listening error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

