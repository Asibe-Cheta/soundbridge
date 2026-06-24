import type { SupabaseClient } from '@supabase/supabase-js';
import { completePayoutRequestBalanceDeduction } from '@/src/lib/payouts/complete-payout-request-balance';

export type FincraPayoutOutcome = 'completed' | 'failed' | 'pending';

export function normalizeFincraPayoutStatus(status: string): FincraPayoutOutcome {
  const s = String(status || '').toLowerCase();
  if (
    s.includes('successful') ||
    s.includes('success') ||
    s === 'completed' ||
    s === 'paid' ||
    s === 'settled'
  ) {
    return 'completed';
  }
  if (s.includes('failed') || s === 'error' || s === 'cancelled' || s === 'canceled') {
    return 'failed';
  }
  return 'pending';
}

export function extractFincraReferencesFromWebhookPayload(payload: Record<string, unknown>): string[] {
  const data = (payload.data as Record<string, unknown> | undefined) ?? {};
  const candidates = [
    payload.reference,
    data.reference,
    data.customerReference,
    data.id,
    payload.id,
    data.transferId,
  ]
    .filter((value) => value != null && String(value).trim().length > 0)
    .map((value) => String(value).trim());
  return [...new Set(candidates)];
}

type PayoutRequestRow = {
  id: string;
  creator_id: string;
  amount: number;
  currency: string | null;
  status: string;
};

export async function findPayoutRequestsByFincraReferences(
  supabase: SupabaseClient,
  references: string[],
): Promise<PayoutRequestRow[]> {
  const refs = [...new Set(references.filter(Boolean))];
  if (refs.length === 0) return [];

  const orFilter = refs
    .flatMap((ref) => [`stripe_transfer_id.eq.${ref}`, `fincra_customer_reference.eq.${ref}`])
    .join(',');

  const { data, error } = await supabase
    .from('payout_requests')
    .select('id, creator_id, amount, currency, status')
    .or(orFilter);

  if (error) {
    console.error('[fincra payout] lookup failed:', error);
    return [];
  }

  return (data ?? []) as PayoutRequestRow[];
}

export async function markPayoutRequestsCompleted(
  supabase: SupabaseClient,
  rows: PayoutRequestRow[],
): Promise<{ completed_ids: string[]; deduction_errors: string[] }> {
  const completedAt = new Date().toISOString();
  const completedIds: string[] = [];
  const deductionErrors: string[] = [];

  for (const pr of rows) {
    if (pr.status === 'completed') {
      completedIds.push(pr.id);
      continue;
    }

    const { error: updateError } = await supabase
      .from('payout_requests')
      .update({
        status: 'completed',
        completed_at: completedAt,
        updated_at: completedAt,
        rejection_reason: null,
      })
      .eq('id', pr.id);

    if (updateError) {
      deductionErrors.push(`${pr.id}: ${updateError.message}`);
      continue;
    }

    const deduct = await completePayoutRequestBalanceDeduction(supabase, {
      creatorId: pr.creator_id,
      amount: Number(pr.amount),
      payoutRequestId: pr.id,
      currency: String(pr.currency ?? 'USD'),
    });

    if (!deduct.success && !deduct.already_deducted) {
      deductionErrors.push(`${pr.id}: ${deduct.error ?? 'wallet deduction failed'}`);
    }

    completedIds.push(pr.id);
  }

  return { completed_ids: completedIds, deduction_errors: deductionErrors };
}

export async function markPayoutRequestsFailed(
  supabase: SupabaseClient,
  references: string[],
  failureReason: string,
): Promise<void> {
  const refs = [...new Set(references.filter(Boolean))];
  if (refs.length === 0) return;

  const completedAt = new Date().toISOString();
  const orFilter = refs
    .flatMap((ref) => [`stripe_transfer_id.eq.${ref}`, `fincra_customer_reference.eq.${ref}`])
    .join(',');

  await supabase
    .from('payout_requests')
    .update({
      status: 'failed',
      rejection_reason: failureReason,
      updated_at: completedAt,
    })
    .or(orFilter);
}
