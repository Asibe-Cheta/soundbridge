/**
 * Fincra-routed currencies (African payouts via Fincra, not Stripe Connect).
 * Kept backwards-compatible exports to avoid broad refactors.
 */
export const FINCRA_CURRENCIES = ['NGN', 'GHS', 'KES'] as const;
export type FincraCurrency = (typeof FINCRA_CURRENCIES)[number];

export function isFincraCurrency(currency: string | null | undefined): boolean {
  if (!currency) return false;
  return FINCRA_CURRENCIES.includes(currency.toUpperCase() as FincraCurrency);
}

// Backward-compat aliases used across existing payout code paths.
export const WISE_CURRENCIES = FINCRA_CURRENCIES;
export type WiseCurrency = FincraCurrency;
export const isWiseCurrency = isFincraCurrency;
