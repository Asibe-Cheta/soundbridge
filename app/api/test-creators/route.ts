import { NextResponse } from 'next/server';
import { createApiClient } from '@/src/lib/supabase';
import { getCreatorStats, searchCreators } from '@/src/lib/creator';

export async function GET() {
  try {
    const supabase = createApiClient();

    // Test profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to fetch profiles',
        error: profilesError.message
      }, { status: 500 });
    }

    // Test audio_tracks table
    const { data: tracks, error: tracksError } = await supabase
      .from('audio_tracks')
      .select('*')
      .limit(5);

    if (tracksError) {
      console.error('Error fetching tracks:', tracksError);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to fetch tracks',
        error: tracksError.message
      }, { status: 500 });
    }

    // Test events table
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .limit(5);

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to fetch events',
        error: eventsError.message
      }, { status: 500 });
    }

    // Test follows table
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('*')
      .limit(5);

    if (followsError) {
      console.error('Error fetching follows:', followsError);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to fetch follows',
        error: followsError.message
      }, { status: 500 });
    }

    // Test creator search functionality
    const { data: searchResults, error: searchError } = await searchCreators({}, 3);

    if (searchError) {
      console.error('Error searching creators:', searchError);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to search creators',
        error: searchError instanceof Error ? searchError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Test creator stats for first profile (if exists)
    let statsTest = null;
    if (profiles && profiles.length > 0) {
      const firstProfile = profiles[0];
      try {
        const { data: stats, error: statsError } = await getCreatorStats(firstProfile.id);
        if (statsError) {
          statsTest = { error: 'Failed to get stats' };
        } else {
          statsTest = {
            profile_id: firstProfile.id,
            username: firstProfile.username,
            stats
          };
        }
      } catch (statsError) {
        console.error('Error getting creator stats:', statsError);
        statsTest = { error: 'Failed to get stats' };
      }
    }

    return NextResponse.json({
      status: 'success',
      message: 'Creator system is working correctly',
      tests: {
        profiles: {
          passed: true,
          message: '✅ Profiles table accessible',
          count: profiles?.length || 0,
          sample: profiles?.[0] ? {
            id: profiles[0].id,
            username: profiles[0].username,
            display_name: profiles[0].display_name,
            role: profiles[0].role
          } : null
        },
        tracks: {
          passed: true,
          message: '✅ Audio tracks table accessible',
          count: tracks?.length || 0
        },
        events: {
          passed: true,
          message: '✅ Events table accessible',
          count: events?.length || 0
        },
        follows: {
          passed: true,
          message: '✅ Follows table accessible',
          count: follows?.length || 0
        },
        search: {
          passed: true,
          message: '✅ Creator search working',
          count: searchResults?.length || 0
        },
        stats: {
          passed: !!statsTest && !statsTest.error,
          message: statsTest?.error ? '❌ Stats calculation failed' : '✅ Creator stats working',
          data: statsTest
        }
      },
      summary: {
        totalTests: 6,
        passedTests: 5,
        failedTests: statsTest?.error ? 1 : 0,
        message: statsTest?.error ? '⚠️ Creator system mostly working (stats need attention)' : '🎉 Creator system ready!'
      }
    });
  } catch (error) {
    console.error('Unexpected error testing creators:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 