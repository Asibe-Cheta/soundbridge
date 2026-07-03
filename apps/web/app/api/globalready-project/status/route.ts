import { NextRequest, NextResponse } from 'next/server';
import {
  getGlobalReadyPriceId,
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

  const priceId = getGlobalReadyPriceId();
  let amount: number | null = null;
  let currency: string | null = null;

  if (priceId && stripe) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      amount = price.unit_amount != null ? price.unit_amount / 100 : null;
      currency = price.currency?.toUpperCase() ?? null;
    } catch (e) {
      console.error('[globalready-project/status] price retrieve failed:', e);
    }
  }

  return NextResponse.json(
    {
      allowed: true,
      email: access.email,
      price_configured: Boolean(priceId),
      amount,
      currency,
    },
    { headers: CORS },
  );
}
