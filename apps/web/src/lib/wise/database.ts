/**
 * Wise Payouts Database Helper Functions
 * 
 * Provides functions for creating, updating, and querying Wise payout records.
 */

import { createServiceClient } from '../supabase';
import type {
  WisePayout,
  CreateWisePayoutParams,
  UpdateWisePayoutParams,
  WisePayoutFilters,
  WisePayoutStatus,
} from '../types/wise';

// Helper to get a service role client for database operations
function getServiceClient() {
  return createServiceClient();
}

/**
 * Create a new Wise payout record in the database
 * 
 * @param params - Payout creation parameters
 * @returns Created payout record
 * @throws Error if creation fails
 * 
 * @example
 * ```typescript
 * const payout = await createPayoutRecord({
 *   creator_id: 'user-123',
 *   amount: 50000,
 *   currency: 'NGN',
 *   recipient_account_number: '1234567890',
 *   recipient_account_name: 'John Doe',
 *   recipient_bank_code: '044',
 *   reference: 'payout-abc-xyz-123'
 * });
 * ```
 */
export async function createPayoutRecord(
  params: CreateWisePayoutParams
): Promise<WisePayout> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('wise_payouts')
    .insert({
      creator_id: params.creator_id,
      amount: params.amount,
      currency: params.currency,
      wise_transfer_id: params.wise_transfer_id || null,
      wise_recipient_id: params.wise_recipient_id || null,
      wise_quote_id: params.wise_quote_id || null,
      status: params.status || 'pending',
      recipient_account_number: params.recipient_account_number,
      recipient_account_name: params.recipient_account_name,
      recipient_bank_name: params.recipient_bank_name || null,
      recipient_bank_code: params.recipient_bank_code,
      reference: params.reference,
      customer_transaction_id: params.customer_transaction_id || params.reference || null,
      exchange_rate: params.exchange_rate || null,
      source_amount: params.source_amount || null,
      source_currency: params.source_currency || null,
      wise_fee: params.wise_fee || null,
      wise_response: params.wise_response || {},
      metadata: params.metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating Wise payout record:', error);
    throw new Error(`Failed to create payout record: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to create payout record: No data returned');
  }

  return data as WisePayout;
}

/**
 * Update payout status and related fields
 * 
 * @param payoutId - Payout record ID
 * @param params - Update parameters
 * @returns Updated payout record
 * @throws Error if update fails
 * 
 * @example
 * ```typescript
 * const updated = await updatePayoutStatus('payout-123', {
 *   status: 'completed',
 *   wise_transfer_id: 'transfer-456',
 *   wise_response: { ... }
 * });
 * ```
 */
export async function updatePayoutStatus(
  payoutId: string,
  params: UpdateWisePayoutParams
): Promise<WisePayout> {
  const supabase = getServiceClient();

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (params.status !== undefined) {
    updateData.status = params.status;
  }

  if (params.wise_transfer_id !== undefined) {
    updateData.wise_transfer_id = params.wise_transfer_id;
  }

  if (params.error_message !== undefined) {
    updateData.error_message = params.error_message;
  }

  if (params.wise_response !== undefined) {
    updateData.wise_response = params.wise_response;
  }

  if (params.wise_recipient_id !== undefined) {
    updateData.wise_recipient_id = params.wise_recipient_id;
  }

  if (params.wise_quote_id !== undefined) {
    updateData.wise_quote_id = params.wise_quote_id;
  }

  if (params.error_code !== undefined) {
    updateData.error_code = params.error_code;
  }

  if (params.exchange_rate !== undefined) {
    updateData.exchange_rate = params.exchange_rate;
  }

  if (params.source_amount !== undefined) {
    updateData.source_amount = params.source_amount;
  }

  if (params.source_currency !== undefined) {
    updateData.source_currency = params.source_currency;
  }

  if (params.wise_fee !== undefined) {
    updateData.wise_fee = params.wise_fee;
  }

  if (params.metadata !== undefined) {
    updateData.metadata = params.metadata;
  }

  if (params.completed_at !== undefined) {
    updateData.completed_at = params.completed_at;
  }

  if (params.failed_at !== undefined) {
    updateData.failed_at = params.failed_at;
  }

  const { data, error } = await supabase
    .from('wise_payouts')
    .update(updateData)
    .eq('id', payoutId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating payout ${payoutId}:`, error);
    throw new Error(`Failed to update payout: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Payout ${payoutId} not found`);
  }

  return data as WisePayout;
}

/**
 * Get payout by ID
 * 
 * @param payoutId - Payout record ID
 * @returns Payout record or null if not found
 */
export async function getPayoutById(payoutId: string): Promise<WisePayout | null> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('wise_payouts')
    .select('*')
    .eq('id', payoutId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error(`Error fetching payout ${payoutId}:`, error);
    throw new Error(`Failed to fetch payout: ${error.message}`);
  }

  return data as WisePayout | null;
}

/**
 * Get payout by Wise transfer ID
 * 
 * @param wiseTransferId - Wise transfer ID
 * @returns Payout record or null if not found
 */
export async function getPayoutByWiseTransferId(
  wiseTransferId: string
): Promise<WisePayout | null> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('wise_payouts')
    .select('*')
    .eq('wise_transfer_id', wiseTransferId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error(`Error fetching payout by transfer ID ${wiseTransferId}:`, error);
    throw new Error(`Failed to fetch payout: ${error.message}`);
  }

  return data as WisePayout | null;
}

/**
 * Get payout by reference
 * 
 * @param reference - Internal reference
 * @returns Payout record or null if not found
 */
export async function getPayoutByReference(
  reference: string
): Promise<WisePayout | null> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('wise_payouts')
    .select('*')
    .eq('reference', reference)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error(`Error fetching payout by reference ${reference}:`, error);
    throw new Error(`Failed to fetch payout: ${error.message}`);
  }

  return data as WisePayout | null;
}

/**
 * Get all payouts for a creator
 * 
 * @param creatorId - Creator/user ID
 * @param filters - Optional filters
 * @returns Array of payout records
 * 
 * @example
 * ```typescript
 * const payouts = await getCreatorPayouts('user-123', {
 *   status: 'completed',
 *   currency: 'NGN'
 * });
 * ```
 */
export async function getCreatorPayouts(
  creatorId: string,
  filters?: WisePayoutFilters
): Promise<WisePayout[]> {
  const supabase = getServiceClient();

  let query = supabase
    .from('wise_payouts')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters) {
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters.currency) {
      query = query.eq('currency', filters.currency);
    }

    if (filters.created_after) {
      query = query.gte('created_at', filters.created_after);
    }

    if (filters.created_before) {
      query = query.lte('created_at', filters.created_before);
    }

    if (filters.min_amount !== undefined) {
      query = query.gte('amount', filters.min_amount);
    }

    if (filters.max_amount !== undefined) {
      query = query.lte('amount', filters.max_amount);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching payouts for creator ${creatorId}:`, error);
    throw new Error(`Failed to fetch payouts: ${error.message}`);
  }

  return (data || []) as WisePayout[];
}

/**
 * Get all pending payouts (for processing)
 * 
 * @param limit - Maximum number of records to return (default: 100)
 * @returns Array of pending payout records
 */
export async function getPendingPayouts(limit: number = 100): Promise<WisePayout[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('wise_payouts')
    .select('*')
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching pending payouts:', error);
    throw new Error(`Failed to fetch pending payouts: ${error.message}`);
  }

  return (data || []) as WisePayout[];
}

/**
 * Get payout statistics for a creator
 * 
 * @param creatorId - Creator/user ID
 * @returns Statistics object
 */
export async function getCreatorPayoutStats(creatorId: string): Promise<{
  total_payouts: number;
  total_amount: number;
  completed_payouts: number;
  completed_amount: number;
  pending_payouts: number;
  pending_amount: number;
  failed_payouts: number;
  failed_amount: number;
}> {
  const supabase = getServiceClient();

  // Get all payouts for the creator
  const { data, error } = await supabase
    .from('wise_payouts')
    .select('amount, status')
    .eq('creator_id', creatorId);

  if (error) {
    console.error(`Error fetching payout stats for creator ${creatorId}:`, error);
    throw new Error(`Failed to fetch payout stats: ${error.message}`);
  }

  const payouts = (data || []) as Array<{ amount: number; status: WisePayoutStatus }>;

  // Calculate statistics
  const stats = {
    total_payouts: payouts.length,
    total_amount: payouts.reduce((sum, p) => sum + Number(p.amount), 0),
    completed_payouts: payouts.filter(p => p.status === 'completed').length,
    completed_amount: payouts
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0),
    pending_payouts: payouts.filter(p => p.status === 'pending' || p.status === 'processing').length,
    pending_amount: payouts
      .filter(p => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, p) => sum + Number(p.amount), 0),
    failed_payouts: payouts.filter(p => p.status === 'failed' || p.status === 'cancelled').length,
    failed_amount: payouts
      .filter(p => p.status === 'failed' || p.status === 'cancelled')
      .reduce((sum, p) => sum + Number(p.amount), 0),
  };

  return stats;
}

