/**
 * Currency-aware minimum payout (WEB_TEAM_PAYOUT_MINIMUM_AND_FEE_TRANSPARENCY.md).
 * Fincra-routed currencies: $20. Others: $20.
 */
import { isWiseCurrency } from './wise-currencies';

export const MIN_PAYOUT_WISE_USD = 20;
export const MIN_PAYOUT_NON_WISE_USD = 20;

export function getMinPayoutForCurrency(currency: string | null | undefined): number {
  if (!currency) return MIN_PAYOUT_NON_WISE_USD;
  return isWiseCurrency(currency) ? MIN_PAYOUT_WISE_USD : MIN_PAYOUT_NON_WISE_USD;
}
