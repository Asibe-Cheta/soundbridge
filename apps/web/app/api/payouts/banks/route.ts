/**
 * GET /api/payouts/banks
 * Nigerian / African banks for withdrawal UI (WEB_TEAM_FINCRA_INTEGRATION.MD).
 *
 * Query: country=NG | currency=NGN (default NG banks for mobile).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import {
  fincraCountryForCurrency,
  getFincraBanks,
  getFincraBanksByCountry,
  inferCurrencyFromAfricanCountry,
  isFincraCurrency,
  type FincraCurrency,
} from '@/src/lib/fincra';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<
  string,
  { data: { country: string; provider: 'fincra'; banks: Array<{ name: string; code: string }> }; expires: number }
>();

function cacheKey(country: string) {
  return country.toUpperCase();
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getSupabaseRouteClient(request, true);
    const { user, error: authError } = auth;
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const countryParam = searchParams.get('country')?.trim().toUpperCase();
    const currencyParam = searchParams.get('currency')?.trim().toUpperCase();

    const country = (countryParam && /^[A-Z]{2}$/.test(countryParam) ? countryParam : null) ?? null;
    const currency = currencyParam && isFincraCurrency(currencyParam) ? (currencyParam as FincraCurrency) : null;
    const resolvedCountry = country ?? (currency ? fincraCountryForCurrency(currency) : 'NG');
    const key = cacheKey(`${resolvedCountry}:${currency ?? 'country'}`);
    const hit = cache.get(key);
    if (hit && Date.now() < hit.expires) {
      return NextResponse.json(hit.data, { status: 200 });
    }

    // If mobile sends a specific country, query Fincra by country directly (Africa-wide).
    const banks = country ? await getFincraBanksByCountry(resolvedCountry) : await getFincraBanks(currency ?? 'NGN');
    const inferred = inferCurrencyFromAfricanCountry(resolvedCountry);
    const data = {
      country: resolvedCountry,
      currency: currency ?? inferred ?? null,
      provider: 'fincra' as const,
      banks,
    };
    cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    const message =
      err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to fetch banks';
    console.error('GET /api/payouts/banks error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
