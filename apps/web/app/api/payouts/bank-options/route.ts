/**
 * GET /api/payouts/bank-options?currency=NGN
 *
 * Returns Fincra bank list for the given currency.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { getFincraBanks, isFincraCurrency } from '@/src/lib/fincra';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map<
  string,
  { data: { currency: string; provider: 'fincra'; banks: Array<{ name: string; code: string }> }; expires: number }
>();

function getCached(currency: string): { currency: string; provider: 'fincra'; banks: Array<{ name: string; code: string }> } | null {
  const entry = cache.get(currency.toUpperCase());
  if (!entry || Date.now() > entry.expires) return null;
  return entry.data;
}

function setCache(currency: string, data: { currency: string; provider: 'fincra'; banks: Array<{ name: string; code: string }> }) {
  cache.set(currency.toUpperCase(), { data, expires: Date.now() + CACHE_TTL_MS });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getSupabaseRouteClient(request, true);
    const { user, error: authError } = auth;
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency')?.trim()?.toUpperCase();
    if (!currency) {
      return NextResponse.json({ error: 'currency query parameter is required' }, { status: 400 });
    }
    if (!isFincraCurrency(currency)) {
      return NextResponse.json({ error: `Unsupported currency for Fincra bank options: ${currency}` }, { status: 400 });
    }

    const cached = getCached(currency);
    if (cached) {
      return NextResponse.json(cached, { status: 200 });
    }

    const banks = await getFincraBanks(currency);
    const data = { currency, provider: 'fincra' as const, banks };
    setCache(currency, data);
    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to fetch bank options';
    console.error('GET /api/payouts/bank-options error:', err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
