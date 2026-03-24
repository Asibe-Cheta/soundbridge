import type { SupabaseClient } from '@supabase/supabase-js';

export type PurchaseRow = {
  id: string;
  content_id: string;
  content_type: string;
  price_paid: number;
  currency: string;
  purchased_at: string;
  download_count: number | null;
};

export type EnrichedContent = {
  id: string;
  title: string;
  creator_id: string;
  cover_art_url?: string | null;
  cover_image_url?: string | null;
  file_url?: string | null;
  duration?: number;
  tracks_count?: number | null;
};

export type EnrichedCreator = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

/**
 * Load track or album row + creator profile for a content_purchases row.
 */
export async function enrichPurchaseWithContent(
  supabase: SupabaseClient,
  purchase: PurchaseRow
): Promise<{
  content: EnrichedContent | null;
  creator: EnrichedCreator | null;
}> {
  if (purchase.content_type === 'track') {
    const { data: track } = await supabase
      .from('audio_tracks')
      .select('id, title, creator_id, cover_art_url, file_url, duration')
      .eq('id', purchase.content_id)
      .single();

    if (!track) {
      return { content: null, creator: null };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', track.creator_id)
      .single();

    return {
      content: {
        id: track.id,
        title: track.title,
        creator_id: track.creator_id,
        cover_art_url: track.cover_art_url,
        file_url: track.file_url,
        duration: track.duration ?? 0,
      },
      creator: profile
        ? {
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          }
        : null,
    };
  }

  if (purchase.content_type === 'album') {
    const { data: album } = await supabase
      .from('albums')
      .select('id, title, creator_id, cover_image_url, tracks_count')
      .eq('id', purchase.content_id)
      .single();

    if (!album) {
      return { content: null, creator: null };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', album.creator_id)
      .single();

    return {
      content: {
        id: album.id,
        title: album.title,
        creator_id: album.creator_id,
        cover_image_url: album.cover_image_url,
        tracks_count: album.tracks_count,
      },
      creator: profile
        ? {
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          }
        : null,
    };
  }

  return { content: null, creator: null };
}
