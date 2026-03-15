/**
 * Wise-routed currencies (payouts via Wise, not Stripe Connect).
 * @see WEB_TEAM_WISE_VERIFICATION_STATUS_FIX.md
 */
export const WISE_CURRENCIES = [
  'NGN', 'GHS', 'KES', 'ZAR', 'TZS', 'UGX', 'EGP', 'RWF', 'XOF', 'XAF',
  'INR', 'IDR', 'MYR', 'PHP', 'THB', 'VND', 'BDT', 'PKR', 'LKR', 'NPR', 'CNY', 'KRW',
  'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'CRC', 'UYU',
  'TRY', 'ILS', 'MAD', 'UAH', 'GEL',
] as const;

export type WiseCurrency = (typeof WISE_CURRENCIES)[number];

export function isWiseCurrency(currency: string | null | undefined): boolean {
  if (!currency) return false;
  return WISE_CURRENCIES.includes(currency.toUpperCase() as WiseCurrency);
}
