/**
 * Admin: Wise USD balance (for funding batch payouts).
 * GET /api/admin/payouts/wise-balance
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { getWiseUsdAvailableBalance } from '@/src/lib/wise/balances';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin.ok) {
      return NextResponse.json(
        { error: admin.error },
        { status: admin.status, headers: corsHeaders }
      );
    }

    const result = await getWiseUsdAvailableBalance();
    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          profileId: result.profileId,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        currency: 'USD',
        amount: result.usdAmount,
        profileId: result.profileId,
        source: result.source,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to load Wise balance';
    console.error('GET /api/admin/payouts/wise-balance:', e);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 200, headers: corsHeaders }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
