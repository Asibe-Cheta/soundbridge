/**
 * GET /api/payouts/bank-options?currency=NGN
 *
 * Proxies Wise GET /v1/account-requirements for the given currency and returns
 * the Wise recipient type and bank list (Wise internal codes) for that currency.
 * Required for correct payout recipient creation (Wise expects its own bank codes).
 *
 * @see WEB_TEAM_WISE_BANK_OPTIONS_ENDPOINT.md.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { getWiseClient } from '@/src/lib/wise/client';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map<
  string,
  { data: { currency: string; wise_type: string; banks: Array<{ name: string; code: string }> }; expires: number }
>();

function getCached(currency: string): { currency: string; wise_type: string; banks: Array<{ name: string; code: string }> } | null {
  const entry = cache.get(currency.toUpperCase());
  if (!entry || Date.now() > entry.expires) return null;
  return entry.data;
}

function setCache(currency: string, data: { currency: string; wise_type: string; banks: Array<{ name: string; code: string }> }) {
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

    const cached = getCached(currency);
    if (cached) {
      return NextResponse.json(cached, { status: 200 });
    }

    const client = getWiseClient();
    const endpoint = `/v1/account-requirements?source=USD&target=${encodeURIComponent(currency)}&sourceAmount=100`;
    const raw = await client.get<unknown>(endpoint);
    const requirements = Array.isArray(raw) ? raw : raw && typeof raw === 'object' && 'type' in raw ? [raw] : [];
    type ReqItem = { type: string; fields?: Array<{ group?: Array<{ key: string; valuesAllowed?: Array<{ name: string; key: string }> }> }> };
    const primary = (requirements as ReqItem[])[0];

    if (!primary?.type) {
      return NextResponse.json(
        { error: `No account requirements found for currency ${currency}` },
        { status: 404 }
      );
    }
    const wiseType = primary.type;

    const allGroups = (primary.fields ?? []).flatMap((f) => f.group ?? []);
    const bankCodeField = allGroups.find((g) => g.key === 'bankCode');
    const banks = (bankCodeField?.valuesAllowed ?? []).map((v) => ({
      name: v.name ?? v.key ?? '',
      code: v.key ?? '',
    }));

    const data = { currency, wise_type: wiseType, banks };
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
