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
 * POST /api/event-tickets/:id/send-receipt
 * Send ticket receipt email to the ticket holder.
 * Guard: ticket.user_id === req.user.id
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

    const { id: ticketId } = await params;
    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID required' }, { status: 400, headers: CORS });
    }

    const { data: ticket, error: ticketError } = await supabase
      .from('purchased_event_tickets')
      .select('id, user_id, event_id, ticket_code, quantity, amount_paid, currency, payment_intent_id, purchase_date, status, platform_fee_amount')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404, headers: CORS });
    }
    if ((ticket as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: CORS });
    }

    const email = user.email;
    if (!email) {
      return NextResponse.json({ error: 'No email on account' }, { status: 400, headers: CORS });
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, event_date, location, venue')
      .eq('id', (ticket as { event_id: string }).event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404, headers: CORS });
    }

    const t = ticket as {
      id: string;
      user_id: string;
      event_id: string;
      ticket_code: string;
      quantity: number;
      amount_paid: number;
      currency: string;
      payment_intent_id: string;
      purchase_date: string;
      status: string;
      platform_fee_amount: number;
    };
    const ev = event as { title: string; event_date: string; location: string | null; venue: string | null };

    let paymentMethodLast4 = '';
    if (t.payment_intent_id && stripe) {
      try {
        const pi = await stripe.paymentIntents.retrieve(t.payment_intent_id, { expand: ['payment_method'] });
        const pm = pi.payment_method;
        if (typeof pm === 'object' && pm && 'card' in pm && pm.card && typeof (pm.card as { last4?: string }).last4 === 'string') {
          paymentMethodLast4 = (pm.card as { last4: string }).last4;
        }
      } catch {
        // ignore
      }
    }

    const amountPaid = typeof t.amount_paid === 'number' ? t.amount_paid : Number(t.amount_paid);
    const amountDisplay = t.currency === 'GBP' ? `£${amountPaid.toFixed(2)}` : t.currency === 'NGN' ? `₦${amountPaid.toFixed(2)}` : `${t.currency} ${amountPaid.toFixed(2)}`;
    const platformFeeDisplay = typeof t.platform_fee_amount === 'number' ? t.platform_fee_amount.toFixed(2) : String(t.platform_fee_amount);
    const dateUtc = new Date(t.purchase_date).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    const eventDate = ev.event_date ? new Date(ev.event_date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>SoundBridge Ticket Receipt</h1>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Receipt #</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${t.id}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Ticket code</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${t.ticket_code}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Stripe Payment Intent</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${t.payment_intent_id}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Date &amp; Time (UTC)</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${dateUtc}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Event</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${ev.title}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Event date</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${eventDate}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Location</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${ev.location || ev.venue || '—'}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Quantity</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${t.quantity}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Amount paid</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${amountDisplay}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Platform fee</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${t.currency} ${platformFeeDisplay}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Buyer</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${email}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Payment method (last 4)</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${paymentMethodLast4 || '—'}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Status</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${t.status}</td></tr>
        </table>
        <p style="margin-top: 24px; font-size: 12px; color: #666;">Support: contact@soundbridge.live</p>
      </div>
    `;

    const sent = await SendGridService.sendHtmlEmail(
      email,
      `SoundBridge Ticket Receipt — ${ev.title}`,
      html
    );

    if (!sent) {
      return NextResponse.json({ error: 'Failed to send receipt email' }, { status: 500, headers: CORS });
    }

    return NextResponse.json({ success: true, email }, { status: 200, headers: CORS });
  } catch (e) {
    console.error('send-receipt event-ticket:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
