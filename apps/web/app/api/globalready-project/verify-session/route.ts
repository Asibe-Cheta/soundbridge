import { NextRequest, NextResponse } from 'next/server';
import {
  isGlobalReadyAccessDenied,
  requireGlobalReadyAccess,
} from '@/src/lib/globalready-project-auth';
import { stripe } from '@/src/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: NextRequest) {
  const access = await requireGlobalReadyAccess(request);
  if (isGlobalReadyAccessDenied(access)) {
    return NextResponse.json({ error: access.error }, { status: access.status, headers: CORS });
  }

  const sessionId = request.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400, headers: CORS });
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500, headers: CORS });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.metadata?.product !== 'globalready_project') {
    return NextResponse.json({ error: 'Invalid checkout session' }, { status: 400, headers: CORS });
  }

  const sessionEmail = (session.customer_email ?? session.metadata?.user_email ?? '')
    .toLowerCase()
    .trim();
  if (sessionEmail && sessionEmail !== access.email) {
    return NextResponse.json({ error: 'Session does not belong to this account' }, { status: 403, headers: CORS });
  }

  const paid = session.payment_status === 'paid';

  return NextResponse.json(
    {
      paid,
      payment_status: session.payment_status,
      amount_total: session.amount_total != null ? session.amount_total / 100 : null,
      currency: session.currency?.toUpperCase() ?? null,
    },
    { headers: CORS },
  );
}
