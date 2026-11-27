import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { getFxRateToUsd } from '@/src/lib/fx-rates';
import { extractClientIp } from '@/src/lib/digital-card-auth';
import { hashTipRoomLocalRateIp, checkTipRoomLocalRateLimit } from '@/src/lib/tip-room-local-rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_RATE_AGE_DAYS = 3;
const CHARGE_CURRENCY = 'gbp';

/**
 * Display-only GBP -> target-currency conversion factor for Tip Room's
 * approximate local amount. Public, rate-limited by IP, no PII -- same
 * sensitivity as a published exchange rate. Returns only {available,
 * factor} -- the caller already knows which currency it asked for, so the
 * response never echoes it (or anything else) back. Never used by the
 * charge/validation path; that always re-validates the raw GBP amount
 * regardless of this endpoint.
 */
function isStale(asOfDate: string): boolean {
  const ageMs = Date.now() - new Date(`${asOfDate}T00:00:00Z`).getTime();
  return ageMs > MAX_RATE_AGE_DAYS * 24 * 60 * 60 * 1000;
}

export async function GET(request: NextRequest) {
  try {
    const currency = request.nextUrl.searchParams.get('currency')?.trim().toLowerCase();
    if (!currency || !/^[a-z]{3}$/.test(currency) || currency === CHARGE_CURRENCY) {
      return NextResponse.json({ available: false });
    }

    const service = createServiceClient();

    const ipHash = hashTipRoomLocalRateIp(extractClientIp(request));
    const rateLimit = await checkTipRoomLocalRateLimit(service, ipHash);
    if (!rateLimit.allowed) {
      return NextResponse.json({ available: false }, { status: 429 });
    }

    const [gbp, target] = await Promise.all([
      getFxRateToUsd(service, CHARGE_CURRENCY),
      getFxRateToUsd(service, currency),
    ]);

    if (!gbp || !target || isStale(gbp.asOfDate) || isStale(target.asOfDate)) {
      return NextResponse.json({ available: false });
    }

    // rate_to_usd is "1 unit of currency = X USD", both against the same
    // USD base -- GBP->target is just the ratio of the two.
    const factor = gbp.rate / target.rate;
    if (!Number.isFinite(factor) || factor <= 0) {
      return NextResponse.json({ available: false });
    }

    return NextResponse.json({ available: true, factor });
  } catch (error) {
    console.error('[tip-room-local-rate]', error);
    return NextResponse.json({ available: false });
  }
}
