import type { SupabaseClient } from '@supabase/supabase-js';

export type PayoutBalanceDeductionResult = {
  success: boolean;
  already_deducted?: boolean;
  error?: string;
  wallet_balance_available?: number;
  required?: number;
  wallet_transaction_id?: string;
  wallet_balance?: number;
  creator_revenue_deducted?: number;
  currency?: string;
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
  const { creatorId, amount, payoutRequestId, currency = 'USD' } = params;

  const { data, error } = await supabase.rpc('complete_payout_request_balance_deduction', {
    p_creator_id: creatorId,
    p_amount: amount,
    p_payout_request_id: payoutRequestId,
    p_currency: currency,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const result = (data ?? {}) as Record<string, unknown>;
  if (result.success === false) {
    return {
      success: false,
      error: String(result.error ?? 'deduction_failed'),
      wallet_balance_available: Number(result.wallet_balance ?? 0),
      required: Number(result.required ?? amount),
    };
  }

  return {
    success: true,
    already_deducted: Boolean(result.already_deducted),
    wallet_transaction_id: result.wallet_transaction_id as string | undefined,
    wallet_balance: Number(result.wallet_balance ?? 0),
    creator_revenue_deducted: Number(result.creator_revenue_deducted ?? 0),
    currency: String(result.currency ?? currency),
  };
}
