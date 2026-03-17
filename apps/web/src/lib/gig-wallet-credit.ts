/**
 * Gig payment wallet credit — always credit in USD (dollar equivalent) so the Digital Wallet
 * shows one balance regardless of payer/creator country or payment currency (GBP, USD, etc.).
 * WEB_TEAM_GIG_PAYMENT_ADMIN_MONITORING.md, instant wallet flow
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { currencyService } from './currency-service';
import { stripe } from './stripe';

/** Countries where payouts go via Wise (kept for metadata; we now always credit USD). */
export const WISE_COUNTRIES = ['NG', 'GH', 'KE', 'EG', 'ZA', 'UG', 'TZ'] as const;

export interface GigWalletCreditProject {
  id: string;
  creator_user_id: string;
  creator_payout_amount: number | string;
  currency?: string | null;
  title?: string | null;
  opportunity_id?: string;
}

export interface CreditGigPaymentOptions {
  stripePaymentIntentId?: string | null;
  metadata?: Record<string, unknown>;
  descriptionPrefix?: string;
}

export interface CreditGigPaymentResult {
  creditedAmount: number;
  creditedCurrency: string;
  /** Wallet row id used (for follow-up balance read if needed) */
  walletId: string | null;
  /** New balance after credit (if wallet was found/created) */
  newBalance: number;
}

/**
 * Try to get GBP/EUR→USD rate from Stripe balance transaction (charge currency → account default).
 * Returns null if not available (e.g. same-currency charge).
 */
async function getStripeExchangeRateToUsd(
  paymentIntentId: string,
  sourceCurrency: string
): Promise<number | null> {
  const src = sourceCurrency.toUpperCase().slice(0, 3);
  if (src === 'USD') return 1;
  if (!stripe) return null;
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['charges.data.balance_transaction'],
    });
    const charges = (pi as { charges?: { data?: Array<{ balance_transaction?: { exchange_rate?: number } }> } })
      .charges?.data;
    const bt = charges?.[0]?.balance_transaction;
    if (typeof bt === 'object' && bt !== null && typeof (bt as { exchange_rate?: number }).exchange_rate === 'number') {
      return (bt as { exchange_rate: number }).exchange_rate;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Credit creator wallet for a gig payment. Always credits in USD (dollar equivalent) so the
 * Digital Wallet shows one balance regardless of where payment was from or which currency was used.
 */
export async function creditGigPaymentToWallet(
  service: SupabaseClient,
  project: GigWalletCreditProject,
  options: CreditGigPaymentOptions = {}
): Promise<CreditGigPaymentResult> {
  const sourceCurrency = (project.currency || 'GBP').toString().toUpperCase().slice(0, 3);
  const sourceAmount = Number(project.creator_payout_amount);
  const creatorId = project.creator_user_id;
  const projectId = project.id;
  const title = project.title ?? 'Gig';
  const prefix = options.descriptionPrefix ?? 'Gig payment';

  let creditedAmount: number;
  const meta: Record<string, unknown> = { ...options.metadata };

  if (sourceCurrency === 'USD') {
    creditedAmount = sourceAmount;
    meta.fx_source = 'none';
  } else {
    // Convert to USD at point of credit: prefer Stripe charge rate, else live FX
    let rate: number | null = null;
    if (options.stripePaymentIntentId && stripe) {
      rate = await getStripeExchangeRateToUsd(options.stripePaymentIntentId, sourceCurrency);
    }
    if (rate === null || rate <= 0) {
      creditedAmount = await currencyService.convertCurrency(sourceAmount, sourceCurrency, 'USD');
      meta.fx_source = 'live';
    } else {
      creditedAmount = Math.round(sourceAmount * rate * 100) / 100;
      meta.fx_source = 'stripe';
      meta.exchange_rate = rate;
    }
    meta.original_amount = sourceAmount;
    meta.original_currency = sourceCurrency;
  }

  const creditedCurrency = 'USD';

  let wallet: { id: string; balance: number } | null = await service
    .from('user_wallets')
    .select('id, balance')
    .eq('user_id', creatorId)
    .eq('currency', creditedCurrency)
    .maybeSingle()
    .then((r) => r.data as { id: string; balance: number } | null);

  if (!wallet?.id) {
    const { data: created } = await service
      .from('user_wallets')
      .insert({ user_id: creatorId, currency: creditedCurrency })
      .select('id')
      .single();
    if (created?.id) wallet = { id: (created as { id: string }).id, balance: 0 };
  }

  let newBalance = creditedAmount;
  if (wallet?.id) {
    newBalance = Number(wallet.balance ?? 0) + creditedAmount;
    await service.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      user_id: creatorId,
      transaction_type: 'gig_payment',
      amount: creditedAmount,
      currency: creditedCurrency,
      description: `${prefix} — "${title}"`,
      reference_type: 'opportunity_project',
      reference_id: projectId,
      status: 'completed',
      metadata: meta,
      ...(options.stripePaymentIntentId && { stripe_payment_intent_id: options.stripePaymentIntentId }),
    });
    await service
      .from('user_wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);
  }

  return {
    creditedAmount,
    creditedCurrency,
    walletId: wallet?.id ?? null,
    newBalance,
  };
}
