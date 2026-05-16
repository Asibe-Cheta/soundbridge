import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { completePayoutRequestBalanceDeduction } from '@/src/lib/payouts/complete-payout-request-balance';

const ADMIN_ROLES = ['admin', 'super_admin'] as const;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ReconcileBody = {
  from_date?: string;
  dry_run?: boolean;
  limit?: number;
};

type PayoutRow = {
  id: string;
  status: string;
  stripe_transfer_id: string | null;
  rejection_reason: string | null;
  updated_at: string | null;
};

type WalletRow = {
  id: string;
  reference_id: string | null;
  status: string;
  updated_at: string | null;
};

type FixAction =
  | { kind: 'payout_to_completed'; payout_request_id: string; reference_id: string; from: string; to: 'completed' }
  | { kind: 'payout_to_failed'; payout_request_id: string; reference_id: string; from: string; to: 'failed' }
  | { kind: 'wallet_to_completed'; wallet_transaction_id: string; reference_id: string; from: string; to: 'completed' }
  | { kind: 'wallet_to_failed'; wallet_transaction_id: string; reference_id: string; from: string; to: 'failed' };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function isTerminalPayoutStatus(status: string): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

function isTerminalWalletStatus(status: string): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request, ADMIN_ROLES);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }

  const raw = await request.text();
  let body: ReconcileBody = {};
  try {
    body = raw ? (JSON.parse(raw) as ReconcileBody) : {};
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: CORS });
  }

  const fromDate = body.from_date?.trim() || '2026-04-08T00:00:00Z';
  const dryRun = body.dry_run !== false;
  const limit = Math.max(1, Math.min(Number(body.limit || 500), 5000));

  const service = admin.serviceClient;

  const { data: payoutRows, error: payoutErr } = await service
    .from('payout_requests')
    .select('id, status, stripe_transfer_id, rejection_reason, updated_at')
    .gte('created_at', fromDate)
    .not('stripe_transfer_id', 'is', null)
    .ilike('stripe_transfer_id', 'fincra_%')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (payoutErr) {
    return NextResponse.json(
      { error: 'Failed to load payout_requests', detail: payoutErr.message },
      { status: 500, headers: CORS }
    );
  }

  const payoutList = (payoutRows ?? []) as PayoutRow[];
  const references = Array.from(
    new Set(
      payoutList
        .map((r) => r.stripe_transfer_id || '')
        .filter((v) => v.length > 0)
    )
  );

  let walletList: WalletRow[] = [];
  if (references.length > 0) {
    const { data: walletRows, error: walletErr } = await service
      .from('wallet_transactions')
      .select('id, reference_id, status, updated_at')
      .eq('transaction_type', 'payout')
      .in('reference_id', references);

    if (walletErr) {
      return NextResponse.json(
        { error: 'Failed to load wallet_transactions', detail: walletErr.message },
        { status: 500, headers: CORS }
      );
    }
    walletList = (walletRows ?? []) as WalletRow[];
  }

  const walletsByRef = new Map<string, WalletRow>();
  for (const w of walletList) {
    const ref = w.reference_id || '';
    if (!ref) continue;
    const prev = walletsByRef.get(ref);
    if (!prev) {
      walletsByRef.set(ref, w);
      continue;
    }
    const prevTs = prev.updated_at ? new Date(prev.updated_at).getTime() : 0;
    const nextTs = w.updated_at ? new Date(w.updated_at).getTime() : 0;
    if (nextTs >= prevTs) walletsByRef.set(ref, w);
  }

  const fixes: FixAction[] = [];
  for (const p of payoutList) {
    const ref = p.stripe_transfer_id || '';
    if (!ref) continue;
    const w = walletsByRef.get(ref);
    if (!w) continue;

    const payoutStatus = String(p.status || '').toLowerCase();
    const walletStatus = String(w.status || '').toLowerCase();

    if (walletStatus === 'completed' && payoutStatus !== 'completed') {
      fixes.push({
        kind: 'payout_to_completed',
        payout_request_id: p.id,
        reference_id: ref,
        from: payoutStatus,
        to: 'completed',
      });
      continue;
    }
    if (walletStatus === 'failed' && payoutStatus !== 'failed') {
      fixes.push({
        kind: 'payout_to_failed',
        payout_request_id: p.id,
        reference_id: ref,
        from: payoutStatus,
        to: 'failed',
      });
      continue;
    }
    if (payoutStatus === 'completed' && walletStatus !== 'completed' && !isTerminalWalletStatus(walletStatus)) {
      fixes.push({
        kind: 'wallet_to_completed',
        wallet_transaction_id: w.id,
        reference_id: ref,
        from: walletStatus,
        to: 'completed',
      });
      continue;
    }
    if (isTerminalPayoutStatus(payoutStatus) && payoutStatus === 'failed' && walletStatus !== 'failed') {
      fixes.push({
        kind: 'wallet_to_failed',
        wallet_transaction_id: w.id,
        reference_id: ref,
        from: walletStatus,
        to: 'failed',
      });
    }
  }

  const applied: string[] = [];
  const errors: Array<{ reference_id: string; error: string }> = [];

  if (!dryRun) {
    for (const fix of fixes) {
      if (fix.kind === 'payout_to_completed') {
        const { data: prRow } = await service
          .from('payout_requests')
          .select('id, creator_id, amount, currency')
          .eq('id', fix.payout_request_id)
          .maybeSingle();

        const { error } = await service
          .from('payout_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            rejection_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', fix.payout_request_id);
        if (error) {
          errors.push({ reference_id: fix.reference_id, error: error.message });
        } else {
          applied.push(`${fix.kind}:${fix.reference_id}`);
          if (prRow) {
            const deduct = await completePayoutRequestBalanceDeduction(service, {
              creatorId: prRow.creator_id,
              amount: Number(prRow.amount),
              payoutRequestId: prRow.id,
              currency: String(prRow.currency ?? 'USD'),
            });
            if (!deduct.success && !deduct.already_deducted) {
              errors.push({
                reference_id: fix.reference_id,
                error: `Status updated but wallet deduction failed: ${deduct.error ?? 'unknown'}`,
              });
            }
          }
        }
      } else if (fix.kind === 'payout_to_failed') {
        const { error } = await service
          .from('payout_requests')
          .update({
            status: 'failed',
            rejection_reason: 'Reconciled from Fincra wallet transaction status',
            updated_at: new Date().toISOString(),
          })
          .eq('id', fix.payout_request_id);
        if (error) errors.push({ reference_id: fix.reference_id, error: error.message });
        else applied.push(`${fix.kind}:${fix.reference_id}`);
      } else if (fix.kind === 'wallet_to_completed') {
        const { error } = await service
          .from('wallet_transactions')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', fix.wallet_transaction_id);
        if (error) errors.push({ reference_id: fix.reference_id, error: error.message });
        else applied.push(`${fix.kind}:${fix.reference_id}`);
      } else if (fix.kind === 'wallet_to_failed') {
        const { error } = await service
          .from('wallet_transactions')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', fix.wallet_transaction_id);
        if (error) errors.push({ reference_id: fix.reference_id, error: error.message });
        else applied.push(`${fix.kind}:${fix.reference_id}`);
      }
    }
  }

  return NextResponse.json(
    {
      ok: true,
      dry_run: dryRun,
      from_date: fromDate,
      scanned: {
        payout_requests: payoutList.length,
        wallet_transactions: walletList.length,
      },
      fixes_found: fixes.length,
      fixes_sample: fixes.slice(0, 50),
      applied_count: applied.length,
      errors,
    },
    { headers: CORS }
  );
}
