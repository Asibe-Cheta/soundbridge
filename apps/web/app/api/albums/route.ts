import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/src/lib/types';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import {
  ALBUM_PUBLISHED_COUNT_LIMITS,
  resolveAlbumTierForLimits,
  type ProfileTierInput,
} from '@/src/lib/effective-subscription-tier';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/albums
 * Create a new album
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const service = createServiceClient();
    const { data: profileRow } = await service
      .from('profiles')
      .select('early_adopter, subscription_tier, subscription_period_end')
      .eq('id', user.id)
      .maybeSingle();
    const profile = profileRow as ProfileTierInput | null;

    const albumTier = resolveAlbumTierForLimits(profile);
    const albumLimit = ALBUM_PUBLISHED_COUNT_LIMITS[albumTier];

    if (albumLimit === 0) {
      return NextResponse.json(
        {
          error: 'Album creation requires Premium or Unlimited.',
          details: 'Upgrade your plan to publish albums.',
          upgrade_required: true,
        },
        { status: 403, headers: corsHeaders },
      );
    }

    if (albumLimit > 0) {
      const { count, error: countError } = await service
        .from('albums')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user.id)
        .eq('status', 'published');

      if (!countError && (count ?? 0) >= albumLimit) {
        return NextResponse.json(
          {
            error: 'Album limit reached',
            details: `You can have up to ${albumLimit} published albums on your current plan.`,
            upgrade_required: true,
            limit: albumLimit,
            current: count ?? 0,
          },
          { status: 403, headers: corsHeaders },
        );
      }
    }

    const body = await request.json();
    const { title, description, cover_image_url, release_date, status, genre, is_public } = body;

    const { data: album, error: createError } = await supabase
      .from('albums')
      .insert({
        creator_id: user.id,
        title,
        description,
        cover_image_url,
        release_date,
        status: status || 'draft',
        genre,
        is_public: is_public !== undefined ? is_public : true,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating album:', createError);
      return NextResponse.json(
        { error: 'Failed to create album', details: createError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { data: album },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in POST /api/albums:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/albums?sort=recent&limit=20
 * Get public albums (discovery)
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'recent';
    const genre = searchParams.get('genre');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

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
      .eq('is_public', true)
      .eq('status', 'published');

    if (genre) {
      query = query.eq('genre', genre);
    }

    // Apply sorting
    if (sort === 'popular') {
      query = query.order('total_plays', { ascending: false });
    } else if (sort === 'trending') {
      query = query.order('total_likes', { ascending: false });
    } else {
      query = query.order('published_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data: albums, error, count } = await query;

    if (error) {
      console.error('Error fetching albums:', error);
      return NextResponse.json(
        { error: 'Failed to fetch albums', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { data: albums || [], count: count || 0 },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in GET /api/albums:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
