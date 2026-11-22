/**
 * Vercel Cron: refresh fx_rates_daily
 * Reporting-only currency rates (e.g. tip_room_tips.amount_usd_cents).
 * Never used for anything that charges money.
 *
 * GET /api/cron/refresh-fx-rates
 * Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { upsertFxRateToUsd } from '@/src/lib/fx-rates';

// Tip Room only charges in GBP today. Add a currency here if that changes.
const RATES_TO_REFRESH = ['gbp'];
const EXCHANGE_RATE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[cron refresh-fx-rates] CRON_SECRET not set');
      return NextResponse.json({ error: 'Cron job not configured' }, { status: 500 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await fetch(EXCHANGE_RATE_API_URL);
    if (!res.ok) {
      console.error('[cron refresh-fx-rates] exchangerate-api fetch failed:', res.status);
      return NextResponse.json({ error: 'FX source unavailable' }, { status: 502 });
    }
    const data = (await res.json().catch(() => null)) as { rates?: Record<string, number> } | null;
    const rates = data?.rates || {};

    const supabase = createServiceClient();
    const asOfDate = new Date().toISOString().slice(0, 10);
    const updated: string[] = [];
    const skipped: string[] = [];

    for (const currency of RATES_TO_REFRESH) {
      // exchangerate-api's rates are "1 USD = X <currency>"; we store the
      // inverse, "1 <currency> = Y USD", to match how amount_usd_cents is computed.
      const usdPerUnit = rates[currency.toUpperCase()];
      if (!usdPerUnit || !Number.isFinite(usdPerUnit) || usdPerUnit <= 0) {
        console.warn(`[cron refresh-fx-rates] no usable rate for ${currency}`);
        skipped.push(currency);
        continue;
      }
      const rateToUsd = 1 / usdPerUnit;
      const { error } = await upsertFxRateToUsd(supabase, currency, rateToUsd, asOfDate);
      if (error) {
        console.error(`[cron refresh-fx-rates] upsert failed for ${currency}:`, error);
        skipped.push(currency);
      } else {
        updated.push(currency);
      }
    }

    return NextResponse.json({ success: true, asOfDate, updated, skipped });
  } catch (error) {
    console.error('[cron refresh-fx-rates]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
