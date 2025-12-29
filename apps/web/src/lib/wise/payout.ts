/**
 * Wise Payout Functions
 * 
 * Main functions for sending money to creators via Wise API.
 * Handles account verification, recipient creation, transfer creation, and database storage.
 */

import { createServiceClient } from '../supabase';
import {
  resolveAccount,
  createRecipient,
  createTransfer,
  getTransferStatus,
  type SupportedCurrency,
  type ResolvedAccount,
  type Recipient,
  type Transfer,
} from './transfers';
import {
  createPayoutRecord,
  updatePayoutStatus,
  getPayoutByReference,
} from './database';
import type {
  WisePayout,
  WisePayoutStatus,
  WiseCurrency,
} from '../types/wise';
import { WiseApiError } from './client';

// ============================================================================
// TYPES
// ============================================================================

export interface PayoutToCreatorParams {
  creatorId: string;
  amount: number;
  currency: 'NGN' | 'GHS' | 'KES';
  bankAccountNumber: string;
  bankCode: string;
  accountHolderName: string;
  reason?: string;
  sourceCurrency?: 'GBP' | 'USD' | 'EUR'; // Default: GBP
}

export interface PayoutResult {
  success: boolean;
  payout?: WisePayout;
  error?: string;
  transferId?: string;
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @returns Result of the function
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on permanent errors
      if (isPermanentError(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`⚠️ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Retry exhausted');
}

/**
 * Check if error is permanent (should not retry)
 */
function isPermanentError(error: any): boolean {
  // Invalid bank account - don't retry
  if (error.message?.includes('Invalid account') || 
      error.message?.includes('Account verification failed') ||
      error.message?.includes('Account not found')) {
    return true;
  }

  // Insufficient balance - don't retry
  if (error.message?.includes('Insufficient balance') ||
      error.message?.includes('Insufficient funds')) {
    return true;
  }

  // Invalid currency - don't retry
  if (error.message?.includes('Invalid currency') ||
      error.message?.includes('Unsupported currency')) {
    return true;
  }

  // 4xx errors are usually permanent (except rate limits)
  if (error.code && error.code >= 400 && error.code < 500) {
    // Rate limit is temporary
    if (error.code === 429) {
      return false;
    }
    return true;
  }

  return false;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate payout parameters
 */
function validatePayoutParams(params: PayoutToCreatorParams): void {
  if (!params.creatorId || params.creatorId.trim() === '') {
    throw new Error('Creator ID is required');
  }

  if (!params.amount || params.amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  if (!['NGN', 'GHS', 'KES'].includes(params.currency)) {
    throw new Error(`Unsupported currency: ${params.currency}. Supported: NGN, GHS, KES`);
  }

  if (!params.bankAccountNumber || params.bankAccountNumber.trim() === '') {
    throw new Error('Bank account number is required');
  }

  if (!params.bankCode || params.bankCode.trim() === '') {
    throw new Error('Bank code is required');
  }

  if (!params.accountHolderName || params.accountHolderName.trim() === '') {
    throw new Error('Account holder name is required');
  }
}

/**
 * Verify creator exists in database
 */
async function verifyCreatorExists(creatorId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', creatorId)
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}

// ============================================================================
// RECIPIENT MANAGEMENT
// ============================================================================

/**
 * Get or create Wise recipient for a creator
 * Uses a simple cache key: creatorId + accountNumber + bankCode
 */
const recipientCache = new Map<string, string>();

async function getOrCreateRecipient(
  creatorId: string,
  accountNumber: string,
  bankCode: string,
  accountHolderName: string,
  currency: SupportedCurrency
): Promise<string> {
  // Check cache first
  const cacheKey = `${creatorId}_${accountNumber}_${bankCode}_${currency}`;
  if (recipientCache.has(cacheKey)) {
    const cachedRecipientId = recipientCache.get(cacheKey)!;
    console.log(`✅ Using cached recipient: ${cachedRecipientId}`);
    return cachedRecipientId;
  }

  // Create new recipient via Wise API
  console.log(`📝 Creating new Wise recipient for creator ${creatorId}...`);
  const recipient = await retryWithBackoff(() =>
    createRecipient({
      currency,
      accountNumber,
      bankCode,
      accountHolderName,
    })
  );

  // Cache recipient ID
  recipientCache.set(cacheKey, recipient.id);
  console.log(`✅ Created recipient: ${recipient.id}`);

  return recipient.id;
}

// ============================================================================
// MAIN PAYOUT FUNCTION
// ============================================================================

/**
 * Send money to a creator via Wise
 * 
 * Complete flow:
 * 1. Validate inputs
 * 2. Verify creator exists
 * 3. Resolve/verify bank account
 * 4. Create or get Wise recipient
 * 5. Create transfer via Wise API
 * 6. Store payout record in database
 * 
 * @param params - Payout parameters
 * @returns Payout record
 * @throws Error if payout fails
 * 
 * @example
 * ```typescript
 * const payout = await payoutToCreator({
 *   creatorId: 'user-123',
 *   amount: 50000,
 *   currency: 'NGN',
 *   bankAccountNumber: '1234567890',
 *   bankCode: '044',
 *   accountHolderName: 'John Doe',
 *   reason: 'Revenue share payout'
 * });
 * ```
 */
export async function payoutToCreator(
  params: PayoutToCreatorParams
): Promise<WisePayout> {
  console.log(`💰 Initiating payout to creator ${params.creatorId}...`);

  // Step 1: Validate inputs
  validatePayoutParams(params);

  // Step 2: Verify creator exists
  const creatorExists = await verifyCreatorExists(params.creatorId);
  if (!creatorExists) {
    throw new Error(`Creator not found: ${params.creatorId}`);
  }

  // Step 3: Resolve/verify bank account
  console.log(`🔍 Verifying bank account for creator ${params.creatorId}...`);
  let resolvedAccount: ResolvedAccount;
  try {
    resolvedAccount = await retryWithBackoff(() =>
      resolveAccount({
        accountNumber: params.bankAccountNumber,
        bankCode: params.bankCode,
        currency: params.currency,
      })
    );

    if (!resolvedAccount.valid) {
      throw new Error('Bank account verification failed: Account is invalid');
    }

    // Verify account holder name matches (case-insensitive)
    const providedName = params.accountHolderName.toLowerCase().trim();
    const resolvedName = resolvedAccount.accountHolderName.toLowerCase().trim();
    
    if (providedName !== resolvedName) {
      console.warn(`⚠️ Account holder name mismatch: provided="${params.accountHolderName}", resolved="${resolvedAccount.accountHolderName}"`);
      // Don't fail - Wise will use the resolved name
    }

    console.log(`✅ Account verified: ${resolvedAccount.accountHolderName}`);
  } catch (error: any) {
    console.error(`❌ Account verification failed:`, error);
    throw new Error(`Account verification failed: ${error.message}`);
  }

  // Step 4: Create or get Wise recipient
  console.log(`👤 Getting or creating Wise recipient...`);
  const recipientId = await getOrCreateRecipient(
    params.creatorId,
    params.bankAccountNumber,
    params.bankCode,
    resolvedAccount.accountHolderName, // Use resolved name from Wise
    params.currency
  );

  // Step 5: Generate unique reference
  const timestamp = Date.now();
  const reference = `payout_${params.creatorId}_${timestamp}`;

  // Step 6: Create transfer via Wise API
  console.log(`💸 Creating Wise transfer...`);
  let transfer: Transfer;
  try {
    transfer = await retryWithBackoff(() =>
      createTransfer({
        targetCurrency: params.currency,
        targetAmount: params.amount,
        recipientId,
        reference,
        sourceCurrency: params.sourceCurrency || 'GBP', // Default: GBP
      })
    );

    console.log(`✅ Transfer created: ${transfer.id}`);
  } catch (error: any) {
    console.error(`❌ Transfer creation failed:`, error);

    // Check for specific error types
    if (error.message?.includes('Insufficient') || error.message?.includes('balance')) {
      throw new Error('Insufficient Wise balance to complete transfer');
    }

    if (error.message?.includes('rate limit') || error.code === 429) {
      throw new Error('Wise API rate limit exceeded. Please try again later.');
    }

    throw new Error(`Transfer creation failed: ${error.message}`);
  }

  // Step 7: Store payout record in database
  console.log(`💾 Storing payout record in database...`);
  let payout: WisePayout;
  try {
    payout = await createPayoutRecord({
      creator_id: params.creatorId,
      amount: params.amount,
      currency: params.currency,
      wise_transfer_id: transfer.id,
      status: WisePayoutStatus.PENDING,
      recipient_account_number: params.bankAccountNumber,
      recipient_account_name: resolvedAccount.accountHolderName,
      recipient_bank_code: params.bankCode,
      reference,
      wise_response: transfer as any,
    });

    console.log(`✅ Payout record created: ${payout.id}`);
  } catch (error: any) {
    console.error(`❌ Failed to store payout record:`, error);
    // Transfer was created but we couldn't store it - this is a problem
    // We should still return success but log the error
    throw new Error(`Payout created but failed to store record: ${error.message}`);
  }

  return payout;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check payout status by reference
 */
export async function checkPayoutStatus(reference: string): Promise<WisePayout | null> {
  return await getPayoutByReference(reference);
}

/**
 * Get payout by transfer ID and update status from Wise
 */
export async function syncPayoutStatus(wiseTransferId: string): Promise<WisePayout | null> {
  try {
    // Get current transfer status from Wise
    const transfer = await getTransferStatus(wiseTransferId);

    // Find payout record
    const { getPayoutByWiseTransferId } = await import('./database');
    const payout = await getPayoutByWiseTransferId(wiseTransferId);

    if (!payout) {
      return null;
    }

    // Update payout status
    const { mapWiseTransferStatusToPayoutStatus } = await import('../types/wise');
    const newStatus = mapWiseTransferStatusToPayoutStatus(transfer.status);

    const updated = await updatePayoutStatus(payout.id, {
      status: newStatus,
      wise_response: transfer as any,
    });

    return updated;
  } catch (error: any) {
    console.error(`Error syncing payout status:`, error);
    throw error;
  }
}

