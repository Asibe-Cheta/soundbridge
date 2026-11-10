/**
 * Currency-aware minimum payout (WEB_TEAM_PAYOUT_MINIMUM_AND_FEE_TRANSPARENCY.md).
 * Aligned to $25 to match create_payout_request_for_user's own enforced
 * minimum (20260329000000_payout_request_for_user_rpc.sql) — before this,
 * the route let a $20-24.99 request through only for the database to reject
 * it with a different ($25) error message.
 */
export const MIN_PAYOUT_USD = 25;

/** Default minimum when currency is unknown or non-Fincra rail. */
export const MIN_PAYOUT_DEFAULT_USD = MIN_PAYOUT_USD;

export function getMinPayoutForCurrency(_currency?: string | null | undefined): number {
  return MIN_PAYOUT_USD;
}
