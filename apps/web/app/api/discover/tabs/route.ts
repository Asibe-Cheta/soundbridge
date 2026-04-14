import { NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export const dynamic = 'force-dynamic';

const ALLOWED_MODERATION = ['pending_check', 'checking', 'clean', 'approved'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

function mergeAlbumsUnique(
  featured: Record<string, unknown>[],
  recent: Record<string, unknown>[],
  max = 20,
): Record<string, unknown>[] {
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const row of featured) {
    const id = String(row.id);
    if (!seen.has(id)) {
      seen.add(id);
      out.push(row);
    }
  }
  for (const row of recent) {
    if (out.length >= max) break;
    const id = String(row.id);
    if (!seen.has(id)) {
      seen.add(id);
      out.push(row);
    }
  }
  return out.slice(0, max);
}

function normalizeTrackRow(row: Record<string, unknown> & { creator?: Record<string, unknown> }) {
  const likes =
    (row.likes_count as number | undefined) ??
    (row.like_count as number | undefined) ??
    0;
  const cover =
    (row.cover_art_url as string | null) || (row.artwork_url as string | null) || null;
  return {
    ...row,
    cover_art_url: cover,
    artwork_url: row.artwork_url ?? null,
    like_count: likes,
    likes_count: likes,
    creator: row.creator,
  };
}

/**
 * Discover Albums / Podcasts / Mixtapes — mirrors mobile Supabase queries (service role, no RLS hang).
 */
export async function GET() {
  try {
    const supabase = createServiceClient();

    const albumSelect = `
      id, title, description, cover_image_url, release_date, genre,
      tracks_count, total_duration, total_plays, total_likes,
      created_at, published_at,
      creator:profiles!albums_creator_id_fkey (
        id, username, display_name, avatar_url, role
      )
    `;

    const trackSelect = `
      id, title, description, audio_url, file_url, cover_art_url, artwork_url,
      duration, play_count, like_count, created_at, creator_id,
      creator:profiles!audio_tracks_creator_id_fkey (
        id, username, display_name, avatar_url
      )
    `;

    const [featuredRes, recentRes, podcastsRes, mixtapesRes] = await Promise.all([
      supabase
        .from('albums')
        .select(albumSelect)
        .eq('is_public', true)
        .eq('status', 'published')
        .order('total_plays', { ascending: false })
        .limit(20),
      supabase
        .from('albums')
        .select(albumSelect)
        .eq('is_public', true)
        .eq('status', 'published')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(20),
      supabase
        .from('audio_tracks')
        .select(trackSelect)
        .eq('is_public', true)
        .eq('content_type', 'podcast')
        .in('moderation_status', ALLOWED_MODERATION)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('audio_tracks')
        .select(trackSelect)
        .eq('is_public', true)
        .eq('is_mixtape', true)
        .in('moderation_status', ALLOWED_MODERATION)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const err =
      featuredRes.error ||
      recentRes.error ||
      podcastsRes.error ||
      mixtapesRes.error;
    if (err) {
      console.error('[discover/tabs]', err);
      return NextResponse.json(
        { success: false, error: err.message || 'Query failed' },
        { status: 500, headers: corsHeaders },
      );
    }

    const albums = mergeAlbumsUnique(
      (featuredRes.data || []) as Record<string, unknown>[],
      (recentRes.data || []) as Record<string, unknown>[],
      20,
    );

    const podcasts = ((podcastsRes.data || []) as Record<string, unknown>[]).map((r) =>
      normalizeTrackRow(r as Parameters<typeof normalizeTrackRow>[0]),
    );
    const mixtapes = ((mixtapesRes.data || []) as Record<string, unknown>[]).map((r) =>
      normalizeTrackRow(r as Parameters<typeof normalizeTrackRow>[0]),
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          albums,
          albums_featured: featuredRes.data || [],
          albums_recent: recentRes.data || [],
          podcasts,
          mixtapes,
        },
      },
      { headers: { ...corsHeaders, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
    );
  } catch (e: unknown) {
    console.error('[discover/tabs]', e);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
