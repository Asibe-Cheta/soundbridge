/**
 * Admin repair: apply wallet deduction for a payout_request (idempotent).
 * Use when status is completed but creator wallet was never debited.
 * POST /api/admin/payouts/apply-wallet-deduction
 * Body: { payout_request_id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { completePayoutRequestBalanceDeduction } from '@/src/lib/payouts/complete-payout-request-balance';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: corsHeaders });
  }

  const body = await request.json().catch(() => ({}));
  const payoutRequestId = body?.payout_request_id;
  if (!payoutRequestId || typeof payoutRequestId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'payout_request_id is required' },
      { status: 400, headers: corsHeaders },
    );
  }

  const { data: pr, error: prError } = await admin.serviceClient
    .from('payout_requests')
    .select('id, creator_id, amount, currency, status')
    .eq('id', payoutRequestId)
    .single();

  if (prError || !pr) {
    return NextResponse.json(
      { success: false, error: 'Payout request not found' },
      { status: 404, headers: corsHeaders },
    );
  }

  const deduct = await completePayoutRequestBalanceDeduction(admin.serviceClient, {
    creatorId: pr.creator_id,
    amount: Number(pr.amount),
    payoutRequestId: pr.id,
    currency: String(pr.currency ?? 'USD'),
  });

  if (!deduct.success) {
    return NextResponse.json(
      { success: false, error: deduct.error, deduction: deduct, payout_request: pr },
      { status: 422, headers: corsHeaders },
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: deduct.already_deducted
        ? 'Wallet was already deducted for this payout request.'
        : 'Wallet balance updated for this payout request.',
      deduction: deduct,
      payout_request: pr,
    },
    { status: 200, headers: corsHeaders },
  );
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
