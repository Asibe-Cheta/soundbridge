import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await getSupabaseRouteClient(request, true);
  if (!auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data, error } = await auth.supabase
    .from('request_room_sessions')
    .select('*')
    .eq('creator_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ sessions: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await getSupabaseRouteClient(request, true);
  if (!auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const sessionName = typeof body.session_name === 'string' ? body.session_name.trim() : '';
  const minTip = Number(body.minimum_tip_amount);

  if (!Number.isFinite(minTip) || minTip <= 0) {
    return NextResponse.json({ error: 'Valid minimum_tip_amount is required' }, { status: 400 });
  }

  const { data: existing } = await auth.supabase
    .from('request_room_sessions')
    .select('id')
    .eq('creator_id', auth.user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (existing?.id) {
    return NextResponse.json({ error: 'You already have an active Request Room session' }, { status: 409 });
  }

  const { data, error } = await auth.supabase
    .from('request_room_sessions')
    .insert({
      creator_id: auth.user.id,
      session_name: sessionName || null,
      minimum_tip_amount: Math.round(minTip * 100) / 100,
      status: 'active',
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ session: data }, { status: 201 });
}

