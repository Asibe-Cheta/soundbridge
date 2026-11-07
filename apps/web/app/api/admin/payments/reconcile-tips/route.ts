/**
 * POST /api/admin/payments/reconcile-tips
 *
 * Manual counterpart to the /api/cron/reconcile-pending-tips scheduled job, for
 * reconciling specific, known payment_intent_ids directly (e.g. a historical
 * case found outside the job's rolling lookback window). Uses the exact same
 * silent, idempotent reconcileTipPaymentIntent() — no notifications, keyed on
 * payment_intent_id so re-running is always safe.
 *
 * Auth: admin or super_admin.
 * Body JSON: { "payment_intent_ids": ["pi_...", ...] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { reconcileTipPaymentIntent } from '@/src/lib/tip-reconciliation';

const ADMIN_ROLES = ['admin', 'super_admin'] as const;

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request, ADMIN_ROLES);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  let body: { payment_intent_ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const ids = Array.isArray(body.payment_intent_ids)
    ? body.payment_intent_ids.filter((id): id is string => typeof id === 'string' && id.startsWith('pi_'))
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: 'payment_intent_ids (array of pi_... strings) is required' }, { status: 400 });
  }

  const results = [];
  for (const id of ids) {
    const result = await reconcileTipPaymentIntent(id, admin.serviceClient, 'manual_admin');
    results.push({ payment_intent_id: id, result });
  }

  return NextResponse.json({ results });
}
