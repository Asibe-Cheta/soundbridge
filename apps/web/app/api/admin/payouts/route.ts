/**
 * Admin Payout API Endpoint
 * 
 * POST /api/admin/payouts/initiate
 * 
 * Allows admins to initiate payouts to creators via Fincra.
 * Supports both single and batch payouts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { decryptSecret } from '@/src/lib/encryption';
import { createFincraTransfer, isFincraCurrency } from '@/src/lib/fincra';

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

/** Return plaintext for payout provider: decrypt if we stored encrypted, else use as-is. */
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

/** HTTP status code from provider errors (code may be string "403"). */
function httpStatusFromError(err: unknown): number | undefined {
  const c = (err as { code?: unknown })?.code;
  if (c === undefined || c === null) return undefined;
  const n = typeof c === 'string' ? parseInt(c, 10) : Number(c);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Payout failures: always 422 (not 500) so the admin UI can show the reason without treating it as a server bug.
 */
function buildPayoutFailureResponse(err: unknown): NextResponse {
  const e = err as {
    message?: string;
    error?: string;
    code?: string | number;
    details?: unknown;
  };
  const raw =
    (typeof e?.message === 'string' && e.message.trim()
      ? e.message
      : typeof e?.error === 'string' && e.error.trim()
        ? e.error
        : null) ?? 'Payout could not be completed';
  const http = httpStatusFromError(err);
  const is403 =
    http === 403 ||
    String(e?.code) === '403' ||
    raw.includes('403');
  const isMissingConfig = /FINCRA_API_KEY|FINCRA_|environment variables/i.test(raw);

  let message = raw;
  if (is403) {
    message =
      'Fincra payout failed with 403. Request re-queued to Pending so admin can retry.';
  } else if (isMissingConfig) {
    message = `${raw} (configure env on the server and redeploy.)`;
  }

  const body: Record<string, unknown> = {
    success: false,
    error: message,
    message,
  };
  if (e?.code != null) body.code = e.code;
  if (e?.details != null) body.details = e.details;

  return NextResponse.json(body, { status: 422, headers: corsHeaders });
}

async function initiateFincraPayout(params: {
  payoutRequestId: string;
  amount: number;
  currency: 'NGN' | 'GHS' | 'KES';
  bankAccountNumber: string;
  bankCode: string;
  accountHolderName: string;
  reason?: string;
}) {
  const reference = `fincra_${params.payoutRequestId}_${Date.now()}`;
  return createFincraTransfer({
    amount: params.amount,
    currency: params.currency,
    accountNumber: params.bankAccountNumber,
    bankCode: params.bankCode,
    accountName: params.accountHolderName,
    reference,
    narration: params.reason ?? 'SoundBridge payout',
  });
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
 * Looks up request, creator's verified bank account, then initiates Fincra payout.
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
    if (isAdminAccessDenied(admin)) {
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
          { error: `Bank currency ${targetCurrency} is not supported for Fincra payout` },
          { status: 400, headers: corsHeaders }
        );
      }

      // Use plaintext for payout provider: we currently store plaintext; if encrypted, toPlaintext decrypts.
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
        const payout = await initiateFincraPayout({
          payoutRequestId: String(payout_request_id),
          amount: Number(pr.amount),
          currency: targetCurrency as 'NGN' | 'GHS' | 'KES',
          bankAccountNumber: accountNumber,
          bankCode,
          accountHolderName,
          reason: `Payout request ${payout_request_id}`,
        });
        // Store mapping payout_requests -> provider transfer reference.
        // Do NOT mark completed here: wait for webhook to confirm transfer completion.
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
        // Do NOT set status to 'failed': only provider webhook should set failed.
        // Revert to pending so admin can retry.
        await supabase
          .from('payout_requests')
          .update({
            status: 'pending',
            processed_at: null,
            stripe_transfer_id: null,
            updated_at: new Date().toISOString(),
            rejection_reason: error?.message ?? 'Last attempt failed (retry payout)',
          })
          .eq('id', payout_request_id);
        console.error('❌ Payout by request id error:', error);
        return buildPayoutFailureResponse(error);
      }
    }

    // Handle batch payout
    if (batch && Array.isArray(payouts)) {
      return NextResponse.json(
        { error: 'Use /api/admin/payouts/batch for Fincra batch processing.' },
        { status: 400, headers: corsHeaders }
      );
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
        const currency = String(singlePayoutParams.currency ?? '').toUpperCase();
        if (!isFincraCurrency(currency)) {
          return NextResponse.json(
            { error: `Unsupported payout currency for Fincra: ${currency}` },
            { status: 400, headers: corsHeaders }
          );
        }

        const payout = await initiateFincraPayout({
          payoutRequestId: `manual_${Date.now()}`,
          amount: Number(singlePayoutParams.amount),
          currency,
          bankAccountNumber: String(singlePayoutParams.bankAccountNumber),
          bankCode: String(singlePayoutParams.bankCode),
          accountHolderName: String(singlePayoutParams.accountHolderName),
          reason: typeof singlePayoutParams.reason === 'string' ? singlePayoutParams.reason : undefined,
        });

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
    return buildPayoutFailureResponse(error);
  }
}

/**
 * GET /api/admin/payouts
 *
 * Query params:
 * - pending_requests=1 — enriched `payout_requests` (default status pending; pass status=processing|failed).
 * - batch_history=1 — returns `batches: []` (no batch table; Fincra is per request).
 * - Otherwise — `payouts` from `payout_requests` (withdrawal history). Optional status, creatorId, limit, offset.
 *   Provider transfer id is in each row as `stripe_transfer_id` and `provider_transfer_id`.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (isAdminAccessDenied(admin)) {
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
    const batchHistory = searchParams.get('batch_history') === '1' || searchParams.get('batch_history') === 'true';

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
            ? 'Fincra'
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

    if (batchHistory) {
      // Fincra flows use per-request `payout_requests` rows; there is no batch-group table.
      return NextResponse.json(
        { success: true, batches: [], limit, offset },
        { status: 200, headers: corsHeaders }
      );
    }

    /** Admin + clients: withdrawal history lives in `payout_requests` (provider ref in `stripe_transfer_id`). */
    let historyQuery = supabase
      .from('payout_requests')
      .select(
        'id, creator_id, amount, currency, status, requested_at, processed_at, completed_at, stripe_transfer_id, rejection_reason, created_at, updated_at, admin_notes, bank_account_id'
      )
      .order('requested_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      historyQuery = historyQuery.eq('status', status);
    } else {
      historyQuery = historyQuery.in('status', ['completed', 'failed', 'processing', 'rejected']);
    }

    if (creatorId) {
      historyQuery = historyQuery.eq('creator_id', creatorId);
    }

    const { data: prRows, error: historyError } = await historyQuery;

    if (historyError) {
      console.error('Error fetching payout_requests:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch payouts' },
        { status: 500, headers: corsHeaders }
      );
    }

    const payouts = (prRows ?? []).map((r: Record<string, unknown>) => {
      const st = String(r.status ?? '');
      return {
        id: r.id,
        creator_id: r.creator_id,
        bank_account_id: r.bank_account_id,
        amount: r.amount,
        currency: r.currency,
        status: r.status,
        provider_transfer_id: r.stripe_transfer_id,
        stripe_transfer_id: r.stripe_transfer_id,
        rejection_reason: r.rejection_reason,
        error_message: r.rejection_reason,
        completed_at: r.completed_at,
        failed_at: st === 'failed' ? (r.processed_at ?? r.updated_at) : null,
        requested_at: r.requested_at,
        processed_at: r.processed_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
        admin_notes: r.admin_notes,
      };
    });

    return NextResponse.json(
      {
        success: true,
        payouts,
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

