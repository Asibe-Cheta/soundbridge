# 🗑️ Remove Enterprise Plan - Implementation Guide

**Date:** December 2, 2025  
**Status:** 🔄 In Progress  
**Priority:** 🔴 High

---

## 🎯 Goal

Completely remove all Enterprise plan references from the codebase. The platform now only supports:
- **Free Tier** (default)
- **Pro Tier** (Monthly: £9.99, Yearly: £99.99)

---

## ⚠️ CRITICAL: Price ID Issue

**Your Vercel environment variables currently have Product IDs instead of Price IDs!**

### Current (WRONG):
```env
STRIPE_PRO_MONTHLY_PRICE_ID=prod_TWKFIB2QNglnr3  ❌ This is a PRODUCT ID
STRIPE_PRO_YEARLY_PRICE_ID=prod_TWKGSfBgOtrmMH   ❌ This is a PRODUCT ID
```

### Should be (CORRECT):
```env
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxxxx  ✅ Starts with 'price_'
STRIPE_PRO_YEARLY_PRICE_ID=price_xxxxx   ✅ Starts with 'price_'
```

**How to Fix:**
1. Go to Stripe Dashboard → Products → SoundBridge Pro
2. Click on the product to see its Prices
3. Copy the **Price ID** (starts with `price_`) for:
   - Monthly: £9.99/month
   - Yearly: £99.99/year
4. Update Vercel environment variables with these Price IDs

See `STRIPE_PRICE_ID_FIX_GUIDE.md` for detailed instructions.

---

## 📋 Files to Update

### ✅ Completed
- [x] `apps/web/src/lib/stripe.ts` - Removed Enterprise from config

### 🔄 In Progress
- [ ] API Endpoints (remove Enterprise support)
- [ ] Frontend Components (remove Enterprise UI)
- [ ] Type Definitions (remove Enterprise types)
- [ ] Database Schema (update tier constraints)

### ⏳ Pending
- [ ] Documentation updates
- [ ] Test files
- [ ] Mobile team docs

---

## 🚀 Implementation Steps

### Step 1: API Endpoints

Files to update:
- `apps/web/app/api/stripe/create-checkout-session/route.ts`
- `apps/web/app/api/stripe/webhook/route.ts`
- `apps/web/app/api/subscription/upgrade/route.ts`
- `apps/web/app/api/subscription/status/route.ts`
- `apps/web/app/api/upload/route.ts`
- `apps/web/app/api/upload/validate/route.ts`
- Other subscription/upload endpoints

### Step 2: Frontend Components

Files to update:
- `apps/web/app/pricing/page.tsx` (remove Enterprise tier)
- All components with Enterprise references

### Step 3: Type Definitions

Files to update:
- Remove `'enterprise'` from tier type unions
- Update all `'free' | 'pro' | 'enterprise'` to `'free' | 'pro'`

### Step 4: Database Schema

Files to update:
- Update CHECK constraints to only allow `'free'` and `'pro'`
- Migration script to update existing data

---

## 🔍 Search Pattern

Use these grep patterns to find all Enterprise references:

```bash
# Case-insensitive search
grep -ri "enterprise" apps/web --include="*.ts" --include="*.tsx"
grep -ri "ENTERPRISE" apps/web --include="*.ts" --include="*.tsx"

# Type definitions
grep -ri "'free' | 'pro' | 'enterprise'" apps/web
grep -ri "free.*pro.*enterprise" apps/web
```

---

## ⚠️ Breaking Changes

1. **Existing Enterprise users:** Will need migration plan
2. **API responses:** Remove Enterprise tier from all responses
3. **Database:** Update constraints and migrate existing data
4. **Stripe:** Remove Enterprise price IDs from environment variables

---

## 📝 Notes

- Keep backward compatibility where possible
- Update error messages to remove Enterprise references
- Update upgrade prompts to only mention Pro tier
- Remove Enterprise-specific features from feature lists