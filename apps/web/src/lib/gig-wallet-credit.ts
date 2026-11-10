/**
 * Gig payment wallet credit — always credit in USD (dollar equivalent) so the Digital Wallet
 * shows one balance regardless of payer/creator country or payment currency (GBP, USD, etc.).
 * WEB_TEAM_GIG_PAYMENT_ADMIN_MONITORING.md, instant wallet flow
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { currencyService } from './currency-service';
import { stripe } from './stripe';

/** Countries where creators typically withdraw to a local bank via Fincra (NG/GH/KE). Used for email copy only. */
export const FINCRA_LOCAL_BANK_COUNTRY_CODES = ['NG', 'GH', 'KE'] as const;

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
  /** Only confirm-delivery currently has this breakdown available; the other
   * 3 call sites (complete, admin/release-escrow, cron/auto-release) omit it,
   * which preserves their current behavior exactly — none of them have ever
   * recorded platform_revenue for a gig. Not expanding that scope here. */
  platformRevenue?: {
    grossAmountMinor: number;
    platformFeeMinor: number;
    platformFeePercent?: number;
    paymentMethodType?: string | null;
  };
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

  // finalize_gig_payment (20261110120000_atomic_gig_payment_finalization.sql)
  // locks the opportunity_projects row, marks it completed, credits the
  // wallet via add_wallet_transaction (atomic balance update + its own
  // idempotency check — not reimplemented here), and optionally records
  // platform_revenue, all in one transaction. Replaces this function's old
  // hand-rolled SELECT-then-INSERT-then-UPDATE, which had no row lock, no
  // atomic increment, and — notably — never even checked whether the insert
  // or update succeeded.
  const { data, error } = await service.rpc('finalize_gig_payment', {
    p_project_id: projectId,
    p_creator_id: creatorId,
    p_credited_amount: creditedAmount,
    p_credited_currency: creditedCurrency,
    p_stripe_payment_intent_id: options.stripePaymentIntentId ?? null,
    p_title: title,
    p_description_prefix: prefix,
    p_metadata: meta,
    p_gross_amount_minor: options.platformRevenue?.grossAmountMinor ?? null,
    p_platform_fee_minor: options.platformRevenue?.platformFeeMinor ?? null,
    p_platform_fee_percent: options.platformRevenue?.platformFeePercent ?? 15,
    p_payment_method_type: options.platformRevenue?.paymentMethodType ?? null,
  });

  if (error) {
    await service.from('gig_finalize_failures').insert({
      project_id: projectId,
      source: 'creditGigPaymentToWallet',
      error_message: error.message,
      error_detail: error as unknown as Record<string, unknown>,
    });
    throw new Error(`finalize_gig_payment failed for project ${projectId}: ${error.message}`);
  }

  const result = data as {
    already_completed: boolean;
    wallet_transaction_id: string | null;
    new_balance: number | null;
  };

  return {
    creditedAmount,
    creditedCurrency,
    walletId: null,
    newBalance: Number(result.new_balance ?? creditedAmount),
  };
}
