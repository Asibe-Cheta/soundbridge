import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/src/lib/types';

export async function GET() {
  try {
    console.log('📊 Fetching user analytics...');

    // Create a route handler client that can access cookies (Next.js 15 requires await)
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // Handle cookie setting errors
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              // Handle cookie removal errors
            }
          },
        },
      }
    );

    // Get user from request cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Fetch all analytics data in parallel
    const [
      tracksDataResult,
      eventsDataResult,
      followersDataResult,
      followingDataResult,
      likesDataResult,
      sharesDataResult,
      recentTracksDataResult,
      recentEventsDataResult,
      monthlyPlaysDataResult,
      engagementDataResult,
      externalLinksDataResult,
      externalLinkClicksDataResult
    ] = await Promise.allSettled([
      // Get user's tracks
      supabase
        .from('audio_tracks')
        .select('id, title, play_count, like_count, created_at, cover_art_url, duration, genre')
        .eq('creator_id', user.id as any)
        .order('created_at', { ascending: false }) as any,

      // Get user's events
      supabase
        .from('events')
        .select('id, title, event_date, location, current_attendees, likes_count, shares_count, comments_count, created_at')
        .eq('creator_id', user.id as any)
        .order('created_at', { ascending: false }) as any,

      // Get follower count
      supabase
        .from('follows')
        .select('follower_id', { count: 'exact' })
        .eq('following_id', user.id as any) as any,

      // Get following count
      supabase
        .from('follows')
        .select('following_id', { count: 'exact' })
        .eq('follower_id', user.id as any) as any,

      // Get total likes received
      supabase
        .from('likes')
        .select('id', { count: 'exact' })
        .or(`content_id.eq.${user.id},content_id.in.(${user.id})`) as any,

      // Get total shares received
      supabase
        .from('shares')
        .select('id', { count: 'exact' })
        .or(`content_id.eq.${user.id},content_id.in.(${user.id})`) as any,

      // Get recent tracks (last 5)
      supabase
        .from('audio_tracks')
        .select('id, title, play_count, like_count, created_at, cover_art_url, duration')
        .eq('creator_id', user.id as any)
        .order('created_at', { ascending: false })
        .limit(5) as any,

      // Get recent events (last 5)
      supabase
        .from('events')
        .select('id, title, event_date, location, current_attendees, created_at')
        .eq('creator_id', user.id as any)
        .order('created_at', { ascending: false })
        .limit(5) as any,

      // Get monthly plays (all tracks - we use total plays as monthly since we don't track play history yet)
      supabase
        .from('audio_tracks')
        .select('play_count')
        .eq('creator_id', user.id as any) as any,

      // Get engagement rate (likes / plays)
      supabase
        .from('audio_tracks')
        .select('play_count, like_count')
        .eq('creator_id', user.id as any) as any,

      // Get external links
      supabase
        .from('external_links')
        .select('id, platform_type, url, click_count')
        .eq('creator_id', user.id as any)
        .order('click_count', { ascending: false }) as any,

      // Get external link clicks (this month)
      supabase
        .from('external_link_clicks')
        .select('id, clicked_at')
        .eq('creator_id', user.id as any)
        .gte('clicked_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()) as any
    ]);

    // Handle Promise.allSettled results
    const tracksData = tracksDataResult.status === 'fulfilled' ? tracksDataResult.value : { data: [], error: null };
    const eventsData = eventsDataResult.status === 'fulfilled' ? eventsDataResult.value : { data: [], error: null };
    const followersData = followersDataResult.status === 'fulfilled' ? followersDataResult.value : { count: 0, error: null };
    const followingData = followingDataResult.status === 'fulfilled' ? followingDataResult.value : { count: 0, error: null };
    const likesData = likesDataResult.status === 'fulfilled' ? likesDataResult.value : { count: 0, error: null };
    const sharesData = sharesDataResult.status === 'fulfilled' ? sharesDataResult.value : { count: 0, error: null };
    const recentTracksData = recentTracksDataResult.status === 'fulfilled' ? recentTracksDataResult.value : { data: [], error: null };
    const recentEventsData = recentEventsDataResult.status === 'fulfilled' ? recentEventsDataResult.value : { data: [], error: null };
    const monthlyPlaysData = monthlyPlaysDataResult.status === 'fulfilled' ? monthlyPlaysDataResult.value : { data: [], error: null };
    const engagementData = engagementDataResult.status === 'fulfilled' ? engagementDataResult.value : { data: [], error: null };
    const externalLinksData = externalLinksDataResult.status === 'fulfilled' ? externalLinksDataResult.value : { data: [], error: null };
    const externalLinkClicksData = externalLinkClicksDataResult.status === 'fulfilled' ? externalLinkClicksDataResult.value : { data: [], error: null };

    console.log('📊 Analytics data results:');
    console.log('📊 Tracks data:', { count: tracksData.data?.length || 0, error: tracksData.error });
    console.log('📊 Recent tracks data:', { count: recentTracksData.data?.length || 0, error: recentTracksData.error });
    if (tracksData.data && tracksData.data.length > 0) {
      console.log('📊 Sample track:', tracksData.data[0]);
    }

    // Calculate analytics
    const totalPlays = tracksData.data?.reduce((sum: number, track: any) => sum + (track.play_count || 0), 0) || 0;
    const totalLikes = tracksData.data?.reduce((sum: number, track: any) => sum + (track.like_count || 0), 0) || 0;
    const totalShares = 0; // shares_count column doesn't exist yet
    const totalDownloads = 0; // Not implemented yet
    const followers = followersData.count || 0;
    const following = followingData.count || 0;
    const tracks = tracksData.data?.length || 0;
    const events = eventsData.data?.length || 0;

    // Calculate monthly plays
    const monthlyPlays = monthlyPlaysData.data?.reduce((sum: number, track: any) => sum + (track.play_count || 0), 0) || 0;

    // Calculate engagement rate
    const totalEngagement = engagementData.data?.reduce((sum: number, track: any) => 
      sum + (track.like_count || 0), 0) || 0;
    const totalPlaysForEngagement = engagementData.data?.reduce((sum: number, track: any) => sum + (track.play_count || 0), 0) || 1;
    const engagementRate = totalPlaysForEngagement > 0 ? (totalEngagement / totalPlaysForEngagement) * 100 : 0;

    // Format recent tracks
    const recentTracks = recentTracksData.data?.map((track: any) => ({
      id: track.id,
      title: track.title,
      duration: track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : '0:00',
      plays: track.play_count || 0,
      likes: track.like_count || 0,
      uploadedAt: formatTimeAgo(track.created_at),
      coverArt: track.cover_art_url
    })) || [];

    // Format recent events
    const recentEvents = recentEventsData.data?.map((event: any) => ({
      id: event.id,
      title: event.title,
      date: new Date(event.event_date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      attendees: event.current_attendees || 0,
      location: event.location,
      status: new Date(event.event_date) > new Date() ? 'upcoming' : 'past'
    })) || [];

    // Calculate top genre
    const genreCounts: { [key: string]: number } = {};
    tracksData.data?.forEach((track: any) => {
      if (track.genre) {
        genreCounts[track.genre] = (genreCounts[track.genre] || 0) + 1;
      }
    });
    const topGenre = Object.keys(genreCounts).length > 0
      ? Object.entries(genreCounts).sort(([,a]: [any, any], [,b]: [any, any]) => b - a)[0][0]
      : 'No tracks yet';

    // Calculate external link stats
    const totalLinkClicks = externalLinksData.data?.reduce((sum: number, link: any) => sum + (link.click_count || 0), 0) || 0;
    const clicksThisMonth = externalLinkClicksData.data?.length || 0;
    const topLinks = externalLinksData.data?.slice(0, 3) || [];

    const analytics = {
      stats: {
        totalPlays,
        totalLikes,
        totalShares,
        totalDownloads,
        followers,
        following,
        tracks,
        events
      },
      recentTracks,
      recentEvents,
      monthlyPlays,
      engagementRate: Math.round(engagementRate * 100) / 100,
      topGenre,
      monthlyPlaysChange: 15, // Mock for now - would need historical data
      engagementRateChange: 2.3, // Mock for now - would need historical data
      external_links: {
        total_clicks: totalLinkClicks,
        clicks_this_month: clicksThisMonth,
        top_links: topLinks
      }
    };

    console.log('✅ Analytics data retrieved:', analytics);
    console.log('✅ Recent tracks in response:', analytics.recentTracks);

    return NextResponse.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('❌ Analytics fetch error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
}
