import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import {
  PODCAST_MIN_DURATION_SECONDS,
  AUDIOBOOK_MIN_DURATION_SECONDS,
} from '@/src/lib/content-category-duration';

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const service = createServiceClient();

    const { data: profile } = await service
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin =
      profile?.is_admin === true ||
      profile?.role === 'admin' ||
      profile?.role === 'super_admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [{ count: podcastMiscategorised }, { count: audiobookMiscategorised }] = await Promise.all([
      service
        .from('audio_tracks')
        .select('id', { count: 'exact', head: true })
        .eq('content_type', 'podcast')
        .gt('duration', 0)
        .lt('duration', PODCAST_MIN_DURATION_SECONDS),
      service
        .from('audio_tracks')
        .select('id', { count: 'exact', head: true })
        .eq('content_type', 'audio_book')
        .gt('duration', 0)
        .lt('duration', AUDIOBOOK_MIN_DURATION_SECONDS),
    ]);

    return NextResponse.json({
      success: true,
      thresholds: {
        podcastMinSeconds: PODCAST_MIN_DURATION_SECONDS,
        audiobookMinSeconds: AUDIOBOOK_MIN_DURATION_SECONDS,
      },
      remainingMiscategorised: {
        podcast: podcastMiscategorised ?? 0,
        audiobook: audiobookMiscategorised ?? 0,
      },
      note: 'One-time migration may already have run (mobile/web). Remaining counts should be 0 after migration.',
    });
  } catch (e) {
    console.error('[admin/content-category-migration]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
