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
 * GET /api/creators/:creatorId/albums
 * Get creator's albums (public if not authenticated, all if owner)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { creatorId: string } }
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

    const { creatorId } = params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Filter by status: draft, scheduled, published
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Check if user is authenticated and is the creator
    const { data: { user } } = await supabase.auth.getUser();
    const isOwner = user && user.id === creatorId;

    let query = supabase
      .from('albums')
      .select(`
        *,
        creator:profiles!albums_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('creator_id', creatorId);

    // If not owner, only show published public albums
    if (!isOwner) {
      query = query.eq('is_public', true).eq('status', 'published');
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Sort by published_at for published albums, created_at otherwise
    if (status === 'published' || !isOwner) {
      query = query.order('published_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data: albums, error, count } = await query;

    if (error) {
      console.error('Error fetching creator albums:', error);
      return NextResponse.json(
        { error: 'Failed to fetch albums', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { data: albums || [], count: count || 0, isOwner },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in GET /api/creators/:creatorId/albums:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
