/**
 * Wise API Integration
 * 
 * Complete Wise API client for transfers, account verification, recipient management,
 * and payout tracking.
 * 
 * @example
 * ```typescript
 * import { createTransfer, resolveAccount, getTransferStatus, createPayoutRecord } from '@/src/lib/wise';
 * 
 * // Verify account before transfer
 * const account = await resolveAccount({
 *   accountNumber: '1234567890',
 *   bankCode: '044',
 *   currency: 'NGN'
 * });
 * 
 * // Create payout record
 * const payout = await createPayoutRecord({
 *   creator_id: 'user-123',
 *   amount: 50000,
 *   currency: 'NGN',
 *   recipient_account_number: '1234567890',
 *   recipient_account_name: 'John Doe',
 *   recipient_bank_code: '044',
 *   reference: 'payout-abc-xyz'
 * });
 * 
 * // Create transfer
 * const transfer = await createTransfer({
 *   targetCurrency: 'NGN',
 *   targetAmount: 50000,
 *   recipientId: 'recipient-123',
 *   reference: payout.reference
 * });
 * 
 * // Update payout with transfer ID
 * await updatePayoutStatus(payout.id, {
 *   wise_transfer_id: transfer.id,
 *   status: 'processing'
 * });
 * ```
 */

// Client
export { WiseClient, getWiseClient, type WiseApiError } from './client';

// Config
export { wiseConfig, getWiseConfig, resetWiseConfig, type WiseConfig } from './config';

// Transfers and Account Verification
export {
  createTransfer,
  getTransferStatus,
  resolveAccount,
  createRecipient,
  getBankName,
  validateBankCode,
  NIGERIAN_BANK_CODES,
  GHANAIAN_BANK_CODES,
  KENYAN_BANK_CODES,
  type CreateTransferParams,
  type Transfer,
  type TransferStatus,
  type ResolveAccountParams,
  type ResolvedAccount,
  type CreateRecipientParams,
  type Recipient,
  type SupportedCurrency,
} from './transfers';

// Database functions
export {
  createPayoutRecord,
  updatePayoutStatus,
  getPayoutById,
  getPayoutByWiseTransferId,
  getPayoutByReference,
  getCreatorPayouts,
  getPendingPayouts,
  getCreatorPayoutStats,
} from './database';

// Payout functions
export {
  payoutToCreator,
  checkPayoutStatus,
  syncPayoutStatus,
  type PayoutToCreatorParams,
  type PayoutResult,
} from './payout';

// Batch payout functions
export {
  batchPayout,
  batchPayoutWithProgress,
  type BatchPayoutItem,
  type BatchPayoutResult,
} from './batch-payout';

