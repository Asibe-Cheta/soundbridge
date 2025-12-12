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

// GET /api/user/[userId]/following
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

    const { userId } = params;

    // Get all users this user is following
    const { data: followingData, error: followingError } = await supabase
      .from('follows')
      .select(`
        following_id,
        created_at,
        following:profiles!follows_following_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          bio
        )
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false });

    if (followingError) {
      console.error('Error fetching following:', followingError);
      return NextResponse.json(
        { error: 'Failed to fetch following' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Format response
    const following = followingData?.map(f => ({
      id: f.following.id,
      username: f.following.username,
      display_name: f.following.display_name,
      avatar_url: f.following.avatar_url,
      bio: f.following.bio,
      followed_at: f.created_at
    })) || [];

    return NextResponse.json(
      {
        success: true,
        following,
        count: following.length
      },
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error in GET /api/user/[userId]/following:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
