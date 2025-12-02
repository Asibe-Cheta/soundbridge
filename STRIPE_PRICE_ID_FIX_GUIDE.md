# 🔧 Stripe Price ID Configuration Fix

**Issue:** `No such price: 'prod_TWKFIB2QNglnr3'`  
**Root Cause:** Environment variable contains a **Product ID** instead of a **Price ID**

---

## 🚨 Problem

The error occurs because:
1. Your `STRIPE_PRO_MONTHLY_PRICE_ID` environment variable in Vercel contains a **product ID** (`prod_...`)
2. Stripe subscriptions require **price IDs** (`price_...`), not product IDs
3. Product IDs identify the product, Price IDs identify the specific pricing tier

---

## ✅ Solution

### Step 1: Get the Correct Price ID from Stripe

1. **Go to Stripe Dashboard:** https://dashboard.stripe.com/products
2. **Find your "SoundBridge Pro" product**
3. **Click on the product** to view its details
4. **Look for the "Pricing" section** - you'll see prices listed like:
   - Monthly: £9.99/month → **Price ID: `price_xxxxx`** ← Copy this
   - Yearly: £99.00/year → **Price ID: `price_xxxxx`** ← Copy this

**Important:** 
- ✅ Price IDs start with `price_`
- ❌ Product IDs start with `prod_` (this is what you have now)

### Step 2: Update Vercel Environment Variables

1. **Go to Vercel Dashboard:** https://vercel.com/asibe-chetas-projects/soundbridge/settings/environments/production
2. **Find these environment variables:**
   - `STRIPE_PRO_MONTHLY_PRICE_ID`
   - `STRIPE_PRO_YEARLY_PRICE_ID`
3. **Update each one:**
   - Click on the variable
   - Replace the value with the **Price ID** from Stripe (starts with `price_`)
   - Save

### Step 3: Verify Your Configuration

**Current (WRONG):**
```env
STRIPE_PRO_MONTHLY_PRICE_ID=prod_TWKFIB2QNglnr3  ❌ This is a product ID
STRIPE_PRO_YEARLY_PRICE_ID=prod_TWKGSfBgOtrmMH   ❌ This is a product ID
```

**Should be (CORRECT):**
```env
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxxxx  ✅ Starts with 'price_'
STRIPE_PRO_YEARLY_PRICE_ID=price_xxxxx   ✅ Starts with 'price_'
```

### Step 4: Redeploy

After updating the environment variables:
1. Vercel will automatically redeploy with the new values
2. Or manually trigger a redeploy if needed
3. Test the upgrade flow again

---

## 🔍 How to Find Price IDs in Stripe

### Option 1: From Product Page
1. Stripe Dashboard → Products
2. Click on "SoundBridge Pro"
3. Scroll to "Pricing" section
4. Each price shows its ID below the amount

### Option 2: From Prices Page
1. Stripe Dashboard → Products → Prices
2. Filter by your product
3. Each price shows its ID in the list

### Option 3: From API
If you have access to Stripe CLI or API:
```bash
stripe prices list --product prod_TWKFIB2QNglnr3
```

---

## 📝 Understanding Stripe IDs

### Product ID (`prod_xxxxx`)
- **Purpose:** Identifies the product itself (e.g., "SoundBridge Pro")
- **Use case:** Grouping, metadata, webhooks
- **Cannot be used for:** Creating subscriptions directly

### Price ID (`price_xxxxx`)
- **Purpose:** Identifies a specific pricing tier (e.g., "£9.99/month")
- **Use case:** Creating subscriptions, checkout sessions
- **Required for:** All subscription operations

**Example:**
```
Product: SoundBridge Pro (prod_xxxxx)
  ├─ Price: £9.99/month (price_xxxxx)  ← Use this for monthly subscriptions
  └─ Price: £99.00/year (price_xxxxx)  ← Use this for yearly subscriptions
```

---

## ✅ Verification Checklist

- [ ] Price ID starts with `price_` (not `prod_`)
- [ ] Monthly price ID is configured correctly
- [ ] Yearly price ID is configured correctly
- [ ] Environment variables updated in Vercel
- [ ] Deployment completed
- [ ] Tested upgrade flow successfully

---

## 🐛 If You Still Have Issues

1. **Check Stripe Dashboard:**
   - Ensure prices are **active** (not archived)
   - Ensure prices are for the correct product

2. **Check Environment Variables:**
   - Ensure no extra spaces or characters
   - Ensure correct environment (Production vs Preview)

3. **Check Deployment:**
   - Wait for Vercel deployment to complete
   - Check deployment logs for errors

4. **Test with Stripe CLI:**
   ```bash
   stripe prices retrieve price_xxxxx
   ```

---

## 📞 Need Help?

If you're still having issues:
1. Verify the price exists in Stripe Dashboard
2. Check the price is active and not archived
3. Ensure the price is associated with the correct product
4. Check Vercel deployment logs for environment variable errors