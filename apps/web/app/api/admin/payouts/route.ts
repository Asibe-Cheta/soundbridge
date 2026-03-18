/**
 * Admin Payout API Endpoint
 * 
 * POST /api/admin/payouts/initiate
 * 
 * Allows admins to initiate payouts to creators via Wise.
 * Supports both single and batch payouts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { payoutToCreator } from '@/src/lib/wise/payout';
import { batchPayout, type BatchPayoutItem } from '@/src/lib/wise/batch-payout';
import type { PayoutToCreatorParams } from '@/src/lib/wise/payout';
import { decryptSecret } from '@/src/lib/encryption';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

/** iv:authTag:hex format from our encryption lib */
function looksEncrypted(value: string): boolean {
  const trimmed = (value ?? '').trim();
  if (!trimmed || !trimmed.includes(':')) return false;
  const parts = trimmed.split(':');
  return parts.length === 3 && parts.every((p) => /^[0-9a-fA-F]+$/.test(p));
}

/** Return plaintext for Wise: decrypt if we stored encrypted, else use as-is. */
function toPlaintext(stored: string | null | undefined): string {
  const v = (stored ?? '').trim();
  if (!v) return '';
  if (looksEncrypted(v)) {
    try {
      return decryptSecret(v);
    } catch (e) {
      console.error('Bank detail decryption failed:', e);
      throw e;
    }
  }
  return v;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Check if user is admin
 */
async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  
  // Check profiles.role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profile?.role === 'admin') {
    return true;
  }

  // Check user_roles table
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single();

  return !!userRole;
}

/**
 * POST /api/admin/payouts/initiate
 * 
 * Initiate payout(s) to creator(s)
 * 
 * Body (trigger by pending payout request):
 * {
 *   "payout_request_id": "<uuid from payout_requests>"
 * }
 * Looks up request, creator's verified bank account, then Wise with sourceCurrency USD, sourceAmount, targetCurrency from bank.
 * 
 * Body (single payout):
 * {
 *   "creatorId": "user-123",
 *   "amount": 50000,
 *   "currency": "NGN",
 *   "bankAccountNumber": "1234567890",
 *   "bankCode": "044",
 *   "accountHolderName": "John Doe",
 *   "reason": "Revenue share payout"
 * }
 * 
 * Body (batch payout):
 * {
 *   "batch": true,
 *   "payouts": [
 *     {
 *       "creatorId": "user-123",
 *       "amount": 50000,
 *       "currency": "NGN",
 *       "bankDetails": {
 *         "accountNumber": "1234567890",
 *         "bankCode": "044",
 *         "accountHolderName": "John Doe"
 *       },
 *       "reason": "Revenue share"
 *     }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createServiceClient();
    const authHeader = request.headers.get('authorization');
    
    let userId: string | null = null;

    // Try to get user from Bearer token
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // If no user from token, try to get from session (for web requests)
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Parse request body (support both payout_request_id trigger and single/batch payloads)
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400, headers: corsHeaders }
      );
    }
    if (!body || typeof body !== 'object') {
      body = {};
    }
    const { batch, payouts, payout_request_id, ...singlePayoutParams } = body;

    // Handle trigger by payout_request_id (manual trigger of pending request) — check first so single-payout validation is never used for this case
    if (payout_request_id != null && payout_request_id !== '') {
      const { data: pr, error: prError } = await supabase
        .from('payout_requests')
        .select('id, creator_id, amount, currency, status, bank_account_id')
        .eq('id', payout_request_id)
        .single();

      if (prError || !pr) {
        return NextResponse.json(
          { error: 'Payout request not found' },
          { status: 404, headers: corsHeaders }
        );
      }
      if (pr.status !== 'pending' && pr.status !== 'failed') {
        return NextResponse.json(
          { error: `Payout request cannot be initiated (status: ${pr.status}). Only pending or failed requests can be triggered or retried.` },
          { status: 400, headers: corsHeaders }
        );
      }

      let bankQuery = supabase
        .from('creator_bank_accounts')
        .select('id, currency, account_holder_name, account_number_encrypted, routing_number_encrypted, bank_name')
        .eq('user_id', pr.creator_id)
        .eq('is_verified', true);
      if (pr.bank_account_id) {
        bankQuery = bankQuery.eq('id', pr.bank_account_id);
      }
      const { data: bankRows, error: bankError } = await bankQuery.limit(1);

      if (bankError || !bankRows?.length) {
        return NextResponse.json(
          { error: 'No verified bank account found for this creator' },
          { status: 400, headers: corsHeaders }
        );
      }
      const bank = bankRows[0];
      const targetCurrency = (bank.currency || 'NGN').toUpperCase();
      if (!['NGN', 'GHS', 'KES'].includes(targetCurrency)) {
        return NextResponse.json(
          { error: `Bank currency ${targetCurrency} is not supported for Wise payout` },
          { status: 400, headers: corsHeaders }
        );
      }

      // Use plaintext for Wise: we currently store plaintext; if we switch to encrypting, toPlaintext decrypts.
      const accountNumber = toPlaintext(bank.account_number_encrypted);
      const bankCode = toPlaintext(bank.routing_number_encrypted) || (targetCurrency === 'NGN' ? '033' : '');
      const accountHolderName = (bank.account_holder_name ?? 'Account Holder').trim();
      if (!accountNumber || !bankCode) {
        return NextResponse.json(
          { error: 'Bank account details incomplete (account number or bank code missing)' },
          { status: 400, headers: corsHeaders }
        );
      }

      await supabase
        .from('payout_requests')
        .update({ status: 'processing', processed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', payout_request_id);

      try {
        const payoutParams: PayoutToCreatorParams = {
          creatorId: pr.creator_id,
          amount: 0,
          currency: targetCurrency as 'NGN' | 'GHS' | 'KES',
          bankAccountNumber: accountNumber,
          bankCode,
          accountHolderName,
          reason: `Payout request ${payout_request_id}`,
          sourceCurrency: (pr.currency || 'USD') as 'USD',
          sourceAmount: Number(pr.amount),
        };
        const payout = await payoutToCreator(payoutParams);

        await supabase
          .from('payout_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            stripe_transfer_id: payout.id,
          })
          .eq('id', payout_request_id);

        return NextResponse.json(
          {
            success: true,
            message: 'Payout initiated successfully',
            payout_request_id,
            transfer_id: payout.id,
            payout,
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error: any) {
        await supabase
          .from('payout_requests')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
            rejection_reason: error?.message ?? 'Wise transfer failed',
          })
          .eq('id', payout_request_id);
        console.error('❌ Payout by request id error:', error);
        return NextResponse.json(
          { error: 'Payout failed', message: error?.message ?? 'Wise transfer failed' },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Handle batch payout
    if (batch && Array.isArray(payouts)) {
      console.log(`📦 Admin ${userId} initiating batch payout: ${payouts.length} creators`);

      // Validate batch structure
      if (payouts.length === 0) {
        return NextResponse.json(
          { error: 'Payouts array cannot be empty' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Validate each payout item
      for (const payout of payouts) {
        if (!payout.creatorId || !payout.amount || !payout.currency || !payout.bankDetails) {
          return NextResponse.json(
            { error: 'Invalid payout item: missing required fields' },
            { status: 400, headers: corsHeaders }
          );
        }
      }

      try {
        const batchPayoutItems: BatchPayoutItem[] = payouts.map((p: any) => ({
          creatorId: p.creatorId,
          amount: p.amount,
          currency: p.currency,
          bankDetails: {
            accountNumber: p.bankDetails.accountNumber,
            bankCode: p.bankDetails.bankCode,
            accountHolderName: p.bankDetails.accountHolderName,
          },
          reason: p.reason,
        }));

        const results = await batchPayout(batchPayoutItems, {
          continueOnError: true, // Continue processing even if some fail
          maxConcurrent: 5, // Process 5 payouts concurrently
        });

        return NextResponse.json(
          {
            success: true,
            message: `Batch payout processed: ${results.successful} successful, ${results.failedCount} failed`,
            results,
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error: any) {
        console.error('❌ Batch payout error:', error);
        return NextResponse.json(
          {
            error: 'Batch payout failed',
            message: error.message,
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Handle single payout (only when not payout_request_id and not batch)
    else if (!batch) {
      console.log(`💰 Admin ${userId} initiating single payout to creator ${singlePayoutParams.creatorId}`);

      // Validate single payout params
      if (!singlePayoutParams.creatorId ||
          singlePayoutParams.amount == null ||
          !singlePayoutParams.currency ||
          !singlePayoutParams.bankAccountNumber ||
          !singlePayoutParams.bankCode ||
          !singlePayoutParams.accountHolderName) {
        return NextResponse.json(
          { error: 'Missing required fields: creatorId, amount, currency, bankAccountNumber, bankCode, accountHolderName. Or send payout_request_id to trigger a pending request.' },
          { status: 400, headers: corsHeaders }
        );
      }

      try {
        // When sourceCurrency + sourceAmount are provided (e.g. USD payout request), Wise converts at live rate to target (currency).
        const payoutParams: PayoutToCreatorParams = {
          creatorId: singlePayoutParams.creatorId,
          amount: singlePayoutParams.amount,
          currency: singlePayoutParams.currency as 'NGN' | 'GHS' | 'KES',
          bankAccountNumber: singlePayoutParams.bankAccountNumber,
          bankCode: singlePayoutParams.bankCode,
          accountHolderName: singlePayoutParams.accountHolderName,
          reason: singlePayoutParams.reason,
          sourceCurrency: singlePayoutParams.sourceCurrency || 'GBP',
          ...(singlePayoutParams.sourceAmount != null && { sourceAmount: singlePayoutParams.sourceAmount }),
        };

        const payout = await payoutToCreator(payoutParams);

        return NextResponse.json(
          {
            success: true,
            message: 'Payout initiated successfully',
            payout,
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error: any) {
        console.error('❌ Payout error:', error);
        return NextResponse.json(
          {
            error: 'Payout failed',
            message: error.message,
          },
          { status: 500, headers: corsHeaders }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Provide payout_request_id, or batch payouts, or single payout fields (creatorId, amount, currency, bankAccountNumber, bankCode, accountHolderName).' },
        { status: 400, headers: corsHeaders }
      );
    }
  } catch (error: any) {
    console.error('❌ Admin payout API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/admin/payouts
 * 
 * Get payout history (optional - for admin dashboard)
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createServiceClient();
    const authHeader = request.headers.get('authorization');
    
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const creatorId = searchParams.get('creatorId');
    const pendingRequests = searchParams.get('pending_requests') === '1' || searchParams.get('pending_requests') === 'true';

    // List pending payout_requests (so admin can get id and POST to initiate) — no SQL needed
    if (pendingRequests) {
      let prQuery = supabase
        .from('payout_requests')
        .select('id, creator_id, amount, currency, status, requested_at, bank_account_id')
        .order('requested_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (status) prQuery = prQuery.eq('status', status);
      else prQuery = prQuery.eq('status', 'pending');
      if (creatorId) prQuery = prQuery.eq('creator_id', creatorId);
      const { data: requests, error: prError } = await prQuery;
      if (prError) {
        console.error('Error fetching payout requests:', prError);
        return NextResponse.json(
          { error: 'Failed to fetch payout requests' },
          { status: 500, headers: corsHeaders }
        );
      }
      return NextResponse.json(
        { success: true, payout_requests: requests || [], limit, offset },
        { status: 200, headers: corsHeaders }
      );
    }

    // Wise payout history
    let query = supabase
      .from('wise_payouts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (creatorId) {
      query = query.eq('creator_id', creatorId);
    }

    const { data: payouts, error } = await query;

    if (error) {
      console.error('Error fetching payouts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payouts' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        payouts: payouts || [],
        limit,
        offset,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Admin payout GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

