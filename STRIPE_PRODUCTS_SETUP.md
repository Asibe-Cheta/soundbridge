# Stripe Products Setup Guide

**For:** Justice (Platform Administrator)
**Purpose:** Create subscription products in Stripe Dashboard
**Date:** December 11, 2025

---

## Overview

You need to create **4 subscription products** in Stripe Dashboard for the new pricing tier structure.

---

## Products to Create

### 1. Premium Monthly

**Product Details:**
- **Product Name:** SoundBridge Premium
- **Description:** Monthly subscription to SoundBridge Premium tier
- **Statement Descriptor:** SOUNDBRIDGE PREMIUM
- **Pricing:**
  - **Amount:** £6.99 GBP
  - **Billing Period:** Monthly (every 1 month)
  - **Type:** Recurring
  - **Currency:** GBP (British Pound)

**Steps:**
1. Go to Stripe Dashboard > Products > Add product
2. Enter product name: "SoundBridge Premium"
3. Add pricing:
   - Model: Standard pricing
   - Price: 6.99
   - Currency: GBP
   - Billing period: Monthly
   - Recurring: Yes
4. Save product
5. **Copy the Price ID** (starts with `price_xxxxx`) - NOT the Product ID!
6. Store as environment variable: `STRIPE_PREMIUM_MONTHLY_PRICE_ID`

---

### 2. Premium Annual

**Product Details:**
- **Product Name:** SoundBridge Premium Annual
- **Description:** Annual subscription to SoundBridge Premium tier (16% discount)
- **Statement Descriptor:** SOUNDBRIDGE PREMIUM
- **Pricing:**
  - **Amount:** £69.99 GBP
  - **Billing Period:** Yearly (every 12 months)
  - **Type:** Recurring
  - **Currency:** GBP (British Pound)

**Annual Savings Calculation:**
- Monthly × 12 = £6.99 × 12 = £83.88
- Annual price = **£69.99**
- Savings = £83.88 - £69.99 = £13.89 (16% discount)

**Steps:**
1. Go to Stripe Dashboard > Products > Add product
2. Enter product name: "SoundBridge Premium Annual"
3. Add pricing:
   - Model: Standard pricing
   - Price: 69.99
   - Currency: GBP
   - Billing period: Yearly
   - Recurring: Yes
4. Save product
5. **Copy the Price ID** (starts with `price_xxxxx`) - NOT the Product ID!
6. Store as environment variable: `STRIPE_PREMIUM_ANNUAL_PRICE_ID`

---

### 3. Unlimited Monthly

**Product Details:**
- **Product Name:** SoundBridge Unlimited
- **Description:** Monthly subscription to SoundBridge Unlimited tier
- **Statement Descriptor:** SOUNDBRIDGE UNLIMITED
- **Pricing:**
  - **Amount:** £12.99 GBP
  - **Billing Period:** Monthly (every 1 month)
  - **Type:** Recurring
  - **Currency:** GBP (British Pound)

**Steps:**
1. Go to Stripe Dashboard > Products > Add product
2. Enter product name: "SoundBridge Unlimited"
3. Add pricing:
   - Model: Standard pricing
   - Price: 12.99
   - Currency: GBP
   - Billing period: Monthly
   - Recurring: Yes
4. Save product
5. **Copy the Price ID** (starts with `price_xxxxx`) - NOT the Product ID!
6. Store as environment variable: `STRIPE_UNLIMITED_MONTHLY_PRICE_ID`

---

### 4. Unlimited Annual

**Product Details:**
- **Product Name:** SoundBridge Unlimited Annual
- **Description:** Annual subscription to SoundBridge Unlimited tier (17% discount)
- **Statement Descriptor:** SOUNDBRIDGE UNLIMITED
- **Pricing:**
  - **Amount:** £129.99 GBP
  - **Billing Period:** Yearly (every 12 months)
  - **Type:** Recurring
  - **Currency:** GBP (British Pound)

**Annual Savings Calculation:**
- Monthly × 12 = £12.99 × 12 = £155.88
- Annual price = **£129.99**
- Savings = £155.88 - £129.99 = £25.89 (17% discount)

**Steps:**
1. Go to Stripe Dashboard > Products > Add product
2. Enter product name: "SoundBridge Unlimited Annual"
3. Add pricing:
   - Model: Standard pricing
   - Price: 129.99
   - Currency: GBP
   - Billing period: Yearly
   - Recurring: Yes
4. Save product
5. **Copy the Price ID** (starts with `price_xxxxx`) - NOT the Product ID!
6. Store as environment variable: `STRIPE_UNLIMITED_ANNUAL_PRICE_ID`

---

## Webhook Setup

After creating products, you need to set up webhooks to sync subscription events with the backend.

### Create Webhook

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. **Endpoint URL:** `https://soundbridge.live/api/webhooks/subscription`
4. **Events to send:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
5. Click "Add endpoint"

### Get Webhook Signing Secret

1. After creating webhook, click on it
2. Click "Reveal" under "Signing secret"
3. **Copy the webhook secret** (starts with `whsec_xxxxx`)
4. Store as environment variable: `STRIPE_WEBHOOK_SECRET`

---

## Environment Variables Summary

After completing the steps above, provide the following environment variables to the development team:

```bash
# Stripe Price IDs (NOT Product IDs!)
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_UNLIMITED_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_UNLIMITED_ANNUAL_PRICE_ID=price_xxxxxxxxxxxxx

# Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Important:** You need the **Price ID** (starts with `price_`), not the Product ID (starts with `prod_`). Each product can have multiple prices, so make sure you copy the correct price ID for each subscription.

---

## Testing

### Test Mode

Before going live, test the entire flow in Stripe Test Mode:

1. Create test products with same pricing
2. Use Stripe test cards (e.g., `4242 4242 4242 4242`)
3. Test subscription creation, renewal, cancellation
4. Verify webhooks are firing correctly
5. Check backend logs for webhook processing

### Test Cards

**Successful payment:**
- Card number: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits

**Payment requires authentication:**
- Card number: `4000 0025 0000 3155`

**Payment fails:**
- Card number: `4000 0000 0000 0002`

### Webhook Testing

Use Stripe CLI to test webhooks locally:

```bash
# Install Stripe CLI
# Listen to webhooks
stripe listen --forward-to localhost:3000/api/webhooks/subscription

# Trigger test event
stripe trigger customer.subscription.created
```

---

## Production Checklist

Before enabling live mode:

- [ ] All 4 products created in Stripe Dashboard
- [ ] Webhook endpoint added and verified
- [ ] Price IDs copied and stored (NOT Product IDs!)
- [ ] Webhook secret copied and stored
- [ ] Environment variables added to production environment
- [ ] Test mode fully tested
- [ ] Backend webhook handler tested
- [ ] Mobile app RevenueCat integration configured
- [ ] Pricing page displays correct prices

---

## Additional Stripe Configuration (Optional)

### Tax Collection

If you want Stripe to handle tax calculation:

1. Go to Settings > Tax
2. Enable "Automatic tax"
3. Configure tax jurisdictions (UK VAT, etc.)

### Customer Portal

Enable customer portal for users to manage subscriptions:

1. Go to Settings > Customer portal
2. Enable portal
3. Configure allowed actions (cancel, update payment method)
4. Add link to customer portal in app settings

### Billing

Configure billing settings:

1. Statement descriptor: "SOUNDBRIDGE"
2. Support email: support@soundbridge.live
3. Invoice footer: Add terms/conditions link

---

## Pricing Summary Reference

| Tier | Monthly | Annual | Savings |
|------|---------|--------|---------|
| Free | £0 | £0 | - |
| Premium | £6.99/month | £69.99/year | 16% (£13.89/year) |
| Unlimited | £12.99/month | £129.99/year | 17% (£25.89/year) |

---

## Support

If you encounter any issues during setup:
- Check Stripe Dashboard > Developers > Logs for webhook errors
- Test with Stripe CLI
- Contact backend team for webhook debugging
- Review `BACKEND_IMPLEMENTATION_SUMMARY.md` for webhook handler details

---

## Next Steps After Stripe Setup

1. ✅ Create products in Stripe
2. ✅ Set up webhooks
3. ✅ Copy **Price IDs** (NOT Product IDs!) and webhook secret
4. ✅ Add environment variables to hosting platform (Vercel/Railway)
5. Configure App Store Connect (iOS subscriptions)
6. Configure Google Play Console (Android subscriptions)
7. Set up RevenueCat (link Stripe, App Store, Play Store)
8. Provide RevenueCat API keys to mobile team
9. Test end-to-end subscription flow
10. Launch! 🚀

