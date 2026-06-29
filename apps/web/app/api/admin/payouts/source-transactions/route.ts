import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { fetchAdminPayoutSourceTransactions } from '@/src/lib/admin-payout-source-transactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/** GET /api/admin/payouts/source-transactions — tips & wallet credits with from → to parties */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: corsHeaders });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const creatorId = searchParams.get('creatorId');

  try {
    const result = await fetchAdminPayoutSourceTransactions(admin.serviceClient, {
      limit,
      offset,
      creatorId,
    });
    return NextResponse.json({ success: true, ...result }, { headers: corsHeaders });
  } catch (e) {
    console.error('[admin/payouts/source-transactions]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load source transactions' },
      { status: 500, headers: corsHeaders },
    );
  }
}
