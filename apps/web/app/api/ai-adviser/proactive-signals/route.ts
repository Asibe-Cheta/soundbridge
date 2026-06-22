import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/** GET — list proactive signals. POST — mark shown (all or by ids). */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const unshownOnly = request.nextUrl.searchParams.get('unshown') === '1';
    const service = createServiceClient();

    let q = service
      .from('ai_proactive_signals')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unshownOnly) {
      q = q.eq('shown_to_user', false);
    }

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    const signals = data ?? [];

    const { count: unshownExact } = await service
      .from('ai_proactive_signals')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', user.id)
      .eq('shown_to_user', false);

    const unshownCount = unshownOnly ? signals.length : (unshownExact ?? 0);

    return NextResponse.json(
      {
        signals,
        unshownCount: unshownOnly ? signals.length : unshownCount,
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error('[ai-adviser/proactive-signals GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : null;
    const markAll = body.markAll === true || body.mark_all === true;

    const service = createServiceClient();

    if (markAll) {
      const { error } = await service
        .from('ai_proactive_signals')
        .update({ shown_to_user: true })
        .eq('creator_id', user.id)
        .eq('shown_to_user', false);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }

      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (!ids?.length) {
      return NextResponse.json({ error: 'ids or markAll required' }, { status: 400, headers: corsHeaders });
    }

    const { error } = await service
      .from('ai_proactive_signals')
      .update({ shown_to_user: true })
      .eq('creator_id', user.id)
      .in('id', ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (e) {
    console.error('[ai-adviser/proactive-signals POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
