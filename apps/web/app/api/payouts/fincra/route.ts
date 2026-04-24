/**
 * POST /api/payouts/fincra
 * Mobile alias for creator Fincra wallet payout (WEB_TEAM_FINCRA_INTEGRATION.MD).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { performCreatorFincraWalletPayout } from '@/src/lib/payouts/creator-fincra-wallet-payout';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getSupabaseRouteClient(request, true);
    const { user, supabase, error: authError } = auth;
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount);
    const currency = String(body.currency ?? 'GBP').toUpperCase();

    const result = await performCreatorFincraWalletPayout(supabase, user, { amount, currency });

    return NextResponse.json(
      {
        payout_id: result.payoutId,
        status: 'pending',
        amount: result.amount,
        currency: result.currency,
        estimated_arrival: result.estimatedArrival,
      },
      { headers: corsHeaders },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Fincra payout failed';
    const status = (e as { status?: number })?.status === 403 ? 502 : 400;
    console.error('POST /api/payouts/fincra:', e);
    return NextResponse.json({ error: msg }, { status, headers: corsHeaders });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
