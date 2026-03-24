import { getWiseClient, type WiseApiError } from './client';
import { wiseConfig } from './config';
import { createRecipient, type SupportedCurrency } from './transfers';
import { createPayoutRecord } from './database';
import { WisePayoutStatus, type WisePayout, type WiseCurrency } from '../types/wise';

export interface WiseBatchGroupPayoutItem {
  payoutRequestId: string; // Used as customerTransactionId for idempotency
  creatorId: string;
  /** Source currency for the quote (e.g. USD) */
  sourceCurrency: 'USD' | 'GBP' | 'EUR';
  /** Source amount in sourceCurrency (what you'll debit from Wise) */
  sourceAmount: number;
  /** Destination currency (bank currency) */
  targetCurrency: 'NGN' | 'GHS' | 'KES';
  bankDetails: {
    accountNumber: string;
    bankCode: string;
    accountHolderName: string;
    bankName?: string | null;
  };
  reason?: string;
}

export interface WiseBatchSubmission {
  batchId: string;
  sourceCurrency: WiseBatchGroupPayoutItem['sourceCurrency'];
  transferCount: number;
  totalSourceAmount: number;
  wiseDashboardUrl: string;
  wisePayoutRows: Array<{ payoutRequestId: string; wisePayout: WisePayout }>;
}

async function resolveWiseProfileId(): Promise<number> {
  const fromConfig = wiseConfig().profileId;
  if (fromConfig) return fromConfig;
  const client = getWiseClient();
  const profiles = await client.get<Array<{ id: number }>>('/v1/profiles');
  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new Error('Wise profile required. Set WISE_PROFILE_ID.');
  }
  return profiles[0].id;
}

function formatBatchGroupName(sourceCurrency: string, count: number): string {
  return `SoundBridge payout batch (${sourceCurrency}) - ${count} items - ${new Date().toISOString()}`;
}

/**
 * Submit payouts as a single Wise Batch Payments group.
 * IMPORTANT: This function only creates the batch + transfers.
 * Funding happens manually in Wise dashboard (semi-automated flow).
 */
export async function submitWiseBatchGroupPayments(
  items: WiseBatchGroupPayoutItem[],
  sourceCurrency: WiseBatchGroupPayoutItem['sourceCurrency']
): Promise<WiseBatchSubmission> {
  if (items.length === 0) {
    throw new Error('No payouts provided for Wise batch submission');
  }

  const client = getWiseClient();
  const profileId = await resolveWiseProfileId();

  // Step 1: Create batch payments group
  const batchGroup = await client.post<{
    id: string;
    status?: string;
    version?: number;
  }>(`/v3/profiles/${profileId}/batch-payments`, {
    name: formatBatchGroupName(sourceCurrency, items.length),
    sourceCurrency,
  });

  // Step 2: Add transfers to batch payments
  // Order matters: Wise returns transferIds in the same sequence.
  const perTransfer: Array<{
    transferId?: string;
    recipientId: string;
    quoteUuid: string;
    destinationAmount: number;
    destinationCurrency: WiseBatchGroupPayoutItem['targetCurrency'];
  }> = [];

  for (const item of items) {
    const recipient = await createRecipient({
      currency: item.targetCurrency as SupportedCurrency,
      accountNumber: item.bankDetails.accountNumber,
      bankCode: item.bankDetails.bankCode,
      accountHolderName: item.bankDetails.accountHolderName,
    });

    // Quote is profile-scoped in v3
    const quote = await client.post<{
      id: string | number;
      targetAmount?: number;
      sourceAmount?: number;
      rate?: number;
    }>(`/v3/profiles/${profileId}/quotes`, {
      sourceCurrency,
      sourceAmount: item.sourceAmount,
      targetCurrency: item.targetCurrency,
    });

    const quoteUuid = typeof quote.id === 'number' ? String(quote.id) : quote.id;
    if (!quoteUuid) {
      throw { error: 'Quote creation failed', message: 'Missing quote id' } as WiseApiError;
    }

    const targetAccountId =
      typeof (recipient as any).id === 'string'
        ? parseInt((recipient as any).id, 10)
        : (recipient as any).id;

    if (Number.isNaN(targetAccountId)) {
      throw { error: 'Invalid recipient id', message: 'Recipient ID must be an integer for batch transfers' } as WiseApiError;
    }

    const refShort = item.payoutRequestId.slice(0, 8);
    const details = {
      sourceOfFunds: 'verification.source.of.funds.other',
      transferPurpose: 'verification.transfers.purpose.pay.bills',
      // Wise requires a transfer purpose sub-purpose for this endpoint; use the example value from docs.
      transferPurposeSubTransferPurpose: 'verification.sub.transfers.purpose.pay.interpretation.service',
      reference: `SoundBridge payout ${refShort}`,
    };

    const transferResp = await client.post<{ id?: string | number }>(
      `/v3/profiles/${profileId}/batch-payments/${batchGroup.id}/transfers`,
      {
      customerTransactionId: item.payoutRequestId,
      quoteUuid: String(quoteUuid),
      targetAccount: targetAccountId,
      details,
      }
    );

    perTransfer.push({
      transferId: transferResp?.id != null ? String(transferResp.id) : undefined,
      recipientId: String((recipient as any).id),
      quoteUuid: String(quoteUuid),
      destinationAmount: Number(quote.targetAmount ?? 0),
      destinationCurrency: item.targetCurrency,
    });
  }

  // Step 3: Persist wise_payouts rows; admin funds batch manually in Wise dashboard.
  const wisePayouts = await Promise.all(
    items.map(async (item, idx) => {
      const t = perTransfer[idx];

      const reference = `payout_${item.payoutRequestId}_${Date.now()}`;

      const wisePayout = await createPayoutRecord({
        creator_id: item.creatorId,
        amount: t.destinationAmount,
        currency: t.destinationCurrency as WiseCurrency,
        wise_transfer_id: t.transferId ?? null,
        wise_recipient_id: t.recipientId,
        wise_quote_id: t.quoteUuid,
        status: WisePayoutStatus.PENDING,
        recipient_account_number: item.bankDetails.accountNumber,
        recipient_account_name: item.bankDetails.accountHolderName,
        recipient_bank_name: item.bankDetails.bankName ?? null,
        recipient_bank_code: item.bankDetails.bankCode,
        reference,
        customer_transaction_id: item.payoutRequestId,
        source_amount: item.sourceAmount,
        source_currency: item.sourceCurrency,
        metadata: {
          wise_batch_id: batchGroup.id,
          wise_batch_status: batchGroup.status ?? 'pending_batch',
          wise_dashboard_url: `https://wise.com/home`,
          manual_funding_required: true,
        },
      });

      return { payoutRequestId: item.payoutRequestId, wisePayout };
    })
  );

  return {
    batchId: batchGroup.id,
    sourceCurrency,
    transferCount: items.length,
    totalSourceAmount: items.reduce((sum, i) => sum + Number(i.sourceAmount || 0), 0),
    wiseDashboardUrl: 'https://wise.com/home',
    wisePayoutRows: wisePayouts,
  };
}

