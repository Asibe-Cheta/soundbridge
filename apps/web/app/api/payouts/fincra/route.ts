/**
 * POST /api/payouts/fincra
 * Mobile alias for creator Fincra wallet payout (WEB_TEAM_FINCRA_INTEGRATION.MD).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createFincraTransfer, isFincraCurrency } from '@/src/lib/fincra';
import { decryptSecret } from '@/src/lib/encryption';
import { performCreatorFincraWalletPayout } from '@/src/lib/payouts/creator-fincra-wallet-payout';
import { syncFincraWalletWithdrawalMethodsFromCreatorBank } from '@/src/lib/payouts/sync-fincra-withdrawal-method-from-creator-bank';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getSupabaseRouteClient(request, true);
    const { user, supabase, error: authError } = auth;
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    await syncFincraWalletWithdrawalMethodsFromCreatorBank(supabase, user.id);

    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount);
    const currency = String(body.currency ?? 'GBP').toUpperCase();
    const withdrawalMethodId = body.withdrawal_method_id ? String(body.withdrawal_method_id) : null;
    const description = body.description ? String(body.description) : 'SoundBridge creator payout';

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400, headers: corsHeaders });
    }

    if (withdrawalMethodId) {
      const { data: method, error: methodErr } = await supabase
        .from('wallet_withdrawal_methods')
        .select('id, user_id, is_verified, currency, country, encrypted_details')
        .eq('id', withdrawalMethodId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (methodErr || !method) {
        return NextResponse.json({ error: 'Withdrawal method not found' }, { status: 404, headers: corsHeaders });
      }
      if (!method.is_verified) {
        return NextResponse.json({ error: 'Withdrawal method is not verified' }, { status: 400, headers: corsHeaders });
      }

      const details = (method.encrypted_details ?? {}) as Record<string, unknown>;
      const rawAccount = String(details.account_number ?? details.accountNumber ?? '');
      const rawBankCode = String(details.bank_code ?? details.bankCode ?? details.routing_number ?? '');
      const accountNumber = rawAccount.includes(':') ? decryptSecret(rawAccount) : rawAccount;
      const bankCode = rawBankCode.includes(':') ? decryptSecret(rawBankCode) : rawBankCode;
      const accountName = String(
        details.account_holder_name ?? details.accountName ?? details.account_name ?? 'Account Holder',
      );
      const payoutCurrency = String(method.currency || currency).toUpperCase();
      if (!isFincraCurrency(payoutCurrency)) {
        return NextResponse.json(
          { error: `Fincra payouts support NGN, GHS, and KES only. Got ${payoutCurrency}.` },
          { status: 400, headers: corsHeaders },
        );
      }

      const customerReference = `fincra_payout_${user.id}_${Date.now()}`;
      const transfer = await createFincraTransfer({
        amount,
        currency: payoutCurrency,
        accountNumber,
        bankCode,
        accountName,
        reference: customerReference,
        narration: description,
        sourceCurrency: currency,
      });

      await supabase.rpc('add_wallet_transaction', {
        user_uuid: user.id,
        transaction_type: 'payout',
        amount: -amount,
        description: 'Payout via Fincra',
        reference_id: transfer.id,
        metadata: {
          method: 'fincra',
          currency,
          customer_reference: customerReference,
          withdrawal_method_id: withdrawalMethodId,
        },
        p_currency: currency,
      });

      const { data: payout } = await supabase
        .from('payouts')
        .insert({
          user_id: user.id,
          amount,
          currency,
          method: 'fincra',
          status: 'pending',
          stripe_transfer_id: transfer.id,
          customer_reference: customerReference,
          fincra_reference: transfer.id,
          bank_code: bankCode,
          beneficiary_name: accountName,
          bank_account_number: accountNumber,
        })
        .select('id')
        .single();

      const eta = new Date();
      eta.setDate(eta.getDate() + 3);
      return NextResponse.json(
        {
          payout_id: String(payout?.id ?? 'pending'),
          status: 'pending',
          amount,
          currency,
          estimated_arrival: eta.toISOString().split('T')[0],
        },
        { headers: corsHeaders },
      );
    }

    const result = await performCreatorFincraWalletPayout(supabase, user, { amount, currency });

    return NextResponse.json(
      {
        payout_id: result.payoutId,
        status: 'pending',
        amount: result.amount,
        currency: result.currency,
        estimated_arrival: result.estimatedArrival,
      },
      { headers: corsHeaders },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Fincra payout failed';
    const status = (e as { status?: number })?.status === 403 ? 502 : 400;
    console.error('POST /api/payouts/fincra:', e);
    return NextResponse.json({ error: msg }, { status, headers: corsHeaders });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
