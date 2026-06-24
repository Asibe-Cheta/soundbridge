import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { verifyFincraWebhookSignature } from '@/src/lib/fincra';
import {
  extractFincraReferencesFromWebhookPayload,
  findPayoutRequestsByFincraReferences,
  markPayoutRequestsCompleted,
  markPayoutRequestsFailed,
  normalizeFincraPayoutStatus,
} from '@/src/lib/payouts/fincra-payout-completion';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Fincra-Signature, x-fincra-signature',
};

function getRequesterIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-vercel-forwarded-for') ||
    ''
  ).trim();
}

function isAllowedFincraIp(ip: string): boolean {
  const enabled = (process.env.FINCRA_WEBHOOK_IP_WHITELIST_ENABLED || '').toLowerCase() === 'true';
  if (!enabled) return true;
  const allowlistRaw =
    process.env.FINCRA_WEBHOOK_IP_ALLOWLIST ||
    // Fincra update (Apr 8, 2026): new source IP.
    '54.171.93.87';
  const allowlist = new Set(
    allowlistRaw
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  );
  return allowlist.has(ip);
}

function normalizeWebhookOutcome(payload: Record<string, unknown>): 'completed' | 'failed' | 'pending' {
  const event = String(payload.event ?? payload.type ?? '').toLowerCase();
  const data = (payload.data as Record<string, unknown> | undefined) ?? {};
  const nestedStatus = String(data.status ?? '').toLowerCase();
  const topStatus = String(payload.status ?? '').toLowerCase();
  return normalizeFincraPayoutStatus([event, nestedStatus, topStatus].filter(Boolean).join(' '));
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const requesterIp = getRequesterIp(request);
  if (!isAllowedFincraIp(requesterIp)) {
    return NextResponse.json({ error: 'Forbidden source IP' }, { status: 403, headers: corsHeaders });
  }

  const rawBody = await request.text();
  const signature =
    request.headers.get('x-fincra-signature') ||
    request.headers.get('X-Fincra-Signature');

  if (!verifyFincraWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401, headers: corsHeaders });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  const references = extractFincraReferencesFromWebhookPayload(payload);
  if (references.length === 0) {
    return NextResponse.json({ received: true }, { status: 200, headers: corsHeaders });
  }

  const normalized = normalizeWebhookOutcome(payload);
  const eventStatus =
    (payload?.status as string | undefined) ||
    ((payload?.data as Record<string, unknown> | undefined)?.status as string | undefined) ||
    '';
  const supabase = createServiceClient();
  const primaryReference = references[0];

  const { data: payoutTxRows } = await supabase
    .from('wallet_transactions')
    .select('id, user_id, amount, currency')
    .in('reference_id', references)
    .eq('transaction_type', 'payout')
    .limit(1);
  const payoutTx = payoutTxRows?.[0] ?? null;

  if (normalized === 'failed' && payoutTx && Number(payoutTx.amount) < 0) {
    const refundRef = `fincra_failed_refund:${primaryReference}`;
    const { data: existingRefund } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('reference_id', refundRef)
      .eq('transaction_type', 'refund')
      .maybeSingle();
    if (!existingRefund) {
      const refundAmt = Math.abs(Number(payoutTx.amount));
      const { error: refundErr } = await supabase.rpc('add_wallet_transaction', {
        user_uuid: payoutTx.user_id,
        transaction_type: 'refund',
        amount: refundAmt,
        description: 'Fincra payout failed — wallet credited',
        reference_id: refundRef,
        metadata: { fincra_reference: primaryReference, reason: eventStatus || 'failed' },
        p_currency: String(payoutTx.currency || 'GBP').toUpperCase(),
      });
      if (refundErr) {
        console.error('[fincra webhook] refund RPC failed:', refundErr);
      }
    }
  }

  for (const reference of references) {
    await supabase
      .from('wallet_transactions')
      .update({
        status: normalized,
        metadata: {
          provider: 'fincra',
          webhook_status: eventStatus,
          webhook_received_at: new Date().toISOString(),
          reference,
        },
      })
      .eq('reference_id', reference)
      .eq('transaction_type', 'payout');
  }

  const completedAt = new Date().toISOString();
  const failureReason = `Fincra transfer ${eventStatus || 'failed'}`;
  const payoutRows = await findPayoutRequestsByFincraReferences(supabase, references);

  if (normalized === 'completed') {
    await markPayoutRequestsCompleted(supabase, payoutRows);

    for (const reference of references) {
      await supabase
        .from('payouts')
        .update({ status: 'completed', completed_at: completedAt, failure_reason: null })
        .eq('stripe_transfer_id', reference);
      await supabase
        .from('payouts')
        .update({ status: 'completed', completed_at: completedAt, failure_reason: null })
        .eq('customer_reference', reference);
    }
  } else if (normalized === 'failed') {
    await markPayoutRequestsFailed(supabase, references, failureReason);

    for (const reference of references) {
      await supabase
        .from('payouts')
        .update({ status: 'failed', failure_reason: failureReason })
        .eq('stripe_transfer_id', reference);
      await supabase
        .from('payouts')
        .update({ status: 'failed', failure_reason: failureReason })
        .eq('customer_reference', reference);
    }
  }

  return NextResponse.json({ received: true, references, outcome: normalized }, { status: 200, headers: corsHeaders });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
