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

/**
 * Minimum direct-card tip amount, by currency — below this a card tip loses
 * money after Stripe's fixed per-transaction fee. Confirmed empirically
 * (2026-11-09 revenue report): every $1 tip nets -$0.07 to -$0.09 after
 * Stripe's fee; tips >=$3 are reliably net-positive. $5 gives headroom above
 * that break-even point rather than sitting right on it.
 *
 * Does NOT apply to Gift Bundle tips (handleGiftBundleTip in
 * gift-bundle-tip.ts) — confirmed by reading that file: those debit a
 * prepaid balance with payment_intent_id/stripe_payment_intent_id both null
 * throughout, no Stripe call of any kind per tip. The only Stripe fee on
 * that money was already paid once, at top-up time, so a sub-$5 Gift Bundle
 * tip costs nothing extra to process and is correctly exempt. There is no
 * separate "wallet balance" tip path in this codebase distinct from Gift
 * Bundle — searched for one, found none.
 *
 * Static, approximate currency-equivalent figures, not live FX — same
 * pattern as STRIPE_ESTIMATED_FEE_PERCENT above; update here if rates drift
 * meaningfully. NGN is not in STRIPE_SUPPORTED_CURRENCIES (create-tip/
 * route.ts, fan-landing-tip/route.ts) — a Nigerian creator's tip is actually
 * charged in USD today, so this value isn't enforced by any route yet;
 * included for if/when an NGN display-amount layer is added (same pattern
 * as the GHS ticket display amounts).
 */
export const MINIMUM_TIP_AMOUNTS: Record<string, number> = {
  usd: 5,
  gbp: 4,
  eur: 4.5,
  ngn: 7500,
};

export function getMinimumTipAmount(currencyLower: string): number {
  return MINIMUM_TIP_AMOUNTS[currencyLower] ?? MINIMUM_TIP_AMOUNTS.usd;
}
