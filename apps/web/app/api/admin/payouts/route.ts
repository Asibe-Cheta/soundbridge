/**
 * Admin Payout API Endpoint
 * 
 * POST /api/admin/payouts/initiate
 * 
 * Allows admins to initiate payouts to creators via Wise.
 * Supports both single and batch payouts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
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
    const admin = await requireAdmin(request);
    if (!admin.ok) {
      return NextResponse.json(
        { error: admin.error },
        { status: admin.status, headers: corsHeaders }
      );
    }

    const supabase = admin.serviceClient;
    const userId = admin.userId;

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
        // Store mapping payout_requests -> wise_payouts.
        // Do NOT mark completed here: wait for the Wise webhook to confirm transfer completion.
        await supabase
          .from('payout_requests')
          .update({
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
        // Do NOT set status to 'failed': only Wise webhook (transfer.failed / transfer.cancelled) should set failed.
        // Revert to pending so admin can retry. If a Wise transfer was created but funding failed (e.g. 403),
        // the transfer may still exist and need manual funding via "Retry / Fund" on a processing row.
        await supabase
          .from('payout_requests')
          .update({
            status: 'pending',
            processed_at: null,
            stripe_transfer_id: null,
            updated_at: new Date().toISOString(),
            rejection_reason: error?.message ?? 'Last attempt failed (retry or fund transfer if it exists)',
          })
          .eq('id', payout_request_id);
        console.error('❌ Payout by request id error:', error);
        const is403 =
          error?.code === 403 ||
          error?.status === 403 ||
          String(error?.message ?? '').includes('403');
        const message =
          is403
            ? 'Funding failed (403). Request re-queued to Pending. If a Wise transfer was created, check In Progress and use Retry / Fund.'
            : (error?.message ?? 'Wise transfer failed');
        const payload: { error: string; message: string; details?: unknown } = {
          error: 'Payout failed',
          message,
        };
        if (error?.details != null) payload.details = error.details;
        else if (error != null) payload.details = { error: error?.error, message: error?.message, code: error?.code };
        return NextResponse.json(payload, { status: 500, headers: corsHeaders });
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
    const admin = await requireAdmin(request);
    if (!admin.ok) {
      return NextResponse.json(
        { error: admin.error },
        { status: admin.status, headers: corsHeaders }
      );
    }

    const supabase = admin.serviceClient;
    const userId = admin.userId;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const creatorId = searchParams.get('creatorId');
    const pendingRequests = searchParams.get('pending_requests') === '1' || searchParams.get('pending_requests') === 'true';

    // List payout_requests (pending or processing) — no SQL needed
    if (pendingRequests) {
      let prQuery = supabase
        .from('payout_requests')
        .select('id, creator_id, amount, currency, status, requested_at, bank_account_id, stripe_transfer_id, rejection_reason')
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

      const rows = requests || [];
      if (rows.length === 0) {
        return NextResponse.json(
          { success: true, payout_requests: [], limit, offset },
          { status: 200, headers: corsHeaders }
        );
      }
      const creatorIds = [...new Set(rows.map((r: any) => r.creator_id).filter(Boolean))];
      if (creatorIds.length === 0) {
        return NextResponse.json(
          { success: true, payout_requests: [], limit, offset },
          { status: 200, headers: corsHeaders }
        );
      }
      const bankAccountIds = rows.map((r: any) => r.bank_account_id).filter(Boolean);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', creatorIds);

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      // Fallback: for creators with no display_name and no email in profiles, get email from Auth
      const idsNeedingAuthEmail = creatorIds.filter((id: string) => {
        const p = profileMap.get(id);
        const hasName = Boolean((p?.display_name ?? '').trim());
        const hasEmail = Boolean((p?.email ?? '').trim());
        return !hasName && !hasEmail;
      });
      const authEmailByUserId = new Map<string, string>();
      if (idsNeedingAuthEmail.length > 0) {
        await Promise.all(
          idsNeedingAuthEmail.map(async (userId: string) => {
            const { data } = await supabase.auth.admin.getUserById(userId);
            const email = data?.user?.email?.trim();
            if (email) authEmailByUserId.set(userId, email);
          })
        );
      }

      // Fetch verified bank accounts for these creators (needed when payout_requests.bank_account_id is null)
      const { data: banks } = await supabase
        .from('creator_bank_accounts')
        .select('id, user_id, bank_name, currency, account_number_encrypted')
        .in('user_id', creatorIds)
        .eq('is_verified', true);

      const banksByUserId = new Map<string, any[]>();
      const bankById = new Map<string, any>();
      (banks ?? []).forEach((b: any) => {
        bankById.set(b.id, b);
        const list = banksByUserId.get(b.user_id) ?? [];
        list.push(b);
        banksByUserId.set(b.user_id, list);
      });

      const maskAccountNumber = (v: string | null | undefined) => {
        const s = String(v ?? '').trim();
        const digits = s.replace(/\D/g, '');
        if (digits.length < 4) return '****';
        return `****${digits.slice(-4)}`;
      };

      const enriched = rows.map((r: any) => {
        const creator = profileMap.get(r.creator_id);

        const chosenBank =
          (r.bank_account_id ? bankById.get(r.bank_account_id) : null) ??
          (banksByUserId.get(r.creator_id) ?? [])[0] ??
          null;

        const bankCurrency = (chosenBank?.currency ?? null) ? String(chosenBank.currency).toUpperCase() : null;
        let accountNumberPlain: string | null = null;
        if (chosenBank?.account_number_encrypted != null) {
          try {
            accountNumberPlain = toPlaintext(chosenBank.account_number_encrypted);
          } catch (e) {
            accountNumberPlain = null;
          }
        }

        const payoutRail =
          bankCurrency && ['NGN', 'GHS', 'KES'].includes(bankCurrency)
            ? 'Wise'
            : 'Stripe Connect';

        const displayName = (creator?.display_name ?? '').trim() || null;
        const profileEmail = (creator?.email ?? '').trim() || null;
        const authEmail = authEmailByUserId.get(r.creator_id) ?? null;
        const email = profileEmail || authEmail;
        const creator_name =
          displayName ||
          profileEmail ||
          authEmail ||
          (r.creator_id ? `Creator ${String(r.creator_id).slice(0, 8)}…` : null);
        return {
          ...r,
          creator_name: creator_name || r.creator_id,
          creator_email: email,
          bank_name: chosenBank?.bank_name ?? null,
          bank_currency: bankCurrency,
          bank_account_masked: chosenBank ? maskAccountNumber(accountNumberPlain) : null,
          payout_rail: payoutRail,
        };
      });

      return NextResponse.json(
        { success: true, payout_requests: enriched, limit, offset },
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

