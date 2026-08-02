import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { capturePayPalOrder } from '@/src/lib/paypal-client';
import { finalizePayPalCharge, type PayPalPendingCharge } from '@/src/lib/paypal-finalize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * Called client-side (PayPalCheckoutButton's onApprove) right after the buyer approves in the
 * PayPal popup. Captures server-side (never trust a client-reported "it worked"), then runs
 * the same finalize logic the PayPal webhook uses as a backstop — both paths are idempotent
 * via add_wallet_transaction's existing dedupe, so it's safe if both fire for the same order.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { orderId?: string } | null;
    const orderId = body?.orderId?.trim();
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400, headers: corsHeaders });
    }

    const service = createServiceClient();
    const { data: pendingCharge, error: lookupErr } = await service
      .from('paypal_pending_charges')
      .select('*')
      .eq('paypal_order_id', orderId)
      .maybeSingle();

    if (lookupErr || !pendingCharge) {
      return NextResponse.json({ error: 'No matching PayPal charge found' }, { status: 404, headers: corsHeaders });
    }

    if (pendingCharge.status === 'captured') {
      return NextResponse.json({ success: true, alreadyCaptured: true }, { headers: corsHeaders });
    }

    const capture = await capturePayPalOrder(orderId);
    if (capture.status !== 'COMPLETED' || !capture.captureId) {
      await service
        .from('paypal_pending_charges')
        .update({ status: 'failed' })
        .eq('id', pendingCharge.id);
      return NextResponse.json(
        { error: `PayPal capture did not complete (status: ${capture.status})` },
        { status: 402, headers: corsHeaders }
      );
    }

    await service
      .from('paypal_pending_charges')
      .update({
        status: 'captured',
        paypal_capture_id: capture.captureId,
        captured_at: new Date().toISOString(),
      })
      .eq('id', pendingCharge.id);

    const result = await finalizePayPalCharge(
      service,
      pendingCharge as PayPalPendingCharge,
      capture.captureId
    );

    if (!result.ok) {
      console.error('[paypal capture-order] finalize failed:', result.reason, orderId);
      return NextResponse.json(
        { error: 'Payment captured but could not be finalized. Please contact support.', reason: result.reason },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true, captureId: capture.captureId }, { headers: corsHeaders });
  } catch (error) {
    console.error('[paypal capture-order]', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500, headers: corsHeaders });
  }
}
