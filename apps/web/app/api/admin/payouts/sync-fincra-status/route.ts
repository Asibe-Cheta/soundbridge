import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { syncPayoutRequestFromFincra } from '@/src/lib/payouts/sync-fincra-payout-request';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/admin/payouts/sync-fincra-status
 * Body: { payout_request_id: string }
 *
 * Polls Fincra for the live transfer status and marks the payout completed/failed
 * when Fincra reports a terminal state (use when webhook did not fire).
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (isAdminAccessDenied(admin)) {
      return NextResponse.json(
        { error: admin.error },
        { status: admin.status, headers: corsHeaders },
      );
    }

    const body = await request.json().catch(() => ({}));
    const payoutRequestId = body?.payout_request_id;

    if (!payoutRequestId || typeof payoutRequestId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'payout_request_id is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    const result = await syncPayoutRequestFromFincra(admin.serviceClient, payoutRequestId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, ...result },
        { status: result.already_completed ? 200 : 422, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { success: true, ...result },
      { status: 200, headers: corsHeaders },
    );
  } catch (error: unknown) {
    console.error('Admin sync-fincra-status error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500, headers: corsHeaders },
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
