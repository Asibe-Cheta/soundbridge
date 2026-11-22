import type { SupabaseClient } from '@supabase/supabase-js';
import { getFxRateToUsd, type FxRateLookup } from '@/src/lib/fx-rates';

type GetFxRateToUsdFn = (
  supabase: SupabaseClient,
  currency: string,
  asOf?: Date,
) => Promise<FxRateLookup | null>;

/**
 * Idempotent stat row for Tip Room QR tips (mobile counters). Also carries
 * reporting-only USD columns (amount_usd_cents/fx_rate/fx_rate_source/
 * fx_rate_time) -- amount/currency stay the source of truth for the actual
 * charge. If no fx rate is available, the tip is still inserted with those
 * columns null; a payment must never be blocked on FX.
 */
export async function recordTipRoomTipStat(
  service: SupabaseClient,
  params: {
    creatorId: string;
    amount: number;
    currency: string;
    paymentIntentId: string;
  },
  getFxRateToUsdFn: GetFxRateToUsdFn = getFxRateToUsd,
): Promise<void> {
  const tippedAt = new Date();

  let fxRate: FxRateLookup | null = null;
  try {
    fxRate = await getFxRateToUsdFn(service, params.currency, tippedAt);
  } catch (e) {
    console.error('[tip-room-stats] fx rate lookup failed, inserting without USD columns:', e);
  }
  if (!fxRate) {
    console.warn(`[tip-room-stats] no fx rate for ${params.currency}, inserting without USD columns`);
  }

  const { error } = await service.from('tip_room_tips').insert({
    creator_id: params.creatorId,
    amount: params.amount,
    currency: params.currency.toLowerCase(),
    tipped_at: tippedAt.toISOString(),
    stripe_payment_intent_id: params.paymentIntentId,
    ...(fxRate
      ? {
          amount_usd_cents: Math.round(params.amount * fxRate.rate * 100),
          fx_rate: fxRate.rate,
          fx_rate_source: fxRate.source,
          fx_rate_time: `${fxRate.asOfDate}T00:00:00.000Z`,
        }
      : {}),
  });

  if (error) {
    // 23505 = unique violation on tip_room_tips_stripe_pi_uidx (the partial
    // unique index on stripe_payment_intent_id). A duplicate webhook
    // delivery for the same PaymentIntent hits this and is a no-op, not an
    // error -- Postgres won't let ON CONFLICT target a partial index via
    // supabase-js's upsert() helper, so this plain insert + catch is the
    // correct idempotency mechanism here, not a stand-in for one.
    if ((error as { code?: string }).code === '23505') {
      return;
    }
    console.error('[tip-room-stats] insert failed:', error);
  }
}

type FxRateRow = { id: string; currency: string; amount: number; tipped_at: string };

/**
 * Backfills amount_usd_cents/fx_rate/fx_rate_source/fx_rate_time for rows
 * inserted before this column existed. Safe to re-run: only ever selects
 * rows where amount_usd_cents IS NULL, and a row with no available rate is
 * left untouched (picked up again next run, once a rate exists for it).
 */
export async function backfillTipRoomTipsUsd(
  service: SupabaseClient,
  getFxRateToUsdFn: GetFxRateToUsdFn = getFxRateToUsd,
): Promise<{ updated: number; skipped: number }> {
  const { data, error } = await service
    .from('tip_room_tips')
    .select('id, currency, amount, tipped_at')
    .is('amount_usd_cents', null);

  if (error) {
    console.error('[tip-room-stats] backfill select failed:', error);
    return { updated: 0, skipped: 0 };
  }

  const rows = (data || []) as FxRateRow[];
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const fxRate = await getFxRateToUsdFn(service, row.currency, new Date(row.tipped_at));
    if (!fxRate) {
      skipped += 1;
      continue;
    }
    const { error: updateErr } = await service
      .from('tip_room_tips')
      .update({
        amount_usd_cents: Math.round(row.amount * fxRate.rate * 100),
        fx_rate: fxRate.rate,
        fx_rate_source: 'backfill_daily_rate',
        fx_rate_time: `${fxRate.asOfDate}T00:00:00.000Z`,
      })
      .eq('id', row.id)
      .is('amount_usd_cents', null);
    if (updateErr) {
      console.error(`[tip-room-stats] backfill update failed for ${row.id}:`, updateErr);
      skipped += 1;
    } else {
      updated += 1;
    }
  }

  return { updated, skipped };
}
