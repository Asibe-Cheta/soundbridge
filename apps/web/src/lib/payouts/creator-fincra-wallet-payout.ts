import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createFincraTransfer, isFincraCurrency } from '@/src/lib/fincra';
import { decryptSecret } from '@/src/lib/encryption';
import { pickVerifiedFincraCreatorBankAccount } from '@/src/lib/payouts/sync-fincra-withdrawal-method-from-creator-bank';

export type CreatorFincraWalletPayoutInput = {
  amount: number;
  /** Wallet row currency (e.g. GBP). */
  currency: string;
};

export type CreatorFincraWalletPayoutResult = {
  transferId: string;
  payoutId: string;
  amount: number;
  currency: string;
  estimatedArrival: string;
};

/**
 * Creator wallet withdrawal via Fincra (creator_bank_accounts + wallet debit + payouts row).
 * Used by POST /api/payouts/create (method fincra) and POST /api/payouts/fincra.
 */
export async function performCreatorFincraWalletPayout(
  supabase: SupabaseClient,
  user: User,
  input: CreatorFincraWalletPayoutInput,
): Promise<CreatorFincraWalletPayoutResult> {
  const amount = Number(input.amount);
  const currency = String(input.currency || 'GBP').toUpperCase();

  if (!amount || amount <= 0) {
    throw new Error('Valid amount is required');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const userTier = profile?.subscription_tier || 'free';
  const minimumBalance = userTier === 'unlimited' ? 10.0 : 20.0;

  const { data: wallet } = await supabase
    .from('user_wallets')
    .select('balance, currency')
    .eq('user_id', user.id)
    .eq('currency', currency)
    .single();

  const currentBalance = Number(wallet?.balance || 0);
  if (currentBalance < amount) {
    throw new Error('Insufficient balance');
  }
  if (amount < minimumBalance) {
    const sym = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
    throw new Error(`Minimum payout amount is ${sym}${minimumBalance}`);
  }

  const { data: bankRows, error: bankError } = await supabase
    .from('creator_bank_accounts')
    .select(
      'stripe_account_id, is_verified, currency, account_number_encrypted, routing_number_encrypted, account_holder_name, updated_at',
    )
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (bankError) {
    throw new Error('Payout account not found. Please complete onboarding first.');
  }

  const bankAccount = pickVerifiedFincraCreatorBankAccount(bankRows ?? []);
  if (!bankAccount) {
    throw new Error(
      'No verified Fincra payout bank (NGN, GHS, or KES) on file. Add or verify your bank account first.',
    );
  }

  const payoutCurrency = String(bankAccount.currency || currency).toUpperCase();
  if (!isFincraCurrency(payoutCurrency)) {
    throw new Error(`Fincra payouts support NGN, GHS, and KES only. Got ${payoutCurrency}.`);
  }

  const accountNumberEncrypted = String(bankAccount.account_number_encrypted || '');
  const bankCodeEncrypted = String(bankAccount.routing_number_encrypted || '');
  const accountNumber = accountNumberEncrypted.includes(':')
    ? decryptSecret(accountNumberEncrypted)
    : accountNumberEncrypted;
  const bankCode = bankCodeEncrypted.includes(':') ? decryptSecret(bankCodeEncrypted) : bankCodeEncrypted;
  const accountName = String(bankAccount.account_holder_name || 'Account Holder');
  const customerReference = `fincra_payout_${user.id}_${Date.now()}`;

  const transfer = await createFincraTransfer({
    amount: Number(amount),
    currency: payoutCurrency,
    accountNumber,
    bankCode,
    accountName,
    reference: customerReference,
    narration: 'SoundBridge creator payout',
    sourceCurrency: currency,
  });
  const transferId = transfer.id;

  const { error: walletUpdateError } = await supabase.rpc('add_wallet_transaction', {
    user_uuid: user.id,
    transaction_type: 'payout',
    amount: -amount,
    description: 'Payout via Fincra',
    reference_id: transferId,
    metadata: {
      method: 'fincra',
      currency,
      customer_reference: customerReference,
    },
    p_currency: currency,
  });

  if (walletUpdateError) {
    console.error('Error updating wallet:', walletUpdateError);
  }

  const { data: payout, error: payoutError } = await supabase
    .from('payouts')
    .insert({
      user_id: user.id,
      amount,
      currency,
      method: 'fincra',
      status: 'pending',
      stripe_transfer_id: transferId,
      customer_reference: customerReference,
      fincra_reference: transferId,
    })
    .select()
    .single();

  if (payoutError) {
    console.error('Error creating payout record:', payoutError);
  }

  const estimatedArrival = new Date();
  estimatedArrival.setDate(estimatedArrival.getDate() + 3);

  return {
    transferId,
    payoutId: String(payout?.id ?? 'pending'),
    amount,
    currency,
    estimatedArrival: estimatedArrival.toISOString().split('T')[0]!,
  };
}
