import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { verifyPayPalWebhookSignature } from '@/src/lib/paypal-client';
import { finalizePayPalCharge, type PayPalPendingCharge } from '@/src/lib/paypal-finalize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Safety net for finalization if the client-side call from PayPalCheckoutButton's onApprove
 * never completes (tab closed, network drop, etc — mirrors why the Stripe webhook exists
 * alongside client-confirmed payments). Idempotent via the same add_wallet_transaction dedupe
 * the capture-order route relies on, so it's harmless if both fire for the same charge.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const headers = request.headers;
    const authAlgo = headers.get('paypal-auth-algo');
    const certUrl = headers.get('paypal-cert-url');
    const transmissionId = headers.get('paypal-transmission-id');
    const transmissionSig = headers.get('paypal-transmission-sig');
    const transmissionTime = headers.get('paypal-transmission-time');

    if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
      return NextResponse.json({ error: 'Missing PayPal signature headers' }, { status: 400 });
    }

    const verified = await verifyPayPalWebhookSignature({
      authAlgo,
      certUrl,
      transmissionId,
      transmissionSig,
      transmissionTime,
      webhookEvent: event,
    });
    if (!verified) {
      console.error('[paypal webhook] signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
      return NextResponse.json({ received: true });
    }

    const orderId: string | undefined = event.resource?.supplementary_data?.related_ids?.order_id;
    const captureId: string | undefined = event.resource?.id;
    if (!orderId || !captureId) {
      console.error('[paypal webhook] capture-completed event missing order_id/capture id');
      return NextResponse.json({ received: true });
    }

    const service = createServiceClient();
    const { data: pendingCharge, error: lookupErr } = await service
      .from('paypal_pending_charges')
      .select('*')
      .eq('paypal_order_id', orderId)
      .maybeSingle();

    if (lookupErr || !pendingCharge) {
      console.error('[paypal webhook] no pending charge for order', orderId);
      return NextResponse.json({ received: true });
    }

    if (pendingCharge.status !== 'captured') {
      await service
        .from('paypal_pending_charges')
        .update({ status: 'captured', paypal_capture_id: captureId, captured_at: new Date().toISOString() })
        .eq('id', pendingCharge.id);
    }

    const result = await finalizePayPalCharge(service, pendingCharge as PayPalPendingCharge, captureId);
    if (!result.ok) {
      console.error('[paypal webhook] finalize failed:', result.reason, orderId);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[paypal webhook]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
