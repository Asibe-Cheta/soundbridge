/**
 * GET/POST /api/admin/solvency/fincra-balance — read/update the manually-entered
 * Fincra funded balance used by the daily solvency check (cron/solvency-check).
 * Update this every time Fincra is topped up.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }
  const { data } = await admin.serviceClient
    .from('fincra_funded_balance')
    .select('amount, currency, updated_at')
    .eq('id', 1)
    .maybeSingle();
  return NextResponse.json({ success: true, balance: data ?? null }, { headers: CORS });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }
  const body = await request.json().catch(() => ({}));
  const amount = Number(body.amount);
  const currency = String(body.currency || 'NGN').toUpperCase();
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: 'A valid non-negative amount is required' }, { status: 400, headers: CORS });
  }

  const { error } = await admin.serviceClient
    .from('fincra_funded_balance')
    .upsert({
      id: 1,
      amount,
      currency,
      updated_at: new Date().toISOString(),
      updated_by: admin.userId,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  }

  return NextResponse.json({ success: true, amount, currency }, { headers: CORS });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
