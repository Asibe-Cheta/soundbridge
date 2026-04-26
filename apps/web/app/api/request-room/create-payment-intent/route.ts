import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/src/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }
    const body = await request.json().catch(() => ({}));
    const sessionId = String(body.session_id || '').trim();
    const songRequest = String(body.song_request || '').trim();
    const tipperName = String(body.tipper_name || 'Anonymous').trim() || 'Anonymous';
    const leadEmail = String(body.email || '').trim().toLowerCase();
    const gdprConsent = Boolean(body.gdpr_consent);
    const tipAmount = Number(body.tip_amount);

    if (!sessionId || !songRequest || !Number.isFinite(tipAmount) || tipAmount <= 0) {
      return NextResponse.json({ error: 'session_id, song_request and valid tip_amount are required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data: session, error: sessionErr } = await supabase
      .from('request_room_sessions')
      .select('id,creator_id,status,minimum_tip_amount')
      .eq('id', sessionId)
      .maybeSingle();
    if (sessionErr) return NextResponse.json({ error: sessionErr.message }, { status: 400 });
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.status !== 'active') return NextResponse.json({ error: 'This session has ended' }, { status: 410 });
    if (tipAmount < Number(session.minimum_tip_amount || 1)) {
      return NextResponse.json({ error: `Minimum tip is ${session.minimum_tip_amount}` }, { status: 400 });
    }

    const amountMinor = Math.round(tipAmount * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountMinor,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        charge_type: 'request_room_tip',
        session_id: session.id,
        creator_id: session.creator_id,
        song_request: songRequest,
        tipper_name: tipperName,
        lead_email: leadEmail,
        gdpr_consent: String(gdprConsent),
      },
      description: `Request Room tip - ${songRequest}`,
    });

    return NextResponse.json({
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('[request-room] create-payment-intent error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

