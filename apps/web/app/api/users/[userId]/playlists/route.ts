import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/src/lib/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/users/:userId/playlists
 * Get user's playlists (public if not authenticated, all if owner)
 */
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
            } catch (error) {}
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {}
          },
        },
      }
    );

    const { userId } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Check if user is authenticated and is the owner
    const { data: { user } } = await supabase.auth.getUser();
    const isOwner = user && user.id === userId;

    let query = supabase
      .from('playlists')
      .select(`
        *,
        creator:profiles!playlists_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('creator_id', userId);

    // If not owner, only show public playlists
    if (!isOwner) {
      query = query.eq('is_public', true);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: playlists, error, count } = await query;

    if (error) {
      console.error('Error fetching user playlists:', error);
      return NextResponse.json(
        { error: 'Failed to fetch playlists', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { data: playlists || [], count: count || 0, isOwner },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in GET /api/users/:userId/playlists:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
