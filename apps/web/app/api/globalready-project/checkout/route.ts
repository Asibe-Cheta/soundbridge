import { NextRequest, NextResponse } from 'next/server';
import {
  getGlobalReadyPriceId,
  isGlobalReadyAccessDenied,
  requireGlobalReadyAccess,
} from '@/src/lib/globalready-project-auth';
import { stripe } from '@/src/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
  const access = await requireGlobalReadyAccess(request);
  if (isGlobalReadyAccessDenied(access)) {
    return NextResponse.json({ error: access.error }, { status: access.status, headers: CORS });
  }

  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500, headers: CORS },
    );
  }

  const priceId = getGlobalReadyPriceId();
  if (!priceId) {
    return NextResponse.json(
      { error: 'GLOBALREADY_PRICE_ID is not configured' },
      { status: 500, headers: CORS },
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || request.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: access.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/globalready-project/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/globalready-project?canceled=1`,
    metadata: {
      product: 'globalready_project',
      user_id: access.userId,
      user_email: access.email,
    },
    payment_intent_data: {
      metadata: {
        product: 'globalready_project',
        user_id: access.userId,
        user_email: access.email,
      },
    },
  });

  return NextResponse.json(
    { sessionId: session.id, url: session.url },
    { headers: CORS },
  );
}
