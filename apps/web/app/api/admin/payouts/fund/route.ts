/**
 * Admin: Legacy fund endpoint.
 * POST /api/admin/payouts/fund
 * Body: { payout_request_id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';

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
    if (!admin.ok) {
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
      .select('id, status, stripe_transfer_id')
      .eq('id', payoutRequestId)
      .single();

    if (prError || !pr) {
      return NextResponse.json(
        { error: 'Payout request not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (pr.status !== 'processing') {
      return NextResponse.json(
        { error: `Payout request is not in processing (status: ${pr.status}). Only processing requests can be funded.` },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'No manual funding required for Fincra payouts. This endpoint is kept for backward compatibility.',
        payout_request_id: payoutRequestId,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Admin fund endpoint error:', error);
    const message = error?.message ?? error?.error ?? 'Request failed';
    return NextResponse.json(
      { error: 'Fund failed', message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
