import type { SupabaseClient } from '@supabase/supabase-js';

export const AI_ADVISER_CREDIT_AMOUNT_MINOR = 199;
export const AI_ADVISER_CREDIT_CURRENCY = 'gbp';
export const AI_ADVISER_CREDITS_PER_PURCHASE = 5;
export const AI_ADVISER_CREDIT_METADATA_TYPE = 'ai_adviser_credits';

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getCurrentBillingPeriod(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function ensureCurrentUsageRow(
  service: SupabaseClient,
  creatorId: string,
): Promise<{ id: string; analyses_used: number }> {
  const { start, end } = getCurrentBillingPeriod();

  const { data: existing, error: fetchErr } = await service
    .from('ai_adviser_usage')
    .select('id, analyses_used')
    .eq('creator_id', creatorId)
    .eq('billing_period_start', start)
    .maybeSingle();

  if (fetchErr) {
    throw new Error(fetchErr.message);
  }

  if (existing) {
    return existing;
  }

  const { data: inserted, error: insertErr } = await service
    .from('ai_adviser_usage')
    .insert({
      creator_id: creatorId,
      billing_period_start: start,
      billing_period_end: end,
    })
    .select('id, analyses_used')
    .single();

  if (insertErr || !inserted) {
    throw new Error(insertErr?.message || 'Failed to create usage row');
  }

  return inserted;
}

export async function creditAnalysesForCreator(
  service: SupabaseClient,
  creatorId: string,
  credits: number,
): Promise<number> {
  const row = await ensureCurrentUsageRow(service, creatorId);
  const { start } = getCurrentBillingPeriod();
  const nextUsed = Math.max(0, Number(row.analyses_used) - credits);

  const { error: updateErr } = await service
    .from('ai_adviser_usage')
    .update({
      analyses_used: nextUsed,
      updated_at: new Date().toISOString(),
    })
    .eq('creator_id', creatorId)
    .eq('billing_period_start', start);

  if (updateErr) {
    throw new Error(updateErr.message);
  }

  return nextUsed;
}
