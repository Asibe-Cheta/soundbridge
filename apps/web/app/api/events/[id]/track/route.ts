import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { isEventTrackAction, trackEventAction } from '@/src/lib/event-analytics';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/events/[id]/track
 * Body: { action: 'view' | 'share_link' | 'share_card' | ... }
 * Views work without auth (service role); other actions require auth.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: eventId } = await params;
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';

    if (!isEventTrackAction(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400, headers: corsHeaders },
      );
    }

    if (action === 'view') {
      const service = createServiceClient();
      await trackEventAction(service, eventId, action);
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    await trackEventAction(supabase, eventId, action);
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('[events/track]', error);
    return NextResponse.json(
      { success: false, error: 'Tracking failed' },
      { status: 500, headers: corsHeaders },
    );
  }
}
