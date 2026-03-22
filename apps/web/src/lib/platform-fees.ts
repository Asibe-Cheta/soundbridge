/**
 * Unified platform fee for digital monetization (gigs, tips, event tickets, audio sales).
 * @see MOBILE_PRICING_MODEL_UPDATE.md — 15% platform / 85% creator; tier does not change the fee.
 */
export const PLATFORM_FEE_DECIMAL = 0.15;
export const PLATFORM_FEE_PERCENT = 15;
export const CREATOR_SHARE_DECIMAL = 0.85;

/** Single fee percent for all subscription tiers (no tiered monetization fees). */
export function getMonetizationPlatformFeePercent(): number {
  return PLATFORM_FEE_PERCENT;
}
