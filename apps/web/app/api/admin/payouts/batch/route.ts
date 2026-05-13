import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { decryptSecret } from '@/src/lib/encryption';
import { createFincraTransfer, isFincraCurrency } from '@/src/lib/fincra';
import { getMinPayoutForCurrency } from '@/src/lib/payout-minimum';

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
    if (isAdminAccessDenied(admin)) {
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

    const unsupported: Array<{ payout_request_id: string; reason: string }> = [];
    const belowMinimum: Array<{ payout_request_id: string; reason: string }> = [];
    const processed: Array<{ payout_request_id: string; transfer_id: string }> = [];
    const submissionErrors: Array<{ payout_request_id: string; error: string }> = [];
    for (const pr of pending) {
      const creatorId = pr.creator_id;
      const requestId = pr.id;
      const bank = pr.bank_account_id ? banksById.get(pr.bank_account_id) : (banksByUser.get(creatorId) ?? [])[0];
      const currency = String(bank?.currency ?? '').toUpperCase();

      if (!bank || !isFincraCurrency(currency)) {
        unsupported.push({
          payout_request_id: requestId,
          reason: bank ? `Unsupported bank currency: ${currency}` : 'No verified bank account found',
        });
        continue;
      }

      const sourceAmount = Number(pr.amount);
      const minPayout = getMinPayoutForCurrency(pr.currency);
      if (!Number.isFinite(sourceAmount) || sourceAmount < minPayout) {
        belowMinimum.push({
          payout_request_id: requestId,
          reason: `Below minimum payout threshold (${String(pr.currency ?? 'USD').toUpperCase()} ${minPayout.toFixed(2)})`,
        });
        continue;
      }

      const accountNumber = toPlaintext(bank.account_number_encrypted);
      const bankCode = toPlaintext(bank.routing_number_encrypted);
      const accountHolderName = (bank.account_holder_name ?? 'Account Holder').trim();
      if (!accountNumber || !bankCode || !accountHolderName) {
        unsupported.push({
          payout_request_id: requestId,
          reason: 'Bank details incomplete (account number, bank code, or account holder name missing)',
        });
        continue;
      }

      try {
        const reference = `fincra_${requestId}_${Date.now()}`;
        const transfer = await createFincraTransfer({
          amount: sourceAmount,
          currency,
          accountNumber,
          bankCode,
          accountName: accountHolderName,
          reference,
          narration: `Payout request ${requestId}`,
        });

        await supabase
          .from('payout_requests')
          .update({
            status: 'processing',
            processed_at: new Date().toISOString(),
            stripe_transfer_id: transfer.id,
            rejection_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        processed.push({ payout_request_id: requestId, transfer_id: transfer.id });
      } catch (err: any) {
        submissionErrors.push({
          payout_request_id: requestId,
          error: err?.message || 'Fincra payout submission failed',
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        processed,
        unsupported,
        belowMinimum,
        submissionErrors,
        totalPending: pending.length,
      },
      { status: 200, headers: CORS }
    );
  } catch (e: any) {
    console.error('Admin batch Fincra payout error:', e);
    return NextResponse.json({ error: 'Internal server error', message: e?.message }, { status: 500, headers: CORS });
  }
}

