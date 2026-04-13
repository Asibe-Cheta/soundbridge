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
  if (s === 'completed' || s === 'successful' || s === 'success') return 'completed';
  if (s === 'failed' || s === 'error' || s === 'cancelled') return 'failed';
  return 'pending';
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

  const eventStatus =
    (payload?.status as string | undefined) ||
    ((payload?.data as Record<string, unknown> | undefined)?.status as string | undefined) ||
    '';
  const reference =
    (payload?.reference as string | undefined) ||
    ((payload?.data as Record<string, unknown> | undefined)?.reference as string | undefined) ||
    ((payload?.data as Record<string, unknown> | undefined)?.id as string | undefined) ||
    '';

  if (!reference) {
    return NextResponse.json({ received: true }, { status: 200, headers: corsHeaders });
  }

  const normalized = normalizeStatus(eventStatus);
  const supabase = createServiceClient();

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

  // Keep payout requests in sync where stripe_transfer_id is used as transfer reference.
  if (normalized === 'completed') {
    await supabase
      .from('payout_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_transfer_id', reference);
  } else if (normalized === 'failed') {
    await supabase
      .from('payout_requests')
      .update({
        status: 'failed',
        rejection_reason: `Fincra transfer ${eventStatus || 'failed'}`,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_transfer_id', reference);
  }

  return NextResponse.json({ received: true }, { status: 200, headers: corsHeaders });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

