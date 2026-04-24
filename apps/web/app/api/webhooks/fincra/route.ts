import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { verifyFincraWebhookSignature } from '@/src/lib/fincra';

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

function normalizeStatus(status: string): 'completed' | 'failed' | 'pending' {
  const s = String(status || '').toLowerCase();
  if (s.includes('successful') || s.includes('success') || s === 'completed') return 'completed';
  if (s.includes('failed') || s === 'error' || s === 'cancelled') return 'failed';
  return 'pending';
}

function normalizeWebhookOutcome(payload: Record<string, unknown>): 'completed' | 'failed' | 'pending' {
  const event = String(payload.event ?? payload.type ?? '').toLowerCase();
  const data = (payload.data as Record<string, unknown> | undefined) ?? {};
  const nestedStatus = String(data.status ?? '').toLowerCase();
  const topStatus = String(payload.status ?? '').toLowerCase();
  return normalizeStatus([event, nestedStatus, topStatus].filter(Boolean).join(' '));
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

  const reference =
    (payload?.reference as string | undefined) ||
    ((payload?.data as Record<string, unknown> | undefined)?.reference as string | undefined) ||
    ((payload?.data as Record<string, unknown> | undefined)?.customerReference as string | undefined) ||
    ((payload?.data as Record<string, unknown> | undefined)?.id as string | undefined) ||
    '';

  if (!reference) {
    return NextResponse.json({ received: true }, { status: 200, headers: corsHeaders });
  }

  const normalized = normalizeWebhookOutcome(payload);
  const eventStatus =
    (payload?.status as string | undefined) ||
    ((payload?.data as Record<string, unknown> | undefined)?.status as string | undefined) ||
    '';
  const supabase = createServiceClient();

  const { data: payoutTx } = await supabase
    .from('wallet_transactions')
    .select('id, user_id, amount, currency')
    .eq('reference_id', reference)
    .eq('transaction_type', 'payout')
    .maybeSingle();

  if (normalized === 'failed' && payoutTx && Number(payoutTx.amount) < 0) {
    const refundRef = `fincra_failed_refund:${reference}`;
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
        metadata: { fincra_reference: reference, reason: eventStatus || 'failed' },
        p_currency: String(payoutTx.currency || 'GBP').toUpperCase(),
      });
      if (refundErr) {
        console.error('[fincra webhook] refund RPC failed:', refundErr);
      }
    }
  }

  // Update wallet transaction statuses by transfer reference.
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

  const completedAt = new Date().toISOString();
  const failureReason = `Fincra transfer ${eventStatus || 'failed'}`;

  // Keep payout requests in sync where stripe_transfer_id is used as transfer reference.
  if (normalized === 'completed') {
    await supabase
      .from('payout_requests')
      .update({
        status: 'completed',
        completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq('stripe_transfer_id', reference);
    await supabase
      .from('payouts')
      .update({ status: 'completed', completed_at: completedAt, failure_reason: null })
      .eq('stripe_transfer_id', reference);
    await supabase
      .from('payouts')
      .update({ status: 'completed', completed_at: completedAt, failure_reason: null })
      .eq('customer_reference', reference);
  } else if (normalized === 'failed') {
    await supabase
      .from('payout_requests')
      .update({
        status: 'failed',
        rejection_reason: failureReason,
        updated_at: completedAt,
      })
      .eq('stripe_transfer_id', reference);
    await supabase
      .from('payouts')
      .update({ status: 'failed', failure_reason: failureReason })
      .eq('stripe_transfer_id', reference);
    await supabase
      .from('payouts')
      .update({ status: 'failed', failure_reason: failureReason })
      .eq('customer_reference', reference);
  }

  return NextResponse.json({ received: true }, { status: 200, headers: corsHeaders });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

