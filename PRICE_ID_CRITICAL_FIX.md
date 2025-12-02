# 🚨 CRITICAL: Fix Stripe Price IDs in Vercel

**Issue:** Your environment variables contain **Product IDs** instead of **Price IDs**

---

## ⚠️ Current Problem

Looking at your Vercel screenshots, you have:

```
STRIPE_PRO_MONTHLY_PRICE_ID=prod_TWKFIB2QNglnr3  ❌ WRONG - This is a PRODUCT ID
STRIPE_PRO_YEARLY_PRICE_ID=prod_TWKGSfBgOtrmMH   ❌ WRONG - This is a PRODUCT ID
```

**These will NOT work for subscriptions!** Stripe requires **Price IDs** (starting with `price_`), not Product IDs (starting with `prod_`).

---

## ✅ How to Fix

### Step 1: Get Price IDs from Stripe

1. **Go to Stripe Dashboard:** https://dashboard.stripe.com/products
2. **Find "SoundBridge Pro" product** (it should have the product ID `prod_TWKFIB2QNglnr3` or similar)
3. **Click on the product** to open its details
4. **Look for the "Pricing" section** - you'll see prices like:
   ```
   Monthly: £9.99/month
   Price ID: price_xxxxx  ← Copy this
   
   Yearly: £99.99/year
   Price ID: price_xxxxx  ← Copy this
   ```

### Step 2: Update Vercel Environment Variables

1. **Go to Vercel:** https://vercel.com/asibe-chetas-projects/soundbridge/settings/environments/production
2. **Find `STRIPE_PRO_MONTHLY_PRICE_ID`**
   - Click on it
   - Replace with the **Price ID** from Stripe (starts with `price_`)
   - Save
3. **Find `STRIPE_PRO_YEARLY_PRICE_ID`**
   - Click on it
   - Replace with the **Price ID** from Stripe (starts with `price_`)
   - Save

### Step 3: Verify

After updating, your environment variables should look like:

```env
STRIPE_PRO_MONTHLY_PRICE_ID=price_1ABC123...  ✅ Correct format
STRIPE_PRO_YEARLY_PRICE_ID=price_1XYZ789...   ✅ Correct format
```

### Step 4: Redeploy

- Vercel will auto-redeploy, or
- Manually trigger a redeploy
- Test the upgrade flow again

---

## 🔍 How to Identify Price vs Product ID

| Type | Format | Example | Use Case |
|------|--------|---------|----------|
| **Product ID** | `prod_xxxxx` | `prod_TWKFIB2QNglnr3` | Groups multiple prices |
| **Price ID** | `price_xxxxx` | `price_1ABC123def456` | Used for subscriptions ✅ |

**For subscriptions, you MUST use Price IDs!**

---

## 📝 Quick Checklist

- [ ] Logged into Stripe Dashboard
- [ ] Found "SoundBridge Pro" product
- [ ] Copied Monthly Price ID (starts with `price_`)
- [ ] Copied Yearly Price ID (starts with `price_`)
- [ ] Updated `STRIPE_PRO_MONTHLY_PRICE_ID` in Vercel
- [ ] Updated `STRIPE_PRO_YEARLY_PRICE_ID` in Vercel
- [ ] Verified both start with `price_`
- [ ] Redeployed application
- [ ] Tested upgrade flow

---

## 🐛 If You Can't Find the Price IDs

**Option 1: Create New Prices**
1. Stripe Dashboard → Products
2. Click on "SoundBridge Pro"
3. Click "Add another price"
4. Set amount: £9.99/month (GBP)
5. Copy the new Price ID
6. Repeat for £99.99/year

**Option 2: Use Stripe CLI**
```bash
stripe prices list --product prod_TWKFIB2QNglnr3
```

This will show all prices for that product.

---

## ⚠️ Important Notes

1. **Product IDs vs Price IDs:** They look similar but are different!
   - Product: `prod_...` = The subscription product itself
   - Price: `price_...` = The specific pricing tier (monthly/yearly)

2. **Multiple Prices per Product:** One product can have multiple prices (monthly, yearly, etc.)

3. **Active Prices Only:** Make sure the prices are **active** (not archived) in Stripe

---

## ✅ After Fixing

Once you've updated the environment variables, the error should disappear. The code now validates that Price IDs start with `price_` and will give you a clear error message if you use Product IDs.

---

**Need help?** Check `STRIPE_PRICE_ID_FIX_GUIDE.md` for more detailed instructions.