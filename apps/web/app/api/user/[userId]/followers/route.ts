import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/src/lib/types';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET /api/user/[userId]/followers
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
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

    // Get current user (optional - for showing follow status)
    const { data: { user } } = await supabase.auth.getUser();

    const { userId } = params;

    // Get all followers for this user
    const { data: followersData, error: followersError } = await supabase
      .from('follows')
      .select(`
        follower_id,
        created_at,
        follower:profiles!follows_follower_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          bio
        )
      `)
      .eq('following_id', userId)
      .order('created_at', { ascending: false });

    if (followersError) {
      console.error('Error fetching followers:', followersError);
      return NextResponse.json(
        { error: 'Failed to fetch followers' },
        { status: 500, headers: corsHeaders }
      );
    }

    // If user is logged in, get their following list to show who they follow back
    let followingIds: string[] = [];
    if (user) {
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      followingIds = followingData?.map(f => f.following_id) || [];
    }

    // Format response with follow status
    const followers = followersData?.map(f => ({
      id: f.follower.id,
      username: f.follower.username,
      display_name: f.follower.display_name,
      avatar_url: f.follower.avatar_url,
      bio: f.follower.bio,
      followed_at: f.created_at,
      is_following_back: user ? followingIds.includes(f.follower.id) : false
    })) || [];

    return NextResponse.json(
      {
        success: true,
        followers,
        count: followers.length
      },
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error in GET /api/user/[userId]/followers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
