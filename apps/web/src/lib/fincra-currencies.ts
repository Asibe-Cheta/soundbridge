/**
 * Currencies paid out via Fincra (local bank rails: NGN, GHS, KES).
 */
export const FINCRA_CURRENCIES = ['NGN', 'GHS', 'KES'] as const;
export type FincraCurrency = (typeof FINCRA_CURRENCIES)[number];

export function isFincraCurrency(currency: string | null | undefined): boolean {
  if (!currency) return false;
  return FINCRA_CURRENCIES.includes(currency.toUpperCase() as FincraCurrency);
}
