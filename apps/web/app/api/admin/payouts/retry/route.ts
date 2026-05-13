/**
 * Admin: Re-queue a failed payout request as pending so it can be approved/batched again.
 * POST /api/admin/payouts/retry
 * Body: { payout_request_id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

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
    const body = await request.json().catch(() => ({}));
    const payoutRequestId = body?.payout_request_id;

    if (!payoutRequestId || typeof payoutRequestId !== 'string') {
      return NextResponse.json(
        { error: 'payout_request_id is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: pr, error: prError } = await supabase
      .from('payout_requests')
      .select('id, status')
      .eq('id', payoutRequestId)
      .single();

    if (prError || !pr) {
      return NextResponse.json(
        { error: 'Payout request not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (pr.status !== 'failed') {
      return NextResponse.json(
        { error: `Payout request is not failed (status: ${pr.status}). Only failed requests can be retried.` },
        { status: 400, headers: corsHeaders }
      );
    }

    const { error: updateError } = await supabase
      .from('payout_requests')
      .update({
        status: 'pending',
        stripe_transfer_id: null,
        processed_at: null,
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payoutRequestId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to re-queue payout request' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Payout request re-queued as pending', payout_request_id: payoutRequestId },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Admin payout retry error:', error);
    return NextResponse.json(
      { error: 'Retry failed', message: error?.message ?? 'Internal error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
