/**
 * Batch Payout Functions
 * 
 * Process multiple payouts to different creators in a single batch.
 * Handles errors per creator without failing the entire batch.
 */

import { payoutToCreator, type PayoutToCreatorParams } from './payout';
import type { WisePayout } from '../types/wise';

// ============================================================================
// TYPES
// ============================================================================

export interface BatchPayoutItem {
  creatorId: string;
  amount: number;
  currency: 'NGN' | 'GHS' | 'KES';
  bankDetails: {
    accountNumber: string;
    bankCode: string;
    accountHolderName: string;
  };
  reason?: string;
}

export interface BatchPayoutResult {
  success: WisePayout[];
  failed: Array<{
    creatorId: string;
    error: string;
    amount?: number;
    currency?: string;
  }>;
  total: number;
  successful: number;
  failedCount: number;
}

// ============================================================================
// BATCH PAYOUT FUNCTION
// ============================================================================

/**
 * Process multiple payouts in a batch
 * 
 * Each payout is processed independently - if one fails, others continue.
 * Returns results for both successful and failed payouts.
 * 
 * @param payouts - Array of payout items to process
 * @param options - Optional configuration
 * @returns Batch payout results
 * 
 * @example
 * ```typescript
 * const results = await batchPayout([
 *   {
 *     creatorId: 'user-123',
 *     amount: 50000,
 *     currency: 'NGN',
 *     bankDetails: {
 *       accountNumber: '1234567890',
 *       bankCode: '044',
 *       accountHolderName: 'John Doe'
 *     }
 *   },
 *   {
 *     creatorId: 'user-456',
 *     amount: 75000,
 *     currency: 'NGN',
 *     bankDetails: {
 *       accountNumber: '0987654321',
 *       bankCode: '058',
 *       accountHolderName: 'Jane Smith'
 *     }
 *   }
 * ]);
 * 
 * console.log(`Successful: ${results.successful}, Failed: ${results.failedCount}`);
 * ```
 */
export async function batchPayout(
  payouts: BatchPayoutItem[],
  options?: {
    continueOnError?: boolean; // Default: true
    maxConcurrent?: number; // Default: 5
  }
): Promise<BatchPayoutResult> {
  const continueOnError = options?.continueOnError !== false; // Default: true
  const maxConcurrent = options?.maxConcurrent || 5;

  console.log(`📦 Processing batch payout: ${payouts.length} creators`);

  const results: BatchPayoutResult = {
    success: [],
    failed: [],
    total: payouts.length,
    successful: 0,
    failedCount: 0,
  };

  // Process payouts with concurrency limit
  const processBatch = async () => {
    const chunks: BatchPayoutItem[][] = [];
    for (let i = 0; i < payouts.length; i += maxConcurrent) {
      chunks.push(payouts.slice(i, i + maxConcurrent));
    }

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (payout) => {
        try {
          console.log(`💰 Processing payout for creator ${payout.creatorId}...`);

          const payoutParams: PayoutToCreatorParams = {
            creatorId: payout.creatorId,
            amount: payout.amount,
            currency: payout.currency,
            bankAccountNumber: payout.bankDetails.accountNumber,
            bankCode: payout.bankDetails.bankCode,
            accountHolderName: payout.bankDetails.accountHolderName,
            reason: payout.reason,
          };

          const payoutResult = await payoutToCreator(payoutParams);

          results.success.push(payoutResult);
          results.successful++;

          console.log(`✅ Payout successful for creator ${payout.creatorId}: ${payoutResult.id}`);
        } catch (error: any) {
          const errorMessage = error.message || 'Unknown error';
          console.error(`❌ Payout failed for creator ${payout.creatorId}:`, errorMessage);

          results.failed.push({
            creatorId: payout.creatorId,
            error: errorMessage,
            amount: payout.amount,
            currency: payout.currency,
          });
          results.failedCount++;

          // If continueOnError is false, throw to stop batch
          if (!continueOnError) {
            throw error;
          }
        }
      });

      // Wait for current chunk to complete before processing next
      await Promise.all(chunkPromises);
    }
  };

  try {
    await processBatch();
  } catch (error: any) {
    // Only thrown if continueOnError is false
    console.error(`❌ Batch payout stopped due to error:`, error);
    throw error;
  }

  console.log(`📊 Batch payout complete: ${results.successful} successful, ${results.failedCount} failed`);

  return results;
}

/**
 * Process batch payout with progress callback
 * Useful for UI updates during batch processing
 */
export async function batchPayoutWithProgress(
  payouts: BatchPayoutItem[],
  onProgress?: (progress: {
    completed: number;
    total: number;
    current?: string; // Current creator ID being processed
  }) => void,
  options?: {
    continueOnError?: boolean;
    maxConcurrent?: number;
  }
): Promise<BatchPayoutResult> {
  const continueOnError = options?.continueOnError !== false;
  const maxConcurrent = options?.maxConcurrent || 5;

  const results: BatchPayoutResult = {
    success: [],
    failed: [],
    total: payouts.length,
    successful: 0,
    failedCount: 0,
  };

  let completed = 0;

  const processBatch = async () => {
    const chunks: BatchPayoutItem[][] = [];
    for (let i = 0; i < payouts.length; i += maxConcurrent) {
      chunks.push(payouts.slice(i, i + maxConcurrent));
    }

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (payout) => {
        try {
          if (onProgress) {
            onProgress({
              completed,
              total: payouts.length,
              current: payout.creatorId,
            });
          }

          const payoutParams: PayoutToCreatorParams = {
            creatorId: payout.creatorId,
            amount: payout.amount,
            currency: payout.currency,
            bankAccountNumber: payout.bankDetails.accountNumber,
            bankCode: payout.bankDetails.bankCode,
            accountHolderName: payout.bankDetails.accountHolderName,
            reason: payout.reason,
          };

          const payoutResult = await payoutToCreator(payoutParams);

          results.success.push(payoutResult);
          results.successful++;
          completed++;

          if (onProgress) {
            onProgress({
              completed,
              total: payouts.length,
            });
          }
        } catch (error: any) {
          const errorMessage = error.message || 'Unknown error';

          results.failed.push({
            creatorId: payout.creatorId,
            error: errorMessage,
            amount: payout.amount,
            currency: payout.currency,
          });
          results.failedCount++;
          completed++;

          if (onProgress) {
            onProgress({
              completed,
              total: payouts.length,
            });
          }

          if (!continueOnError) {
            throw error;
          }
        }
      });

      await Promise.all(chunkPromises);
    }
  };

  try {
    await processBatch();
  } catch (error: any) {
    console.error(`❌ Batch payout stopped due to error:`, error);
    throw error;
  }

  return results;
}

