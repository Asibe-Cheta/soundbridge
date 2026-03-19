/**
 * GET /api/payouts/fee-estimate?amount=40&source_currency=USD&target_currency=NGN
 * Returns Wise quote for transfer fee (WEB_TEAM_PAYOUT_MINIMUM_AND_FEE_TRANSPARENCY.md).
 * Cache: 5 minutes in-memory per amount/source/target.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { getWiseClient } from '@/src/lib/wise';
import { wiseConfig } from '@/src/lib/wise/config';

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { data: FeeEstimateResponse; cachedAt: number }>();

export interface FeeEstimateResponse {
  source_amount: number;
  source_currency: string;
  target_currency: string;
  transfer_fee_usd: number;
  net_amount_usd: number;
  estimated_target_amount: number;
  exchange_rate: number;
  fee_percentage: number;
  provider: 'wise';
}

async function getProfileId(): Promise<number> {
  const fromConfig = wiseConfig().profileId;
  if (fromConfig) return fromConfig;
  const client = getWiseClient();
  const profiles = await client.get<Array<{ id: number }>>('/v1/profiles');
  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new Error('Wise profile required. Set WISE_PROFILE_ID or ensure token has a profile.');
  }
  return profiles[0].id;
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const amount = parseFloat(searchParams.get('amount') ?? '');
    const sourceCurrency = (searchParams.get('source_currency') ?? 'USD').toUpperCase();
    const targetCurrency = (searchParams.get('target_currency') ?? 'NGN').toUpperCase();

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Query parameter amount (positive number) is required' },
        { status: 400 }
      );
    }

    const cacheKey = `${amount}-${sourceCurrency}-${targetCurrency}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    let client;
    try {
      client = getWiseClient();
    } catch {
      return NextResponse.json(
        { error: 'Wise is not configured. Fee estimate unavailable.' },
        { status: 503 }
      );
    }

    const profileId = await getProfileId();
    const sourceAmount = Math.round(amount * 100) / 100;
    const quote = await client.post<{
      fee?: number;
      rate?: number;
      sourceAmount?: number;
      targetAmount?: number;
      paymentOptions?: Array<{ fee?: number; feePercentage?: number }>;
    }>(`/v3/profiles/${profileId}/quotes`, {
      sourceCurrency,
      sourceAmount,
      targetCurrency,
    });

    const fee = Number(quote?.fee ?? quote?.paymentOptions?.[0]?.fee ?? 0);
    const rate = Number(quote?.rate ?? 0);
    const targetAmount = Number(quote?.targetAmount ?? 0);
    const netAmount = sourceAmount - fee;
    const feePct = sourceAmount > 0 ? (fee / sourceAmount) * 100 : 0;

    const data: FeeEstimateResponse = {
      source_amount: sourceAmount,
      source_currency: sourceCurrency,
      target_currency: targetCurrency,
      transfer_fee_usd: sourceCurrency === 'USD' ? fee : fee, // Wise may return fee in source currency
      net_amount_usd: sourceCurrency === 'USD' ? netAmount : netAmount,
      estimated_target_amount: Math.round(targetAmount),
      exchange_rate: rate,
      fee_percentage: Math.round(feePct * 10) / 10,
      provider: 'wise',
    };
    cache.set(cacheKey, { data, cachedAt: Date.now() });
    return NextResponse.json(data);
  } catch (e) {
    console.error('Fee estimate error:', e);
    return NextResponse.json(
      { error: (e instanceof Error ? e.message : 'Failed to get fee estimate') },
      { status: 500 }
    );
  }
}
