import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('🎯 Personalized feed API called');
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      console.error('❌ No user ID provided');
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    
    // Get user profile with onboarding data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        selected_role,
        location,
        country,
        genres,
        onboarding_completed,
        created_at
      `)
      .eq('id', userId as any)
      .single() as { data: any; error: any };

    if (profileError || !profile) {
      console.error('❌ Error fetching user profile:', profileError);
      // Return empty personalized data instead of error
      return NextResponse.json({
        success: true,
        data: {
          profile: {
            role: 'listener',
            location: '',
            genres: [],
            country: ''
          },
          music: [],
          creators: [],
          events: [],
          podcasts: []
        }
      });
    }

    console.log('👤 User profile:', {
      role: profile.selected_role,
      location: profile.location,
      genres: profile.genres,
      country: profile.country,
      onboarding_completed: profile.onboarding_completed
    });

    // Check if user has completed onboarding
    if (!profile.onboarding_completed) {
      console.log('🎯 User has not completed onboarding, returning empty data');
      return NextResponse.json({
        success: true,
        data: {
          profile: {
            role: profile.selected_role || 'listener',
            location: profile.location || '',
            genres: profile.genres || [],
            country: profile.country || ''
          },
          music: [],
          creators: [],
          events: [],
          podcasts: []
        }
      });
    }

    // Get personalized content based on user preferences
    const personalizedContent = await getPersonalizedContent(supabase, profile);
    
    return NextResponse.json({
      success: true,
      data: {
        profile: {
          role: profile.selected_role,
          location: profile.location,
          genres: profile.genres,
          country: profile.country
        },
        ...personalizedContent
      }
    });

  } catch (error) {
    console.error('❌ Error in personalized feed:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getPersonalizedContent(supabase: any, profile: any) {
  const userGenres = profile.genres || [];
  const userLocation = profile.location || '';
  const userCountry = profile.country || '';
  const userRole = profile.selected_role || 'listener';

  console.log('🎯 Getting personalized content for:', {
    role: userRole,
    genres: userGenres,
    location: userLocation,
    country: userCountry
  });

  // Get personalized music tracks
  const personalizedMusic = await getPersonalizedMusic(supabase, userGenres, userLocation, userCountry, userRole);
  
  // Get personalized creators
  const personalizedCreators = await getPersonalizedCreators(supabase, userGenres, userLocation, userCountry, userRole);
  
  // Get personalized events
  const personalizedEvents = await getPersonalizedEvents(supabase, userLocation, userCountry, userRole);
  
  // Get personalized podcasts
  const personalizedPodcasts = await getPersonalizedPodcasts(supabase, userGenres, userLocation, userRole);

  return {
    music: personalizedMusic,
    creators: personalizedCreators,
    events: personalizedEvents,
    podcasts: personalizedPodcasts
  };
}

async function getPersonalizedMusic(supabase: any, genres: string[], location: string, country: string, role: string) {
  let query = supabase
    .from('audio_tracks')
    .select(`
      *,
      creator:profiles!audio_tracks_creator_id_fkey(
        id,
        username,
        display_name,
        avatar_url,
        location,
        country,
        selected_role
      )
    `)
    .eq('is_public', true as any)
    .not('genre', 'eq', 'podcast' as any)
    .not('genre', 'eq', 'Podcast' as any)
    .not('genre', 'eq', 'PODCAST' as any);

  // Role-based filtering
  if (role === 'musician') {
    // Musicians see trending tracks for inspiration and collaboration
    query = query.order('play_count', { ascending: false });
  } else if (role === 'podcaster') {
    // Podcasters see music that could work for intros/outros
    query = query.or('genre.eq.instrumental,genre.eq.ambient,genre.eq.electronic');
  } else {
    // Listeners see content based on their genre preferences
    if (genres && genres.length > 0) {
      query = query.or(genres.map((genre: any) => `genre.eq.${genre}`).join(','));
    }
  }

  // Location-based filtering
  if (location && location !== 'all') {
    query = query.ilike('creator.location', `%${location}%`);
  }

  if (country && country !== 'all') {
    query = query.eq('creator.country', country);
  }

  // Get recent tracks with personalization
  const { data: tracks, error } = await query
    .order('created_at', { ascending: false })
    .limit(12) as { data: any; error: any };

  if (error) {
    console.error('❌ Error fetching personalized music:', error);
    return [];
  }

  // Format tracks to match the expected frontend structure
  let formattedTracks;
  
  if (tracks && tracks.length > 0 && tracks[0].creator) {
    // Creator relationship is working
    console.log('✅ Personalized feed: Creator relationship is working');
    formattedTracks = (tracks || []).map((track: any) => ({
      id: track.id,
      title: track.title,
      artist: track.creator?.display_name || 'Unknown Artist',
      coverArt: track.cover_art_url, // Map cover_art_url to coverArt
      url: track.file_url,
      duration: track.duration || 0,
      plays: track.play_count || 0,
      likes: track.like_count || 0,
      creator: {
        id: track.creator_id,
        name: track.creator?.display_name || 'Unknown Artist',
        username: track.creator?.username || 'unknown',
        avatar: track.creator?.avatar_url || null
      }
    }));
  } else {
    // Creator relationship is not working, fetch creator data manually
    console.log('⚠️ Personalized feed: Creator relationship not working, fetching manually...');
    
    // Get unique creator IDs
    const creatorIds = [...new Set(tracks.map((track: any) => track.creator_id))];
    console.log('🔍 Personalized feed: Unique creator IDs:', creatorIds);
    
    // Fetch creator data manually
    const { data: creators, error: creatorsError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', creatorIds as any) as { data: any; error: any };
    
    console.log('🔍 Personalized feed: Manual creator fetch result:', { creators, creatorsError });
    
    // Create a map of creator data
    const creatorMap = new Map();
    if (creators) {
      creators.forEach((creator: any) => {
        creatorMap.set(creator.id, creator);
      });
    }
    
    formattedTracks = (tracks || []).map((track: any) => {
      const creator = creatorMap.get(track.creator_id);
      return {
        id: track.id,
        title: track.title,
        artist: creator?.display_name || 'Unknown Artist',
        coverArt: track.cover_art_url, // Map cover_art_url to coverArt
        url: track.file_url,
        duration: track.duration || 0,
        plays: track.play_count || 0,
        likes: track.like_count || 0,
        creator: {
          id: track.creator_id,
          name: creator?.display_name || 'Unknown Artist',
          username: creator?.username || 'unknown',
          avatar: creator?.avatar_url || null
        }
      };
    });
  }

  return formattedTracks;
}

async function getPersonalizedCreators(supabase: any, genres: string[], location: string, country: string, role: string) {
  let query = supabase
    .from('profiles')
    .select(`
      id,
      username,
      display_name,
      bio,
      avatar_url,
      location,
      country,
      genre,
      selected_role,
      created_at,
      followers:follows!follows_following_id_fkey(count),
      tracks:audio_tracks!audio_tracks_creator_id_fkey(count),
      events:events!events_creator_id_fkey(count)
    `)
    .eq('role', 'creator' as any);

  // Role-based creator recommendations
  if (role === 'musician') {
    // Musicians see other musicians for collaboration
    query = query.or('selected_role.eq.musician,selected_role.eq.podcaster');
  } else if (role === 'event_promoter') {
    // Event promoters see musicians and podcasters
    query = query.or('selected_role.eq.musician,selected_role.eq.podcaster');
  } else {
    // Listeners see creators in their preferred genres
    if (genres && genres.length > 0) {
      query = query.or(genres.map((genre: any) => `genre.eq.${genre}`).join(','));
    }
  }

  // Location-based filtering
  if (location && location !== 'all') {
    query = query.ilike('location', `%${location}%`);
  }

  if (country && country !== 'all') {
    query = query.eq('country', country);
  }

  // Get creators with activity
  const { data: creators, error } = await query
    .order('created_at', { ascending: false })
    .limit(8) as { data: any; error: any };

  if (error) {
    console.error('❌ Error fetching personalized creators:', error);
    return [];
  }

  return creators || [];
}

async function getPersonalizedEvents(supabase: any, location: string, country: string, role: string) {
  let query = supabase
    .from('events')
    .select(`
      *,
      creator:profiles!events_creator_id_fkey(
        id,
        username,
        display_name,
        avatar_url,
        location,
        country
      )
    `)
    .gte('event_date', new Date().toISOString() as any)
    .eq('is_public', true as any);

  // Location-based filtering (most important for events)
  if (location && location !== 'all') {
    query = query.ilike('location', `%${location}%`);
  }

  if (country && country !== 'all') {
    query = query.ilike('location', `%${country}%`);
  }

  // Role-based event types
  if (role === 'musician') {
    // Musicians see networking events, open mics, collaboration events
    query = query.or('title.ilike.%networking%,title.ilike.%open mic%,title.ilike.%collaboration%,title.ilike.%jam%');
  } else if (role === 'event_promoter') {
    // Event promoters see all events for inspiration
    query = query.order('event_date', { ascending: true });
  } else {
    // Listeners see music events and concerts
    query = query.or('title.ilike.%concert%,title.ilike.%music%,title.ilike.%live%,title.ilike.%gig%');
  }

  // Get upcoming events
  const { data: events, error } = await query
    .order('event_date', { ascending: true })
    .limit(6) as { data: any; error: any };

  if (error) {
    console.error('❌ Error fetching personalized events:', error);
    return [];
  }

  return events || [];
}

async function getPersonalizedPodcasts(supabase: any, genres: string[], location: string, role: string) {
  let query = supabase
    .from('audio_tracks')
    .select(`
      *,
      creator:profiles!audio_tracks_creator_id_fkey(
        id,
        username,
        display_name,
        avatar_url,
        location,
        country,
        selected_role
      )
    `)
    .eq('is_public', true as any)
    .or('genre.eq.podcast,genre.eq.Podcast,genre.eq.PODCAST');

  // Role-based podcast recommendations
  if (role === 'podcaster') {
    // Podcasters see other podcasts for inspiration and collaboration
    query = query.eq('creator.selected_role', 'podcaster');
  } else if (role === 'musician') {
    // Musicians see music-related podcasts
    query = query.or('title.ilike.%music%,title.ilike.%artist%,title.ilike.%song%,title.ilike.%album%');
  } else {
    // Listeners see podcasts in their preferred genres
    if (genres && genres.length > 0) {
      query = query.or(genres.map((genre: any) => `title.ilike.%${genre}%`).join(','));
    }
  }

  // Location-based filtering
  if (location && location !== 'all') {
    query = query.ilike('creator.location', `%${location}%`);
  }

  // Get recent podcasts
  const { data: podcasts, error } = await query
    .order('created_at', { ascending: false })
    .limit(6) as { data: any; error: any };

  if (error) {
    console.error('❌ Error fetching personalized podcasts:', error);
    return [];
  }

  return podcasts || [];
}
