import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptSecret } from '@/src/lib/encryption';
import { fincraCountryForCurrency, isFincraCurrency, type FincraCurrency } from '@/src/lib/fincra';

function decodeMaybeEnc(s: string): string {
  const t = String(s || '');
  if (!t.includes(':')) return t;
  try {
    return decryptSecret(t);
  } catch {
    return t;
  }
}

function isFincraLocalBankRow(row: {
  currency?: string | null;
  stripe_account_id?: string | null;
}): boolean {
  const cur = String(row.currency || '').toUpperCase();
  if (!isFincraCurrency(cur)) return false;
  const sid = row.stripe_account_id;
  if (sid != null && String(sid).trim() !== '') return false;
  return true;
}

/**
 * Ensures `wallet_withdrawal_methods` has a verified `bank_transfer` row for each
 * verified Fincra-rail `creator_bank_accounts` row (NGN/GHS/KES, non–Stripe Connect).
 * Safe for any authenticated user (not creator-only); idempotent per user+currency.
 */
export async function syncFincraWalletWithdrawalMethodsFromCreatorBank(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ synced: number }> {
  const { data: rows, error } = await supabase
    .from('creator_bank_accounts')
    .select(
      'currency, is_verified, stripe_account_id, account_holder_name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, updated_at',
    )
    .eq('user_id', userId)
    .eq('is_verified', true);

  if (error || !rows?.length) {
    return { synced: 0 };
  }

  const fincraRows = rows.filter((r) => isFincraLocalBankRow(r));
  if (!fincraRows.length) {
    return { synced: 0 };
  }

  fincraRows.sort((a, b) => {
    const ta = new Date(String(a.updated_at || 0)).getTime();
    const tb = new Date(String(b.updated_at || 0)).getTime();
    return tb - ta;
  });

  const seenCurrency = new Set<string>();
  let synced = 0;

  for (const bank of fincraRows) {
    const currency = String(bank.currency || '').toUpperCase() as FincraCurrency;
    if (seenCurrency.has(currency)) continue;
    seenCurrency.add(currency);

    const accountNumber = decodeMaybeEnc(String(bank.account_number_encrypted || ''));
    const bankCode = decodeMaybeEnc(String(bank.routing_number_encrypted || ''));
    if (!accountNumber.trim() || !bankCode.trim()) continue;

    const country = fincraCountryForCurrency(currency);
    const methodName = `${String(bank.bank_name || 'Bank').trim()} (${currency})`;

    const encrypted_details = {
      account_holder_name: String(bank.account_holder_name || 'Account Holder').trim(),
      bank_name: String(bank.bank_name || 'Bank').trim(),
      account_number: accountNumber.trim(),
      bank_code: bankCode.trim(),
      routing_number: bankCode.trim(),
      account_type: String(bank.account_type || 'checking'),
      currency,
    };

    const { data: existingList, error: findErr } = await supabase
      .from('wallet_withdrawal_methods')
      .select('id')
      .eq('user_id', userId)
      .eq('method_type', 'bank_transfer')
      .eq('currency', currency)
      .order('created_at', { ascending: true })
      .limit(1);

    if (findErr) {
      console.error('syncFincraWalletWithdrawalMethodsFromCreatorBank find:', findErr);
      continue;
    }

    const existingId = existingList?.[0]?.id;

    if (existingId) {
      const { error: upErr } = await supabase
        .from('wallet_withdrawal_methods')
        .update({
          method_name: methodName,
          country,
          encrypted_details,
          is_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingId);
      if (upErr) {
        console.error('syncFincraWalletWithdrawalMethodsFromCreatorBank update:', upErr);
        continue;
      }
    } else {
      const { error: insErr } = await supabase.from('wallet_withdrawal_methods').insert({
        user_id: userId,
        method_type: 'bank_transfer',
        method_name: methodName,
        country,
        currency,
        banking_system: 'ACH',
        encrypted_details,
        is_verified: true,
        is_default: false,
      });
      if (insErr) {
        console.error('syncFincraWalletWithdrawalMethodsFromCreatorBank insert:', insErr);
        continue;
      }
    }
    synced += 1;
  }

  return { synced };
}

export function pickVerifiedFincraCreatorBankAccount<
  T extends {
    currency?: string | null;
    is_verified?: boolean | null;
    stripe_account_id?: string | null;
    updated_at?: string | null;
  },
>(rows: T[] | null | undefined): T | null {
  const list = (rows ?? []).filter((r) => r.is_verified && isFincraLocalBankRow(r));
  if (!list.length) return null;
  list.sort((a, b) => {
    const ta = new Date(String(a.updated_at || 0)).getTime();
    const tb = new Date(String(b.updated_at || 0)).getTime();
    return tb - ta;
  });
  return list[0] ?? null;
}
