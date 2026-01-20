# Web App Alignment: Event Paid Gating & Upgrade UI

This document summarizes the mobile fixes applied for paid event gating and the upgrade prompt, so web can mirror behavior and data sources. Please confirm any discrepancies or ask for clarifications where needed.

## Context
- Mobile users on TestFlight (RevenueCat sandbox) with active Premium were still blocked from paid event creation.
- The “Upgrade to Monetize” modal displayed stale/incorrect Premium benefits and price.

## Mobile Fixes Applied

### 1) Paid Event Gating: Tier Source of Truth
Mobile now resolves subscription tier in this order to avoid false “free” gating:
1. **Mobile IAP (RevenueCat)** when available (TestFlight / App Store)
2. **Backend subscription API** → `GET /api/subscription/status` (via `subscriptionService`)
3. **Profiles fallback** → `profiles.subscription_tier` (normalized `pro` → `premium`)

Result: TestFlight Premium users are correctly recognized and can toggle paid events.

### 2) Paid Event Gating: Refresh on Return
When user returns from the Upgrade screen, the Create Event screen re-checks subscription status (via `useFocusEffect`) to prevent stale gating.

### 3) Upgrade Modal Content Accuracy
Mobile now uses the same plan definitions as the Upgrade screen, so the benefits list stays consistent:
- Premium features now include **Host paid events** and **Sell audio downloads**.
- Free plan no longer claims paid events.
- Modal price uses RevenueCat `priceString` when available, otherwise falls back to plan defaults.

## Plan Data Source (Mobile)
The plan definitions are centralized in:
- `src/constants/subscriptionPlans.ts`

This is used by:
- `UpgradeScreen` (full plan display)
- `UpgradeForPaidEventsModal` (top 4 Premium benefits, with icons inferred from text)

## Expected Behavior (Match on Web)
1. **Paid event gating**: allow paid events only if tier is `premium` or `unlimited` **and** status is `active`.
2. **Pricing prompt**: show Premium benefits consistent with Upgrade screen.
3. **Pricing label**: if available, show localized price from your store/RC equivalent.
4. **Refresh on return**: when user returns from upgrade, re-check subscription status.

## Questions for Web Team
Please confirm (using your web subscription source of truth):
1. **Tier source of truth**: Which system determines `tier` and `status` on web?
2. **Status handling**: Do you gate paid events if `status !== active` (e.g., `past_due`, `cancelled`)?
3. **Price source**: Are you showing localized store/checkout price or a static plan price?
4. **Benefits list**: Which Premium features should appear in the paid-event upgrade modal on web?

If any of the above differs, tell us what to align to so mobile can follow the same source of truth.

## Web status (Jan 20, 2026)

- **API gating updated**: `/api/events` now checks `subscription_tier` + `subscription_status` (with `pro → premium` normalization) and blocks paid events if status is not `active`. Creator role is no longer required.
- **Create Event UI**: Added paid‑event upgrade prompt in the Pricing section with benefits aligned to the upgrade screen.
- **Refresh on return**: Create Event page now refreshes subscription status on focus/visibility.

## Open items

- Pricing page still lists “Create & sell event tickets” on Free. Should we update it to match paid‑event gating (Premium/Unlimited only)?
