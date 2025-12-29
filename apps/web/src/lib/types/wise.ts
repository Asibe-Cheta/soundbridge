/**
 * Wise API Types
 * 
 * TypeScript types for Wise payouts, transfers, and webhook events.
 */

import type { Json } from '../types';

// ============================================================================
// PAYOUT TYPES
// ============================================================================

/**
 * Wise payout status enum
 */
export enum WisePayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

/**
 * Supported currencies for Wise payouts
 */
export type WiseCurrency = 'NGN' | 'GHS' | 'KES' | 'USD' | 'GBP' | 'EUR';

/**
 * Wise payout record from database
 * Updated to match mobile team's schema additions
 */
export interface WisePayout {
  id: string;
  creator_id: string;
  amount: number;
  currency: WiseCurrency;
  wise_transfer_id: string | null;
  wise_recipient_id: string | null;
  wise_quote_id: string | null;
  status: WisePayoutStatus;
  recipient_account_number: string | null;
  recipient_account_name: string | null;
  recipient_bank_name: string | null;
  recipient_bank_code: string | null;
  reference: string;
  customer_transaction_id: string | null;
  exchange_rate: number | null;
  source_amount: number | null;
  source_currency: string | null;
  wise_fee: number | null;
  error_message: string | null;
  error_code: string | null;
  wise_response: Json;
  wise_status_history: Json;
  metadata: Json;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  failed_at: string | null;
  deleted_at: string | null;
}

/**
 * Create payout record parameters
 */
export interface CreateWisePayoutParams {
  creator_id: string;
  amount: number;
  currency: WiseCurrency;
  recipient_account_number: string;
  recipient_account_name: string;
  recipient_bank_code: string;
  recipient_bank_name?: string;
  reference: string;
  customer_transaction_id?: string;
  wise_transfer_id?: string;
  wise_recipient_id?: string;
  wise_quote_id?: string;
  status?: WisePayoutStatus;
  source_amount?: number;
  source_currency?: string;
  exchange_rate?: number;
  wise_fee?: number;
  wise_response?: Json;
  metadata?: Json;
}

/**
 * Update payout status parameters
 */
export interface UpdateWisePayoutParams {
  status?: WisePayoutStatus;
  wise_transfer_id?: string;
  wise_recipient_id?: string;
  wise_quote_id?: string;
  error_message?: string | null;
  error_code?: string | null;
  wise_response?: Json;
  exchange_rate?: number;
  source_amount?: number;
  source_currency?: string;
  wise_fee?: number;
  metadata?: Json;
  completed_at?: string | null;
  failed_at?: string | null;
}

/**
 * Payout filters for querying
 */
export interface WisePayoutFilters {
  status?: WisePayoutStatus | WisePayoutStatus[];
  currency?: WiseCurrency;
  created_after?: string;
  created_before?: string;
  min_amount?: number;
  max_amount?: number;
}

// ============================================================================
// TRANSFER TYPES (from Wise API)
// ============================================================================

/**
 * Wise transfer status enum
 * Based on Wise API transfer states
 */
export enum WiseTransferStatus {
  INCOMING_PAYMENT_WAITING = 'incoming_payment_waiting',
  PROCESSING = 'processing',
  FUNDS_CONVERTED = 'funds_converted',
  OUTGOING_PAYMENT_SENT = 'outgoing_payment_sent',
  BOUNCED_BACK = 'bounced_back',
  FUNDS_REFUNDED = 'funds_refunded',
  CANCELLED = 'cancelled',
  CHARGED_BACK = 'charged_back',
}

/**
 * Wise transfer object from API
 */
export interface WiseTransfer {
  id: string;
  status: WiseTransferStatus;
  targetCurrency: string;
  targetValue: number;
  sourceCurrency?: string;
  sourceValue?: number;
  rate?: number;
  createdTime?: string;
  completedTime?: string;
  reference?: string;
  recipientId?: string;
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

/**
 * Wise webhook event types
 */
export enum WiseWebhookEventType {
  TRANSFER_STATE_CHANGE = 'transfers#state-change',
  TRANSFER_ISSUE = 'transfers#issue',
  TRANSFER_PROCESSING_FAILED = 'transfers#processing-failed',
  TRANSFER_FUNDS_REFUNDED = 'transfers#funds-refunded',
  ACCOUNT_DEPOSIT = 'balances#credit',
}

/**
 * Base webhook payload structure
 */
export interface WiseWebhookPayload {
  event_type: WiseWebhookEventType | string;
  data: {
    resourceId: string;
    current_state?: string;
    previous_state?: string;
    occurred_at?: string;
    [key: string]: any;
  };
  subscription_id?: string;
  occurred_at?: string;
}

/**
 * Transfer state change webhook payload
 */
export interface WiseTransferStateChangePayload extends WiseWebhookPayload {
  event_type: WiseWebhookEventType.TRANSFER_STATE_CHANGE;
  data: {
    resourceId: string;
    current_state: WiseTransferStatus;
    previous_state: WiseTransferStatus;
    occurred_at: string;
  };
}

/**
 * Transfer issue webhook payload
 */
export interface WiseTransferIssuePayload extends WiseWebhookPayload {
  event_type: WiseWebhookEventType.TRANSFER_ISSUE;
  data: {
    resourceId: string;
    type: string;
    code: string;
    message?: string;
    occurred_at: string;
  };
}

/**
 * Account deposit webhook payload
 */
export interface WiseAccountDepositPayload extends WiseWebhookPayload {
  event_type: WiseWebhookEventType.ACCOUNT_DEPOSIT;
  data: {
    resourceId: string;
    amount: {
      value: number;
      currency: string;
    };
    profileId: string;
    occurred_at: string;
  };
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Map Wise transfer status to payout status
 * 
 * Status mapping:
 * - incoming_payment_waiting → processing
 * - processing → processing
 * - funds_converted → processing
 * - outgoing_payment_sent → completed (money sent to recipient)
 * - bounced_back → failed
 * - funds_refunded → failed
 * - charged_back → failed
 * - cancelled → cancelled
 */
export function mapWiseTransferStatusToPayoutStatus(
  transferStatus: WiseTransferStatus | string
): WisePayoutStatus {
  // Normalize status to lowercase for comparison
  const normalizedStatus = transferStatus.toLowerCase();

  switch (normalizedStatus) {
    case 'incoming_payment_waiting':
    case 'processing':
    case 'funds_converted':
      return WisePayoutStatus.PROCESSING;
    
    case 'outgoing_payment_sent':
    case 'completed':
      // When Wise sends "outgoing_payment_sent", the transfer is complete
      return WisePayoutStatus.COMPLETED;
    
    case 'bounced_back':
    case 'funds_refunded':
    case 'charged_back':
      return WisePayoutStatus.FAILED;
    
    case 'cancelled':
    case 'canceled':
      return WisePayoutStatus.CANCELLED;
    
    default:
      // Unknown status - default to processing to be safe
      console.warn(`⚠️ Unknown Wise transfer status: ${transferStatus}, defaulting to processing`);
      return WisePayoutStatus.PROCESSING;
  }
}

/**
 * Check if payout status is terminal (won't change)
 */
export function isTerminalPayoutStatus(status: WisePayoutStatus): boolean {
  return status === WisePayoutStatus.COMPLETED ||
         status === WisePayoutStatus.FAILED ||
         status === WisePayoutStatus.CANCELLED;
}

