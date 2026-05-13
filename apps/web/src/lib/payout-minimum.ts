/**
 * Currency-aware minimum payout (WEB_TEAM_PAYOUT_MINIMUM_AND_FEE_TRANSPARENCY.md).
 */
export const MIN_PAYOUT_USD = 20;

/** Default minimum when currency is unknown or non-Fincra rail. */
export const MIN_PAYOUT_DEFAULT_USD = MIN_PAYOUT_USD;

export function getMinPayoutForCurrency(_currency?: string | null | undefined): number {
  return MIN_PAYOUT_USD;
}
