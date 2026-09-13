/**
 * GET /api/gift-bundle/balance (WEB_TEAM_GIFT_BUNDLE.MD, Item 36)
 * Returns the caller's Gift Bundle balance in major units. No row yet is a
 * normal starting state, not an error — never 404 for it.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const { data, error } = await supabase
      .from('gift_bundle_balances')
      .select('balance, currency')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[gift-bundle/balance] fetch failed:', error);
      return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json(
      { balance: (data?.balance ?? 0) / 100, currency: data?.currency ?? 'USD' },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[gift-bundle/balance] unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
