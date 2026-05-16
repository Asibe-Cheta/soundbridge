import type { SupabaseClient } from '@supabase/supabase-js';

export type PayoutBalanceDeductionResult = {
  success: boolean;
  already_deducted?: boolean;
  wallet_balance?: number;
  wallet_transaction_id?: string;
  creator_revenue_deducted?: number;
  currency?: string;
  error?: string;
  wallet_balance_available?: number;
  required?: number;
};

export async function completePayoutRequestBalanceDeduction(
  supabase: SupabaseClient,
  params: {
    creatorId: string;
    amount: number;
    payoutRequestId: string;
    currency?: string;
  },
): Promise<PayoutBalanceDeductionResult> {
  const { data, error } = await supabase.rpc('complete_payout_request_balance_deduction', {
    p_creator_id: params.creatorId,
    p_amount: Number(params.amount),
    p_payout_request_id: params.payoutRequestId,
    p_currency: (params.currency ?? 'USD').toUpperCase(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const row = (data ?? {}) as Record<string, unknown>;
  return {
    success: row.success === true,
    already_deducted: row.already_deducted === true,
    wallet_balance: row.wallet_balance != null ? Number(row.wallet_balance) : undefined,
    wallet_transaction_id:
      typeof row.wallet_transaction_id === 'string' ? row.wallet_transaction_id : undefined,
    creator_revenue_deducted:
      row.creator_revenue_deducted != null ? Number(row.creator_revenue_deducted) : undefined,
    currency: typeof row.currency === 'string' ? row.currency : undefined,
    error: typeof row.error === 'string' ? row.error : undefined,
    wallet_balance_available:
      row.wallet_balance != null && row.success === false
        ? Number(row.wallet_balance)
        : undefined,
    required: row.required != null ? Number(row.required) : undefined,
  };
}
