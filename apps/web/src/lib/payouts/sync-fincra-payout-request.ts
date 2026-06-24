import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getFincraPayoutStatusByCustomerReference,
  getFincraPayoutStatusByTransferId,
} from '@/src/lib/fincra';
import {
  markPayoutRequestsCompleted,
  markPayoutRequestsFailed,
  normalizeFincraPayoutStatus,
} from '@/src/lib/payouts/fincra-payout-completion';

export type SyncFincraPayoutResult = {
  success: boolean;
  error?: string;
  already_completed?: boolean;
  updated?: boolean;
  fincra_status?: string;
  payout_status?: 'completed' | 'failed' | 'processing';
  message?: string;
  deduction_errors?: string[];
};

type PayoutRequestRow = {
  id: string;
  creator_id: string;
  amount: number;
  currency: string | null;
  status: string;
  stripe_transfer_id: string | null;
  fincra_customer_reference: string | null;
};

async function pollFincraStatus(pr: PayoutRequestRow): Promise<{ status: string; raw: Record<string, unknown> } | null> {
  const attempts: Array<() => Promise<{ status: string; raw: Record<string, unknown> }>> = [];

  if (pr.fincra_customer_reference) {
    const ref = pr.fincra_customer_reference;
    attempts.push(async () => {
      const result = await getFincraPayoutStatusByCustomerReference(ref);
      return { status: result.status, raw: result.raw };
    });
  }

  const transferId = pr.stripe_transfer_id?.trim();
  if (transferId && /^\d+$/.test(transferId)) {
    attempts.push(async () => {
      const result = await getFincraPayoutStatusByTransferId(transferId);
      return { status: result.status, raw: result.raw };
    });
  }

  if (transferId?.startsWith('fincra_')) {
    attempts.push(async () => {
      const result = await getFincraPayoutStatusByCustomerReference(transferId);
      return { status: result.status, raw: result.raw };
    });
  }

  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      console.warn('[sync-fincra-payout] status poll attempt failed:', error);
    }
  }

  return null;
}

export async function syncPayoutRequestFromFincra(
  supabase: SupabaseClient,
  payoutRequestId: string,
): Promise<SyncFincraPayoutResult> {
  const { data: pr, error } = await supabase
    .from('payout_requests')
    .select(
      'id, creator_id, amount, currency, status, stripe_transfer_id, fincra_customer_reference',
    )
    .eq('id', payoutRequestId)
    .single();

  if (error || !pr) {
    return { success: false, error: 'Payout request not found' };
  }

  const row = pr as PayoutRequestRow;

  if (row.status === 'completed') {
    return {
      success: true,
      already_completed: true,
      fincra_status: 'completed',
      payout_status: 'completed',
      message: 'Payout already marked completed.',
    };
  }

  if (row.status !== 'processing') {
    return {
      success: false,
      error: `Cannot sync Fincra status while payout is "${row.status}" (expected processing).`,
    };
  }

  if (!row.stripe_transfer_id && !row.fincra_customer_reference) {
    return {
      success: false,
      error: 'No Fincra transfer reference on file for this payout request.',
    };
  }

  const fincra = await pollFincraStatus(row);
  if (!fincra) {
    return {
      success: false,
      error:
        'Could not fetch payout status from Fincra. Check API credentials and that the transfer id is valid.',
    };
  }

  const outcome = normalizeFincraPayoutStatus(fincra.status);

  if (outcome === 'pending') {
    return {
      success: true,
      updated: false,
      fincra_status: fincra.status,
      payout_status: 'processing',
      message: `Fincra still reports "${fincra.status}". Creator may not have received funds yet.`,
    };
  }

  if (outcome === 'failed') {
    await markPayoutRequestsFailed(
      supabase,
      [row.stripe_transfer_id, row.fincra_customer_reference].filter(Boolean) as string[],
      `Fincra transfer ${fincra.status}`,
    );
    return {
      success: true,
      updated: true,
      fincra_status: fincra.status,
      payout_status: 'failed',
      message: 'Payout marked failed based on Fincra status.',
    };
  }

  const { completed_ids, deduction_errors } = await markPayoutRequestsCompleted(supabase, [row]);

  if (completed_ids.length === 0) {
    return {
      success: false,
      error: 'Fincra reports success but payout request could not be updated.',
      fincra_status: fincra.status,
      deduction_errors,
    };
  }

  return {
    success: true,
    updated: true,
    fincra_status: fincra.status,
    payout_status: 'completed',
    message: 'Payout marked completed from Fincra status; creator wallet deducted.',
    deduction_errors: deduction_errors.length > 0 ? deduction_errors : undefined,
  };
}
