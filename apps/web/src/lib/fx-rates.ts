import type { SupabaseClient } from '@supabase/supabase-js';

export type FxRateLookup = { rate: number; source: string; asOfDate: string };

/**
 * USD is the reporting base currency, so a USD lookup is always 1 by
 * definition — no table hit needed. Everything else is looked up from
 * fx_rates_daily, refreshed by app/api/cron/refresh-fx-rates. Returns null
 * (never throws) when no rate is available — callers must treat that as
 * "report without a USD figure," not as a reason to fail the caller's own
 * operation.
 */
export async function getFxRateToUsd(
  supabase: SupabaseClient,
  currency: string,
  asOf: Date = new Date(),
): Promise<FxRateLookup | null> {
  const lower = currency.toLowerCase();
  const asOfDateStr = asOf.toISOString().slice(0, 10);
  if (lower === 'usd') {
    return { rate: 1, source: 'identity', asOfDate: asOfDateStr };
  }

  try {
    const { data, error } = await supabase
      .from('fx_rates_daily')
      .select('rate_to_usd, as_of_date')
      .eq('currency', lower)
      .lte('as_of_date', asOfDateStr)
      .order('as_of_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    const rate = Number((data as { rate_to_usd: unknown }).rate_to_usd);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    return { rate, source: 'fx_rates_daily', asOfDate: (data as { as_of_date: string }).as_of_date };
  } catch {
    return null;
  }
}

export async function upsertFxRateToUsd(
  supabase: SupabaseClient,
  currency: string,
  rateToUsd: number,
  asOfDate: string,
): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('fx_rates_daily')
    .upsert(
      { currency: currency.toLowerCase(), rate_to_usd: rateToUsd, as_of_date: asOfDate },
      { onConflict: 'currency,as_of_date' },
    );
  return { error };
}
