import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { resolveCreatorProfileBySlug } from '@/src/lib/creator-profile-slug';

export const dynamic = 'force-dynamic';

/**
 * Creator profile albums tab — mirrors mobile: published-ish list ordered by created_at.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username: slug } = await params;
    const supabase = createServiceClient();
    const resolved = await resolveCreatorProfileBySlug(supabase, decodeURIComponent(slug));

    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Creator not found' }, { status: 404 });
    }

    const creatorId = resolved.profile.id as string;

    const { data, error } = await supabase
      .from('albums')
      .select('id, title, cover_image_url, tracks_count, total_plays, created_at')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[creator/albums]', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (e: unknown) {
    console.error('[creator/albums]', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
