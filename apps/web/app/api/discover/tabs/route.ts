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
  const cover = (row.cover_art_url as string | null) ?? null;
  return {
    ...row,
    cover_art_url: cover,
    artwork_url: null,
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

    const albumFeaturedSelect = `
      id, title, description, cover_image_url, release_date, genre,
      tracks_count, total_duration, total_plays, total_likes,
      created_at, published_at,
      profiles:profiles!albums_creator_id_fkey (
        id, username, display_name, avatar_url, role
      )
    `;

    const albumRecentSelect = `
      id, title, description, cover_image_url, release_date, genre,
      tracks_count, total_duration, total_plays, total_likes,
      created_at, published_at,
      profiles:profiles!albums_creator_id_fkey (
        id, username, display_name, avatar_url
      )
    `;

    const trackSelect = `
      id, title, description, audio_url, file_url, cover_art_url,
      duration, play_count, created_at, creator_id,
      profiles:profiles!creator_id (
        id, username, display_name, avatar_url
      )
    `;

    const [featuredRes, recentRes, podcastsRes, audiobooksRes, mixtapesRes] = await Promise.all([
      supabase
        .from('albums')
        .select(albumFeaturedSelect)
        .eq('is_public', true)
        .eq('status', 'published')
        .order('total_plays', { ascending: false })
        .limit(10),
      supabase
        .from('albums')
        .select(albumRecentSelect)
        .eq('is_public', true)
        .eq('status', 'published')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(10),
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
        .eq('content_type', 'audio_book')
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

    const albums = mergeAlbumsUnique(
      ((featuredRes.data || []) as Record<string, unknown>[]).map((row) => ({
        ...row,
        creator: (row.profiles as Record<string, unknown> | null) ?? null,
      })),
      ((recentRes.data || []) as Record<string, unknown>[]).map((row) => ({
        ...row,
        creator: (row.profiles as Record<string, unknown> | null) ?? null,
      })),
      20,
    );

    const podcasts = ((podcastsRes.data || []) as Record<string, unknown>[]).map((row) =>
      normalizeTrackRow({
        ...row,
        creator: (row.profiles as Record<string, unknown> | null) ?? null,
      } as Parameters<typeof normalizeTrackRow>[0]),
    );
    const audiobooks = ((audiobooksRes.data || []) as Record<string, unknown>[]).map((row) =>
      normalizeTrackRow({
        ...row,
        creator: (row.profiles as Record<string, unknown> | null) ?? null,
      } as Parameters<typeof normalizeTrackRow>[0]),
    );
    const mixtapes = ((mixtapesRes.data || []) as Record<string, unknown>[]).map((row) =>
      normalizeTrackRow({
        ...row,
        creator: (row.profiles as Record<string, unknown> | null) ?? null,
      } as Parameters<typeof normalizeTrackRow>[0]),
    );

    if (featuredRes.error || recentRes.error || podcastsRes.error || audiobooksRes.error || mixtapesRes.error) {
      console.error('[discover/tabs] partial query errors', {
        featured: featuredRes.error?.message ?? null,
        recent: recentRes.error?.message ?? null,
        podcasts: podcastsRes.error?.message ?? null,
        audiobooks: audiobooksRes.error?.message ?? null,
        mixtapes: mixtapesRes.error?.message ?? null,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          albums,
          albums_featured: ((featuredRes.data || []) as Record<string, unknown>[]).map((row) => ({
            ...row,
            creator: (row.profiles as Record<string, unknown> | null) ?? null,
          })),
          albums_recent: ((recentRes.data || []) as Record<string, unknown>[]).map((row) => ({
            ...row,
            creator: (row.profiles as Record<string, unknown> | null) ?? null,
          })),
          podcasts,
          audiobooks,
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
