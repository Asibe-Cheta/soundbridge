/**
 * GET /api/payouts/status/:reference
 * Fincra payout status by customer reference (WEB_TEAM_FINCRA_INTEGRATION.MD).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { getFincraPayoutStatusByCustomerReference } from '@/src/lib/fincra';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reference: string }> },
) {
  try {
    const auth = await getSupabaseRouteClient(request, true);
    const { user, supabase, error: authError } = auth;
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const { reference: rawRef } = await context.params;
    const reference = decodeURIComponent(rawRef || '').trim();
    if (!reference) {
      return NextResponse.json({ error: 'reference is required' }, { status: 400, headers: corsHeaders });
    }

    const { data: byCustomer } = await supabase
      .from('payouts')
      .select('id, user_id, customer_reference, stripe_transfer_id')
      .eq('user_id', user.id)
      .eq('customer_reference', reference)
      .maybeSingle();

    const row =
      byCustomer ??
      (
        await supabase
          .from('payouts')
          .select('id, user_id, customer_reference, stripe_transfer_id')
          .eq('user_id', user.id)
          .eq('stripe_transfer_id', reference)
          .maybeSingle()
      ).data;

    if (!row) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404, headers: corsHeaders });
    }

    const fincraRef = row.customer_reference || row.stripe_transfer_id || reference;
    const status = await getFincraPayoutStatusByCustomerReference(fincraRef);

    return NextResponse.json(
      {
        reference: fincraRef,
        status: status.status,
        provider: 'fincra',
        details: status.raw,
      },
      { headers: corsHeaders },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Status lookup failed';
    console.error('GET /api/payouts/status/[reference]:', e);
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
