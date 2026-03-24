import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { decryptSecret } from '@/src/lib/encryption';
import { submitWiseBatchGroupPayments, type WiseBatchGroupPayoutItem } from '@/src/lib/wise/batch-group-payout';
import { getMinPayoutForCurrency } from '@/src/lib/payout-minimum';
import { SendGridService } from '@/src/lib/sendgrid-service';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS });
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
    }

    const supabase = admin.serviceClient;

    const { max = 1000 } = (await request.json().catch(() => ({}))) as { max?: number };

    const { data: payoutReqs, error: reqError } = await supabase
      .from('payout_requests')
      .select('id, creator_id, amount, currency, status, processed_at, bank_account_id')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })
      .limit(Number.isFinite(max) ? max : 1000);

    if (reqError) {
      return NextResponse.json({ error: 'Failed to fetch pending payout requests', details: reqError.message }, { status: 500, headers: CORS });
    }

    const pending = payoutReqs ?? [];
    if (pending.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending payout requests' }, { status: 200, headers: CORS });
    }

    const creatorIds = [...new Set(pending.map((r: any) => r.creator_id).filter(Boolean))];
    const { data: bankAccounts, error: bankError } = await supabase
      .from('creator_bank_accounts')
      .select('id, user_id, currency, bank_name, account_holder_name, account_number_encrypted, routing_number_encrypted')
      .eq('is_verified', true)
      .in('user_id', creatorIds);

    if (bankError) {
      return NextResponse.json({ error: 'Failed to fetch creator bank accounts', details: bankError.message }, { status: 500, headers: CORS });
    }

    const banksById = new Map<string, any>();
    const banksByUser = new Map<string, any[]>();
    (bankAccounts ?? []).forEach((b: any) => {
      banksById.set(b.id, b);
      const list = banksByUser.get(b.user_id) ?? [];
      list.push(b);
      banksByUser.set(b.user_id, list);
    });

    // Build Wise batch items grouped by source currency.
    const itemsBySource: Record<string, WiseBatchGroupPayoutItem[]> = {};
    const unsupported: Array<{ payout_request_id: string; reason: string }> = [];
    const belowMinimum: Array<{ payout_request_id: string; reason: string }> = [];

    for (const pr of pending) {
      const creatorId = pr.creator_id;
      const requestId = pr.id;
      const bank =
        pr.bank_account_id ? banksById.get(pr.bank_account_id) : (banksByUser.get(creatorId) ?? [])[0];

      const targetCurrency = (bank?.currency ?? '').toUpperCase();
      const supportedTargets = ['NGN', 'GHS', 'KES'];

      if (!bank || !supportedTargets.includes(targetCurrency)) {
        unsupported.push({
          payout_request_id: requestId,
          reason: bank ? `Unsupported bank currency: ${targetCurrency}` : 'No verified bank account found',
        });
        continue;
      }

      const accountNumber = toPlaintext(bank.account_number_encrypted);
      const routingPlain = toPlaintext(bank.routing_number_encrypted);
      const bankCode = routingPlain || (targetCurrency === 'NGN' ? '033' : '');
      const accountHolderName = (bank.account_holder_name ?? 'Account Holder').trim();

      if (!accountNumber || !bankCode || !accountHolderName) {
        unsupported.push({
          payout_request_id: requestId,
          reason: 'Bank details incomplete (account number, bank code, or account holder name missing)',
        });
        continue;
      }

      const sourceCurrency = (pr.currency ?? 'USD').toUpperCase();
      const sourceAmount = Number(pr.amount);
      const minPayout = getMinPayoutForCurrency(sourceCurrency);
      if (!Number.isFinite(sourceAmount) || sourceAmount < minPayout) {
        belowMinimum.push({
          payout_request_id: requestId,
          reason: `Below minimum payout threshold (${sourceCurrency} ${minPayout.toFixed(2)})`,
        });
        continue;
      }

      const items: WiseBatchGroupPayoutItem = {
        payoutRequestId: requestId,
        creatorId,
        sourceCurrency: sourceCurrency === 'USD' ? 'USD' : (sourceCurrency === 'GBP' ? 'GBP' : 'EUR'),
        sourceAmount: Number.isFinite(sourceAmount) ? sourceAmount : 0,
        targetCurrency: targetCurrency as WiseBatchGroupPayoutItem['targetCurrency'],
        bankDetails: {
          accountNumber,
          bankCode,
          accountHolderName,
          bankName: bank.bank_name ?? null,
        },
        reason: 'Batch payouts',
      };

      const key = sourceCurrency;
      itemsBySource[key] = itemsBySource[key] ?? [];
      itemsBySource[key].push(items);
    }

    const processed: Array<{ payout_request_id: string; wise_payout_id: string }> = [];
    const submissionErrors: Array<{ sourceCurrency: string; error: string; payout_request_ids: string[] }> = [];
    const batchSummaries: Array<{
      batchId: string;
      sourceCurrency: string;
      transferCount: number;
      totalSourceAmount: number;
      wiseDashboardUrl: string;
    }> = [];

    for (const [sourceCurrencyKey, items] of Object.entries(itemsBySource)) {
      if (!items || items.length === 0) continue;

      const sourceCurrency = sourceCurrencyKey === 'USD' ? 'USD' : sourceCurrencyKey === 'GBP' ? 'GBP' : 'EUR';

      const payoutRequestIds = items.map((i) => i.payoutRequestId);
      try {
        const submission = await submitWiseBatchGroupPayments(items, sourceCurrency);
        const wisePayoutRows = submission.wisePayoutRows;

        await Promise.all(
          wisePayoutRows.map(async ({ payoutRequestId, wisePayout }) => {
            await supabase
              .from('payout_requests')
              .update({
                status: 'pending_batch',
                processed_at: new Date().toISOString(),
                stripe_transfer_id: wisePayout.id,
                rejection_reason: null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', payoutRequestId);
            processed.push({ payout_request_id: payoutRequestId, wise_payout_id: wisePayout.id });
          })
        );
        batchSummaries.push({
          batchId: submission.batchId,
          sourceCurrency: submission.sourceCurrency,
          transferCount: submission.transferCount,
          totalSourceAmount: submission.totalSourceAmount,
          wiseDashboardUrl: submission.wiseDashboardUrl,
        });
      } catch (err: any) {
        await supabase
          .from('payout_requests')
          .update({
            status: 'pending',
            processed_at: null,
            stripe_transfer_id: null,
            updated_at: new Date().toISOString(),
          })
          .in('id', payoutRequestIds);

        const rawMessage = err?.message || 'Batch submission failed';
        const is403 =
          err?.code === 403 ||
          err?.status === 403 ||
          String(rawMessage).includes('403');
        const error =
          is403
            ? `${rawMessage} — Requests re-queued to Pending. Fund the batch manually in Wise dashboard once created.`
            : rawMessage;

        submissionErrors.push({
          sourceCurrency,
          error,
          payout_request_ids: payoutRequestIds,
        });
      }
    }

    if (batchSummaries.length > 0) {
      const adminEmail = process.env.ADMIN_PAYOUT_EMAIL || process.env.ADMIN_EMAIL;
      if (adminEmail) {
        const totalCount = batchSummaries.reduce((sum, b) => sum + b.transferCount, 0);
        const totalAmount = batchSummaries.reduce((sum, b) => sum + b.totalSourceAmount, 0);
        const lines = batchSummaries
          .map((b) => `<li><code>${b.batchId}</code> — ${b.transferCount} payouts — ${b.sourceCurrency} ${b.totalSourceAmount.toFixed(2)}</li>`)
          .join('');
        await SendGridService.sendHtmlEmail(
          adminEmail,
          `Wise payout batch ready to fund (${totalCount} payouts)`,
          `<div style="font-family:Arial,sans-serif">
            <h2>Wise payout batch created</h2>
            <p>${totalCount} payouts have been queued via Wise Batch Payments.</p>
            <p><strong>Total:</strong> ${totalAmount.toFixed(2)} (across currencies)</p>
            <p>Manual step required: log in to Wise and click <strong>Fund batch</strong>.</p>
            <ul>${lines}</ul>
            <p><a href="https://wise.com/home">Open Wise dashboard</a></p>
          </div>`
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        processed,
        unsupported,
        belowMinimum,
        batches: batchSummaries,
        submissionErrors,
        totalPending: pending.length,
      },
      { status: 200, headers: CORS }
    );
  } catch (e: any) {
    console.error('Admin batch Wise payout error:', e);
    return NextResponse.json({ error: 'Internal server error', message: e?.message }, { status: 500, headers: CORS });
  }
}

