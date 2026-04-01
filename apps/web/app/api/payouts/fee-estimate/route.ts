/**
 * GET /api/payouts/fee-estimate?amount=40&source_currency=USD&target_currency=NGN
 * Returns Fincra flat payout fee estimate.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { isFincraCurrency } from '@/src/lib/fincra';

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
  provider: 'fincra';
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

    const sourceAmount = Math.round(amount * 100) / 100;
    if (!isFincraCurrency(targetCurrency)) {
      return NextResponse.json(
        { error: `Target currency ${targetCurrency} is not supported for Fincra payout estimates` },
        { status: 400 }
      );
    }
    const feeByCurrency: Record<string, number> = {
      NGN: 50,
      GHS: 18,
      KES: 100,
    };
    const fee = feeByCurrency[targetCurrency] ?? 0;
    const rate = 1;
    const targetAmount = sourceAmount;
    const netAmount = sourceAmount - fee;
    const feePct = sourceAmount > 0 ? (fee / sourceAmount) * 100 : 0;

    const data: FeeEstimateResponse = {
      source_amount: sourceAmount,
      source_currency: sourceCurrency,
      target_currency: targetCurrency,
      transfer_fee_usd: fee,
      net_amount_usd: netAmount,
      estimated_target_amount: Math.round(targetAmount),
      exchange_rate: rate,
      fee_percentage: Math.round(feePct * 10) / 10,
      provider: 'fincra',
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
