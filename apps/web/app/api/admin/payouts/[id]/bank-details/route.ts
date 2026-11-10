/**
 * GET /api/admin/payouts/:id/bank-details — reveal a creator's FULL (unmasked)
 * bank details for a pending payout request, for the manual (non-Fincra)
 * payout screen. No other route in this codebase shows an admin the real
 * account number — admin/payouts/route.ts and admin/payouts/batch/route.ts
 * only ever decrypt it server-side to feed the Fincra/Stripe API directly,
 * then show a masked version. This is deliberately a separate, narrow
 * endpoint: every call logs who viewed which creator's details, when.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { decryptSecret } from '@/src/lib/encryption';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Full bank details are restricted to this one account, not every admin —
 * requireAdmin alone would let any is_admin/admin-role profile through.
 * Justice's own account (asibe_cheta).
 */
const SOLE_BANK_DETAILS_VIEWER_ID = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function looksEncrypted(value: string): boolean {
  const trimmed = (value ?? '').trim();
  if (!trimmed || !trimmed.includes(':')) return false;
  const parts = trimmed.split(':');
  return parts.length === 3 && parts.every((p) => /^[0-9a-fA-F]+$/.test(p));
}

function toPlaintext(stored: string | null | undefined): string {
  const v = (stored ?? '').trim();
  if (!v) return '';
  if (looksEncrypted(v)) return decryptSecret(v);
  return v;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }
  if (admin.userId !== SOLE_BANK_DETAILS_VIEWER_ID) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: CORS });
  }

  const { id: payoutRequestId } = await params;
  const service = admin.serviceClient;

  const { data: pr, error: prError } = await service
    .from('payout_requests')
    .select('id, creator_id, amount, currency, status, bank_account_id')
    .eq('id', payoutRequestId)
    .single();

  if (prError || !pr) {
    return NextResponse.json({ error: 'Payout request not found' }, { status: 404, headers: CORS });
  }

  let bankQuery = service
    .from('creator_bank_accounts')
    .select('id, account_holder_name, bank_name, account_number_encrypted, routing_number_encrypted, currency')
    .eq('user_id', pr.creator_id)
    .eq('is_verified', true);
  if (pr.bank_account_id) {
    bankQuery = bankQuery.eq('id', pr.bank_account_id);
  }
  const { data: bankRows, error: bankError } = await bankQuery.limit(1);

  if (bankError || !bankRows?.length) {
    return NextResponse.json({ error: 'No verified bank account found for this creator' }, { status: 404, headers: CORS });
  }
  const bank = bankRows[0];

  // Log the view BEFORE returning the details, not after — if the insert
  // fails, the admin doesn't see the details either, so there's never a
  // real view that goes unlogged.
  const { error: auditError } = await service.from('admin_bank_detail_views').insert({
    admin_user_id: admin.userId,
    creator_id: pr.creator_id,
    payout_request_id: pr.id,
  });
  if (auditError) {
    console.error('[admin/payouts/bank-details] audit log failed, refusing to reveal details:', auditError);
    return NextResponse.json({ error: 'Could not record audit log; details not shown' }, { status: 500, headers: CORS });
  }

  return NextResponse.json(
    {
      success: true,
      payout_request_id: pr.id,
      amount: pr.amount,
      currency: pr.currency,
      account_holder_name: bank.account_holder_name,
      bank_name: bank.bank_name,
      account_number: toPlaintext(bank.account_number_encrypted),
      routing_number: toPlaintext(bank.routing_number_encrypted),
      bank_currency: bank.currency,
    },
    { headers: CORS },
  );
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
