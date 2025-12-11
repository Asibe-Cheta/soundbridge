# How to Find Stripe Price ID

**IMPORTANT:** You need the **Price ID** (starts with `price_`), **NOT** the Product ID (starts with `prod_`).

---

## Why Price ID, Not Product ID?

In Stripe, a **Product** represents what you're selling (e.g., "SoundBridge Premium").
A **Price** represents how much it costs and the billing interval (e.g., £6.99/month).

One product can have multiple prices (monthly, annual, different currencies, etc.).

The webhook handler needs to know **which specific price** was purchased to determine the tier and billing period.

---

## Step-by-Step: Finding the Price ID

### 1. Create Your Product in Stripe Dashboard

1. Go to Stripe Dashboard > **Products** > **Add product**
2. Enter product name: "SoundBridge Premium"
3. Add a price:
   - Amount: **6.99**
   - Currency: **GBP**
   - Billing period: **Monthly**
   - Recurring: **Yes**
4. Click **Save product**

### 2. Locate the Price ID

After saving the product, you'll see the product page with:

```
Product Details
├── Product name: SoundBridge Premium
├── Product ID: prod_ABC123XYZ          ← ❌ NOT THIS!
└── Pricing
    ├── £6.99 / month
    ├── Price ID: price_1ABC2DEF3GHI    ← ✅ THIS IS WHAT YOU NEED!
    └── Created: Dec 11, 2025
```

### 3. Copy the Price ID

Click on the price (£6.99 / month) to see the price details page.

At the top, you'll see:
```
Price ID: price_1ABC2DEF3GHI4JKL5MNO
```

Click the **copy icon** next to the Price ID.

### 4. Add to Environment Variables

```bash
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_1ABC2DEF3GHI4JKL5MNO
```

---

## Quick Visual Reference

### ❌ WRONG - Product ID
```
Product ID: prod_ABC123
```
This identifies the product, but not the specific price.

### ✅ CORRECT - Price ID
```
Price ID: price_1ABC2DEF3GHI4JKL5MNO
```
This identifies the exact price (amount, currency, interval).

---

## All 4 Price IDs You Need

Create these products and copy the Price ID for each:

| Product | Price | Interval | Environment Variable |
|---------|-------|----------|---------------------|
| SoundBridge Premium | £6.99 | Monthly | `STRIPE_PREMIUM_MONTHLY_PRICE_ID` |
| SoundBridge Premium Annual | £69.99 | Yearly | `STRIPE_PREMIUM_ANNUAL_PRICE_ID` |
| SoundBridge Unlimited | £12.99 | Monthly | `STRIPE_UNLIMITED_MONTHLY_PRICE_ID` |
| SoundBridge Unlimited Annual | £129.99 | Yearly | `STRIPE_UNLIMITED_ANNUAL_PRICE_ID` |

---

## How the Backend Uses Price IDs

When a user purchases a subscription, Stripe sends a webhook with the Price ID:

```json
{
  "type": "customer.subscription.created",
  "data": {
    "object": {
      "items": {
        "data": [
          {
            "price": {
              "id": "price_1ABC2DEF3GHI4JKL5MNO",  ← Backend reads this
              "product": "prod_ABC123"
            }
          }
        ]
      }
    }
  }
}
```

The backend looks up this Price ID in environment variables to determine:
- **Tier:** Premium or Unlimited
- **Period:** Monthly or Annual

```typescript
// In webhook handler
const priceIdMap = {
  [process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID]: { tier: 'premium', period: 'monthly' },
  [process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID]: { tier: 'premium', period: 'annual' },
  [process.env.STRIPE_UNLIMITED_MONTHLY_PRICE_ID]: { tier: 'unlimited', period: 'monthly' },
  [process.env.STRIPE_UNLIMITED_ANNUAL_PRICE_ID]: { tier: 'unlimited', period: 'annual' },
};

const { tier, period } = priceIdMap[priceId];
// tier = 'premium', period = 'monthly'
```

---

## Common Mistakes

### ❌ Using Product ID Instead of Price ID
```bash
# WRONG
STRIPE_PREMIUM_MONTHLY_PRICE_ID=prod_ABC123
```
This won't work because the webhook contains the Price ID, not the Product ID.

### ❌ Copying the Wrong Price
If you have multiple prices for one product (e.g., USD and GBP), make sure you copy the correct one:
```
Product: SoundBridge Premium
├── Price 1: $9.99 / month (USD) - price_USD123
└── Price 2: £6.99 / month (GBP) - price_GBP456  ← Copy this one!
```

### ❌ Not Saving the Price ID
After creating the product, don't navigate away without copying the Price ID. It's harder to find later (though you can always go back to Products > [Product Name] > Pricing).

---

## Troubleshooting

### "Where do I find Price ID in the Stripe Dashboard?"

1. Go to **Products**
2. Click on the product name (e.g., "SoundBridge Premium")
3. Scroll to **Pricing** section
4. Click on the price (e.g., "£6.99 / month")
5. The Price ID is at the top of the price details page

### "I only see Product ID, not Price ID"

Make sure you:
1. Click on the **price** (£6.99 / month), not just the product
2. Are looking at the price details page, not the product details page

### "The webhook says 'Unknown price ID'"

This means the Price ID from the webhook doesn't match any environment variable. Check:
1. Did you copy the Price ID correctly (no extra spaces)?
2. Did you restart the server after adding environment variables?
3. Did you deploy the updated environment variables to production?

---

## Testing

After setting up Price IDs, test with Stripe CLI:

```bash
# Listen to webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/subscription

# Trigger a test subscription event
stripe trigger customer.subscription.created
```

Check the logs to ensure the backend correctly identifies the tier and period.

---

**Remember:** Always copy the **Price ID** (starts with `price_`), not the Product ID!
