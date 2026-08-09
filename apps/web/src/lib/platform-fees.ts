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

/**
 * Static, informational figures for payout receipts (WEB_TEAM_PAYOUT_FLOW_FINCRA_QUESTIONS.MD).
 * Both are absorbed by SoundBridge (Fincra transfers are sent with feeBearer: 'business'; Stripe
 * card-processing fees are likewise not passed to creators) — shown on receipts for transparency
 * about the true cost of paying creators, not as amounts deducted from a specific withdrawal.
 * Fixed figures, not computed per-transaction — update here if the underlying rates change.
 */
export const FINCRA_TRANSFER_FEE_NGN_LABEL = 'From ₦50 per transfer (per Fincra dashboard)';
/** Estimated — UK card-processing rate, not a Fincra/GHS/KES-specific figure. */
export const STRIPE_ESTIMATED_FEE_PERCENT = 1.5;
