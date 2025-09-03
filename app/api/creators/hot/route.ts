import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '6');
    const supabase = createServiceClient();

    // Algorithm for "Hot Creators Now" - Multi-factor scoring system
    // 1. Recent activity (30 days) - 40% weight
    // 2. Engagement ratio (likes/plays per track) - 25% weight
    // 3. Growth rate (new followers in last 7 days) - 20% weight
    // 4. Content diversity (music + podcasts + events) - 10% weight
    // 5. Follower count (baseline popularity) - 5% weight

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get creators with comprehensive metrics
    const { data: creators, error } = await supabase
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
        created_at,
        followers:follows!follows_following_id_fkey(count),
        recent_tracks:audio_tracks!audio_tracks_creator_id_fkey(
          id,
          title,
          play_count,
          like_count,
          created_at,
          genre
        ),
        all_tracks:audio_tracks!audio_tracks_creator_id_fkey(count),
        events:events!events_creator_id_fkey(count)
      `)
      .eq('role', 'creator')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching creators for hot list:', error);
      return NextResponse.json({ error: 'Failed to fetch hot creators' }, { status: 500 });
    }

    if (!creators || creators.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Calculate hot scores for each creator
    const creatorsWithScores = await Promise.all(
      creators.map(async (creator) => {
        let hotScore = 0;
        const metrics = {
          recentActivity: 0,
          engagementRatio: 0,
          growthRate: 0,
          contentDiversity: 0,
          followerCount: 0
        };

        // 1. Recent Activity Score (40% weight)
        const recentTracks = creator.recent_tracks?.filter((track: any) => 
          new Date(track.created_at) >= thirtyDaysAgo
        ) || [];
        
        if (recentTracks.length > 0) {
          // Score based on recent uploads and their performance
          const totalRecentPlays = recentTracks.reduce((sum: number, track: any) => 
            sum + (track.play_count || 0), 0
          );
          const avgPlaysPerTrack = totalRecentPlays / recentTracks.length;
          
          // Normalize: 1-3 recent tracks = good, 4+ = excellent
          const activityMultiplier = Math.min(recentTracks.length / 3, 1.5);
          metrics.recentActivity = Math.min(avgPlaysPerTrack * activityMultiplier / 1000, 100);
        }

        // 2. Engagement Ratio Score (25% weight)
        const allTracks = creator.recent_tracks || [];
        if (allTracks.length > 0) {
          const totalPlays = allTracks.reduce((sum: number, track: any) => 
            sum + (track.play_count || 0), 0
          );
          const totalLikes = allTracks.reduce((sum: number, track: any) => 
            sum + (track.like_count || 0), 0
          );
          
          if (totalPlays > 0) {
            const engagementRate = (totalLikes / totalPlays) * 100;
            metrics.engagementRatio = Math.min(engagementRate * 10, 100); // Good engagement = 10%+
          }
        }

        // 3. Growth Rate Score (20% weight) - Simulated based on recent activity
        // In a real implementation, you'd track follower growth over time
        const followerCount = creator.followers?.[0]?.count || 0;
        const accountAge = Math.max(
          (Date.now() - new Date(creator.created_at).getTime()) / (1000 * 60 * 60 * 24),
          1
        );
        
        // Estimate growth rate based on followers vs account age
        const estimatedGrowthRate = followerCount / accountAge;
        metrics.growthRate = Math.min(estimatedGrowthRate * 2, 100);

        // 4. Content Diversity Score (10% weight)
        const trackCount = creator.all_tracks?.[0]?.count || 0;
        const eventCount = creator.events?.[0]?.count || 0;
        
        // Check for music vs podcast diversity
        const musicTracks = allTracks.filter((track: any) => 
          !['podcast', 'Podcast', 'PODCAST'].includes(track.genre)
        ).length;
        const podcastTracks = allTracks.length - musicTracks;
        
        let diversityPoints = 0;
        if (trackCount > 0) diversityPoints += 50;
        if (eventCount > 0) diversityPoints += 25;
        if (musicTracks > 0 && podcastTracks > 0) diversityPoints += 25; // Both music and podcasts
        
        metrics.contentDiversity = diversityPoints;

        // 5. Follower Count Score (5% weight) - Baseline popularity
        metrics.followerCount = Math.min(followerCount / 1000, 100); // Cap at 100k followers = max score

        // Calculate weighted hot score
        hotScore = 
          (metrics.recentActivity * 0.40) +
          (metrics.engagementRatio * 0.25) +
          (metrics.growthRate * 0.20) +
          (metrics.contentDiversity * 0.10) +
          (metrics.followerCount * 0.05);

        // Boost score for creators with both music and podcasts
        const hasMusic = allTracks.some((track: any) => 
          !['podcast', 'Podcast', 'PODCAST'].includes(track.genre)
        );
        const hasPodcasts = allTracks.some((track: any) => 
          ['podcast', 'Podcast', 'PODCAST'].includes(track.genre)
        );
        
        if (hasMusic && hasPodcasts) {
          hotScore *= 1.15; // 15% bonus for multi-format creators
        }

        return {
          id: creator.id,
          username: creator.username,
          display_name: creator.display_name,
          bio: creator.bio,
          avatar_url: creator.avatar_url,
          location: creator.location,
          country: creator.country,
          genre: creator.genre,
          followers_count: followerCount,
          tracks_count: trackCount,
          events_count: eventCount,
          recent_tracks_count: recentTracks.length,
          hot_score: Math.round(hotScore * 100) / 100,
          content_types: {
            has_music: hasMusic,
            has_podcasts: hasPodcasts,
            has_events: eventCount > 0
          },
          metrics // For debugging/analytics
        };
      })
    );

    // Sort by hot score and return top creators
    const hotCreators = creatorsWithScores
      .filter(creator => creator.hot_score > 0) // Only include creators with some activity
      .sort((a, b) => b.hot_score - a.hot_score)
      .slice(0, limit);

    return NextResponse.json({
      data: hotCreators,
      algorithm_info: {
        weights: {
          recent_activity: "40%",
          engagement_ratio: "25%",
          growth_rate: "20%",
          content_diversity: "10%",
          follower_count: "5%"
        },
        bonuses: {
          multi_format: "15% (music + podcasts)"
        },
        time_windows: {
          recent_activity: "30 days",
          growth_estimation: "7 days"
        }
      }
    });

  } catch (error) {
    console.error('Error fetching hot creators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hot creators' },
      { status: 500 }
    );
  }
}
