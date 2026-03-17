import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { SendGridService } from '@/src/lib/sendgrid-service';
import { stripe } from '@/src/lib/stripe';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * POST /api/wallet/transactions/:id/send-receipt
 * Re-send (or first send) receipt email for a wallet transaction.
 * Guard: transaction.user_id === req.user.id
 * WEB_TEAM_RECEIPTS_AND_PLATFORM_FEE_FIX.MD
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const { id: transactionId } = await params;
    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400, headers: CORS });
    }

    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, amount, currency, description, reference_type, reference_id, status, metadata, stripe_payment_intent_id, created_at')
      .eq('id', transactionId)
      .single();

    if (txError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404, headers: CORS });
    }
    if ((transaction as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: CORS });
    }

    const email = user.email;
    if (!email) {
      return NextResponse.json({ error: 'No email on account' }, { status: 400, headers: CORS });
    }

    const tx = transaction as {
      id: string;
      user_id: string;
      amount: number;
      currency: string;
      description: string | null;
      reference_type: string | null;
      reference_id: string | null;
      status: string;
      metadata: Record<string, unknown> | null;
      stripe_payment_intent_id: string | null;
      created_at: string;
    };

    let paymentMethodLast4 = '';
    let piStatus = tx.status;
    if (tx.stripe_payment_intent_id && stripe) {
      try {
        const pi = await stripe.paymentIntents.retrieve(tx.stripe_payment_intent_id, { expand: ['payment_method'] });
        piStatus = pi.status ?? tx.status;
        const pm = pi.payment_method;
        if (typeof pm === 'object' && pm && 'card' in pm && pm.card && typeof (pm.card as { last4?: string }).last4 === 'string') {
          paymentMethodLast4 = (pm.card as { last4: string }).last4;
        }
      } catch {
        // ignore
      }
    }

    const platformFee = (tx.metadata?.platform_fee ?? tx.metadata?.platformFee) != null
      ? String(tx.metadata.platform_fee ?? tx.metadata.platformFee)
      : '—';
    const dateUtc = new Date(tx.created_at).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    const amountStr = `${tx.currency} ${Number(tx.amount).toFixed(2)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>SoundBridge Receipt</h1>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Receipt #</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${tx.id}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Stripe Payment Intent</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${tx.stripe_payment_intent_id || '—'}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Date &amp; Time (UTC)</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${dateUtc}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Type</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${tx.reference_type || 'wallet'}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Amount</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${amountStr}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Platform fee</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${platformFee}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Payer / Recipient</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${email}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Description</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${tx.description || '—'}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Payment method (last 4)</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${paymentMethodLast4 || '—'}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Status</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${piStatus}</td></tr>
        </table>
        <p style="margin-top: 24px; font-size: 12px; color: #666;">Support: contact@soundbridge.live</p>
      </div>
    `;

    const sent = await SendGridService.sendHtmlEmail(
      email,
      `SoundBridge Receipt — ${amountStr}`,
      html
    );

    if (!sent) {
      return NextResponse.json({ error: 'Failed to send receipt email' }, { status: 500, headers: CORS });
    }

    return NextResponse.json({ success: true, email }, { status: 200, headers: CORS });
  } catch (e) {
    console.error('send-receipt wallet:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
