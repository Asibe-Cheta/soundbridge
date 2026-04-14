import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { resolveCreatorProfileBySlug } from '@/src/lib/creator-profile-slug';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const resolvedParams = await params;
    const { username: slug } = resolvedParams;

    const supabase = createServiceClient();
    const resolved = await resolveCreatorProfileBySlug(
      supabase,
      decodeURIComponent(slug)
    );

    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Creator not found' },
        { status: 404 }
      );
    }

    const creatorId = resolved.profile.id as string;
    const p = resolved.profile as Record<string, unknown>;
    const uname = typeof p.username === 'string' ? p.username : '';
    const displayName =
      (typeof p.display_name === 'string' && p.display_name) ||
      uname ||
      resolved.canonicalSlug;
    const avatarUrl = (p.avatar_url as string | null) || null;
    const isVerified = Boolean(p.is_verified);
    const location = (p.location as string | null) || null;
    const country = (p.country as string | null) || null;

    const { data, error } = await supabase
      .from('audio_tracks')
      .select(
        `
        id, title, description, duration, play_count, like_count,
        file_url, cover_art_url, genre, created_at, is_paid, price, currency,
        creator_id, is_public
      `,
      )
      .eq('creator_id', creatorId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching tracks:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch tracks' },
        { status: 500 }
      );
    }

    const transformedData = (data || []).map((track: Record<string, unknown>) => ({
      id: track.id,
      title: track.title || 'Untitled',
      description: track.description || '',
      creator_id: track.creator_id,
      file_url: track.file_url || '',
      cover_art_url: track.cover_art_url || null,
      duration: track.duration || 0,
      genre: track.genre || 'Unknown',
      tags: track.tags || [],
      play_count: track.play_count || 0,
      like_count: (track.like_count as number) ?? 0,
      is_public: track.is_public !== false,
      created_at: track.created_at || new Date().toISOString(),
      is_paid: track.is_paid,
      price: track.price,
      currency: track.currency,
      creator: {
        id: creatorId,
        username: uname || resolved.canonicalSlug,
        display_name: displayName,
        avatar_url: avatarUrl,
        banner_url: null,
        location,
        country,
        bio: (p.bio as string | null) || null,
        role: 'creator' as const,
        is_verified: isVerified,
        social_links: {},
        created_at: '',
        updated_at: '',
      },
    }));

    return NextResponse.json({
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('Error in tracks API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
