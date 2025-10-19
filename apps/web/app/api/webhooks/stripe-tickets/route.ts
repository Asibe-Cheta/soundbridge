import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/src/lib/stripe';
import { createServiceClient } from '@/src/lib/supabase';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TICKETS!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature || !webhookSecret || !stripe) {
      console.error('Missing signature or webhook secret');
      return NextResponse.json(
        { error: 'Webhook configuration error' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    console.log('Received webhook event:', event.type);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent, supabase);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, supabase);
        break;

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent, supabase);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object as Stripe.Charge, supabase);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  console.log('Payment succeeded:', paymentIntent.id);

  try {
    // Update ticket purchases to completed
    const { data: purchases, error: updateError } = await supabase
      .from('ticket_purchases')
      .update({
        payment_status: 'succeeded',
        status: 'completed',
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .select(`
        *,
        event:events(
          id,
          title,
          event_date,
          location,
          creator_id
        ),
        ticket:event_tickets(
          id,
          ticket_name
        )
      `);

    if (updateError) {
      console.error('Error updating ticket purchases:', updateError);
      throw updateError;
    }

    if (!purchases || purchases.length === 0) {
      console.log('No purchases found for payment intent:', paymentIntent.id);
      return;
    }

    // Update ticket sold count
    const ticketId = purchases[0].ticket_id;
    const quantity = purchases.length;

    await supabase.rpc('increment', {
      table_name: 'event_tickets',
      id_value: ticketId,
      column_name: 'quantity_sold',
      increment_by: quantity
    });

    // Update bundle sold count if applicable
    if (purchases[0].bundle_purchase_id) {
      const { data: bundlePurchase } = await supabase
        .from('bundle_purchases')
        .update({ status: 'completed' })
        .eq('id', purchases[0].bundle_purchase_id)
        .select('bundle_id')
        .single();

      if (bundlePurchase) {
        await supabase.rpc('increment', {
          table_name: 'event_bundles',
          id_value: bundlePurchase.bundle_id,
          column_name: 'quantity_sold',
          increment_by: 1
        });
      }
    }

    // Generate QR codes for each ticket
    for (const purchase of purchases) {
      await generateAndStoreQRCode(purchase, supabase);
    }

    // Send confirmation email
    await sendTicketConfirmationEmail(purchases[0], supabase);

    // Send push notification (if user has notifications enabled)
    await sendTicketPurchaseNotification(purchases[0], supabase);

    console.log(`Successfully processed ${purchases.length} ticket(s)`);

  } catch (error) {
    console.error('Error in handlePaymentSuccess:', error);
    throw error;
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  console.log('Payment failed:', paymentIntent.id);

  await supabase
    .from('ticket_purchases')
    .update({
      payment_status: 'failed',
      status: 'cancelled',
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  // Also update bundle purchase if applicable
  await supabase
    .from('bundle_purchases')
    .update({ status: 'cancelled' })
    .eq('stripe_payment_intent_id', paymentIntent.id);
}

async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  console.log('Payment canceled:', paymentIntent.id);

  await supabase
    .from('ticket_purchases')
    .update({
      payment_status: 'failed',
      status: 'cancelled',
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  await supabase
    .from('bundle_purchases')
    .update({ status: 'cancelled' })
    .eq('stripe_payment_intent_id', paymentIntent.id);
}

async function handleRefund(charge: Stripe.Charge, supabase: any) {
  console.log('Charge refunded:', charge.id);

  const paymentIntentId = charge.payment_intent as string;

  const { data: purchases } = await supabase
    .from('ticket_purchases')
    .update({
      payment_status: 'refunded',
      status: 'refunded',
      refunded_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntentId)
    .select('ticket_id');

  if (purchases && purchases.length > 0) {
    // Decrease ticket sold count
    const ticketId = purchases[0].ticket_id;
    await supabase.rpc('decrement', {
      table_name: 'event_tickets',
      id_value: ticketId,
      column_name: 'quantity_sold',
      decrement_by: purchases.length
    });
  }

  // Send refund confirmation email
  if (purchases && purchases.length > 0) {
    await sendRefundConfirmationEmail(purchases[0], supabase);
  }
}

async function generateAndStoreQRCode(purchase: any, supabase: any) {
  try {
    // Generate QR code using ticket code
    // You can use a library like 'qrcode' or an API service
    const QRCode = await import('qrcode');
    
    const qrCodeData = JSON.stringify({
      ticket_code: purchase.ticket_code,
      purchase_id: purchase.id,
      event_id: purchase.event_id,
      buyer_email: purchase.buyer_email,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Store QR code URL in database
    await supabase
      .from('ticket_purchases')
      .update({ qr_code_url: qrCodeDataUrl })
      .eq('id', purchase.id);

    console.log('QR code generated for ticket:', purchase.ticket_code);

  } catch (error) {
    console.error('Error generating QR code:', error);
    // Don't throw - QR code can be regenerated later
  }
}

async function sendTicketConfirmationEmail(purchase: any, supabase: any) {
  try {
    // Get all tickets for this purchase (in case of multiple)
    const { data: allTickets } = await supabase
      .from('ticket_purchases')
      .select(`
        *,
        event:events(title, event_date, location, venue, image_url),
        ticket:event_tickets(ticket_name, ticket_type)
      `)
      .eq('stripe_payment_intent_id', purchase.stripe_payment_intent_id);

    // Send email via your email service (e.g., SendGrid, Resend)
    // This is a placeholder - implement with your email service
    console.log('Would send confirmation email to:', purchase.buyer_email);
    console.log('Tickets:', allTickets?.length);

    // Example email content:
    // - Event details
    // - Ticket type and quantity
    // - QR codes (attached or embedded)
    // - Calendar .ics file
    // - Important event information

  } catch (error) {
    console.error('Error sending confirmation email:', error);
    // Don't throw - email can be resent later
  }
}

async function sendRefundConfirmationEmail(purchase: any, supabase: any) {
  try {
    console.log('Would send refund confirmation to:', purchase.buyer_email);
    // Implement refund email logic
  } catch (error) {
    console.error('Error sending refund email:', error);
  }
}

async function sendTicketPurchaseNotification(purchase: any, supabase: any) {
  try {
    // Check if user has push notifications enabled
    const { data: tokens } = await supabase
      .from('user_push_tokens')
      .select('expo_push_token')
      .eq('user_id', purchase.user_id)
      .eq('is_active', true);

    if (!tokens || tokens.length === 0) {
      return;
    }

    // Send push notification via Expo
    // This is a placeholder - integrate with your existing push notification system
    console.log('Would send push notification for ticket purchase');

  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

// Helper RPC functions that need to be created in database
// CREATE OR REPLACE FUNCTION increment(table_name text, id_value uuid, column_name text, increment_by integer)
// CREATE OR REPLACE FUNCTION decrement(table_name text, id_value uuid, column_name text, decrement_by integer)

