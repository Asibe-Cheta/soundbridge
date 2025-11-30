# Tier Restructure - Deployment Guide

**Date:** December 2024  
**Status:** ✅ **READY FOR DEPLOYMENT**  
**Implementation:** Complete

---

## 🎯 Overview

The tier restructure has been fully implemented according to `TIER_RESTRUCTURE.md`. This guide provides step-by-step instructions for deploying the changes to production.

---

## 📋 Pre-Deployment Checklist

### 1. Database Migrations

Run these SQL files in Supabase SQL Editor **in this exact order**:

1. ✅ **`database/tier_restructure_schema.sql`** (Main schema)
   - Updates `user_subscriptions` table
   - Creates `refunds`, `downgrade_track_selections`, `usage_tracking` tables
   - Adds fields to `audio_tracks`
   - Creates all limit checking functions

2. ✅ **`database/update_upload_limits_tier_restructure.sql`** (Upload limits)
   - Updates `check_upload_count_limit()` function
   - Free: 3 lifetime, Pro: 10 total

3. ✅ **`database/update_storage_limits_tier_restructure.sql`** (Storage limits)
   - Updates `check_storage_limit()` function
   - Free: 150MB, Pro: 500MB

4. ✅ **`database/restore_tracks_on_upgrade.sql`** (Track restoration)
   - Function and trigger to restore tracks on upgrade

**⚠️ Important:** Run migrations during low-traffic period. The schema changes are backward-compatible, but test in staging first.

### 2. Stripe Configuration

**Update Stripe Products/Prices:**

1. Go to Stripe Dashboard → Products
2. Update or create Pro Monthly product:
   - Name: "SoundBridge Pro - Monthly"
   - Price: £9.99/month (GBP)
   - Copy the Price ID

3. Update or create Pro Annual product:
   - Name: "SoundBridge Pro - Annual"
   - Price: £99.00/year (GBP)
   - Copy the Price ID

4. Update environment variables:
   ```env
   STRIPE_PRO_MONTHLY_PRICE_ID=price_xxxxx
   STRIPE_PRO_YEARLY_PRICE_ID=price_xxxxx
   ```

**Configure Stripe Webhooks:**

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `charge.refunded`
4. Copy webhook signing secret
5. Add to environment variables:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

### 3. Environment Variables

Ensure these are set in Vercel (Production, Preview, Development):

```env
# Existing
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...

# Updated/New
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxxxx  # Update with new price IDs
STRIPE_PRO_YEARLY_PRICE_ID=price_xxxxx   # Update with new price IDs
STRIPE_WEBHOOK_SECRET=whsec_xxxxx         # Update if changed
```

---

## 🚀 Deployment Steps

### Step 1: Test in Staging (Recommended)

1. Deploy to preview/staging environment
2. Run database migrations on staging Supabase project
3. Test all flows:
   - Free user uploads 3 tracks ✅
   - Free user tries 4th upload → Blocked ✅
   - Free user performs 5 searches ✅
   - Free user tries 6th search → Blocked ✅
   - Free user sends 3 messages ✅
   - Free user tries 4th message → Blocked ✅
   - Upgrade to Pro flow ✅
   - Refund request within 7 days ✅
   - Track selection during downgrade ✅

### Step 2: Deploy to Production

1. **Deploy code:**
   ```bash
   git add .
   git commit -m "feat: Implement tier restructure with Free/Pro limits and 7-day money-back guarantee"
   git push origin main
   ```

2. **Run database migrations** in production Supabase SQL Editor

3. **Update Stripe products/prices** in production Stripe account

4. **Update environment variables** in Vercel production settings

5. **Verify deployment:**
   - Check Vercel deployment logs
   - Test key endpoints:
     - `/api/subscription/status`
     - `/api/user/usage-limits`
     - `/api/search` (with limit checking)
     - `/api/upload` (with limit checking)

### Step 3: Post-Deployment Verification

**Test Critical Flows:**

1. **Upload Limits:**
   - Create test Free user
   - Upload 3 tracks → Should succeed
   - Try 4th upload → Should be blocked with upgrade prompt

2. **Search Limits:**
   - Free user performs 5 searches → Should succeed
   - Try 6th search → Should be blocked with upgrade prompt

3. **Message Limits:**
   - Free user sends 3 messages → Should succeed
   - Try 4th message → Should be blocked with upgrade prompt

4. **Upgrade Flow:**
   - User upgrades to Pro via Stripe checkout
   - Verify subscription created in database
   - Verify limits removed (unlimited searches/messages)

5. **Refund Flow:**
   - User upgrades to Pro
   - User requests refund within 7 days
   - Verify refund processed
   - Verify account downgraded to Free
   - Verify tracks beyond limit set to private

6. **Track Restoration:**
   - User with private tracks re-upgrades
   - Verify tracks automatically restored to public

---

## 📊 Monitoring

### Key Metrics to Monitor

1. **Conversion Rates:**
   - Free → Pro conversion rate
   - Time to conversion
   - Conversion trigger points (upload limit, search limit, message limit)

2. **Limit Hitting:**
   - How many users hit upload limit
   - How many users hit search limit
   - How many users hit message limit
   - Upgrade rate after hitting limits

3. **Refund Metrics:**
   - Refund request rate
   - Refund approval rate
   - Abuse patterns (multiple refunds)

4. **Usage Patterns:**
   - Average uploads per Free user
   - Average searches per Free user
   - Average messages per Free user

### Database Queries for Monitoring

**Upload Limit Hits:**
```sql
SELECT COUNT(*) 
FROM audio_tracks 
WHERE creator_id IN (
  SELECT user_id FROM user_subscriptions WHERE tier = 'free' AND status = 'active'
)
GROUP BY creator_id
HAVING COUNT(*) >= 3;
```

**Search Usage:**
```sql
SELECT usage_type, SUM(count) as total_usage
FROM usage_tracking
WHERE usage_type = 'search'
GROUP BY usage_type;
```

**Refund Rate:**
```sql
SELECT 
  COUNT(*) as total_refunds,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(amount_refunded) as avg_refund_amount
FROM refunds
WHERE refund_date >= NOW() - INTERVAL '30 days';
```

---

## 🐛 Troubleshooting

### Issue: Upload limits not working

**Check:**
1. Function `check_upload_limit()` exists in database
2. User has active subscription record
3. Tracks are not soft-deleted (`deleted_at IS NULL`)

**Fix:**
```sql
-- Verify function exists
SELECT proname FROM pg_proc WHERE proname = 'check_upload_limit';

-- Check user subscription
SELECT * FROM user_subscriptions WHERE user_id = 'user-uuid';

-- Check track count
SELECT COUNT(*) FROM audio_tracks 
WHERE creator_id = 'user-uuid' AND deleted_at IS NULL;
```

### Issue: Search/message limits not resetting

**Check:**
1. User's signup date is correct in `auth.users`
2. `usage_tracking` table has records
3. Billing period calculation is correct

**Fix:**
```sql
-- Check user signup date
SELECT id, created_at FROM auth.users WHERE id = 'user-uuid';

-- Check usage tracking
SELECT * FROM usage_tracking WHERE user_id = 'user-uuid';

-- Manually reset (if needed)
UPDATE usage_tracking 
SET count = 0, last_reset_date = NOW()
WHERE user_id = 'user-uuid' AND usage_type = 'search';
```

### Issue: Refund not processing

**Check:**
1. Stripe webhook is configured correctly
2. `STRIPE_WEBHOOK_SECRET` is set
3. User is within 7-day window
4. Subscription has `stripe_subscription_id`

**Fix:**
- Check Stripe webhook logs in Stripe Dashboard
- Verify webhook endpoint is receiving events
- Check refund endpoint logs in Vercel

### Issue: Tracks not restoring on upgrade

**Check:**
1. Trigger `trigger_restore_tracks_on_upgrade` exists
2. Tracks have `uploaded_during_tier` set
3. Tracks are `private` (not deleted)

**Fix:**
```sql
-- Manually restore tracks
SELECT restore_tracks_on_upgrade('user-uuid');

-- Check track visibility
SELECT id, title, visibility, uploaded_during_tier 
FROM audio_tracks 
WHERE creator_id = 'user-uuid';
```

---

## 📝 Files Changed Summary

### Database Files (New)
- `database/tier_restructure_schema.sql` - Main schema
- `database/update_upload_limits_tier_restructure.sql` - Upload limits
- `database/update_storage_limits_tier_restructure.sql` - Storage limits
- `database/restore_tracks_on_upgrade.sql` - Track restoration

### API Files (New)
- `apps/web/app/api/subscription/refund/route.ts` - Refund processing
- `apps/web/app/api/subscription/restore-tracks/route.ts` - Track restoration
- `apps/web/app/api/user/usage-limits/route.ts` - Usage limits endpoint

### API Files (Updated)
- `apps/web/app/api/subscription/upgrade/route.ts` - Pricing, start date
- `apps/web/app/api/subscription/cancel/route.ts` - Refund option
- `apps/web/app/api/subscription/status/route.ts` - Limits, guarantee info
- `apps/web/app/api/search/route.ts` - Limit checking
- `apps/web/app/api/upload/route.ts` - Updated error messages
- `apps/web/app/api/upload/validate/route.ts` - Updated validation
- `apps/web/app/api/stripe/webhook/route.ts` - Subscription events

### Service Files (Updated)
- `apps/web/src/lib/messaging-service.ts` - Message limit checking

### UI Files (Updated)
- `apps/web/app/pricing/page.tsx` - Updated pricing, features, FAQ

---

## ✅ Success Criteria

Deployment is successful when:

- ✅ All database migrations run without errors
- ✅ Free users can upload 3 tracks (lifetime)
- ✅ Free users can perform 5 searches/month
- ✅ Free users can send 3 messages/month (outbound)
- ✅ Pro users have unlimited searches/messages
- ✅ Pro users can upload 10 tracks (total)
- ✅ Upgrade flow works with Stripe
- ✅ Refund flow works within 7-day window
- ✅ Track visibility management works
- ✅ Limits reset on signup anniversary
- ✅ Pricing page shows correct information
- ✅ No errors in production logs

---

## 🎉 Implementation Complete!

All backend infrastructure, database schema, API endpoints, and core UI components have been updated. The tier restructure is ready for deployment.

**Next Steps:**
1. Run database migrations
2. Update Stripe products/prices
3. Deploy to production
4. Monitor metrics
5. Gather user feedback

---

**Questions?** Refer to:
- `TIER_RESTRUCTURE.md` - Original requirements
- `TIER_RESTRUCTURE_IMPLEMENTATION_COMPLETE.md` - Implementation details
- This file - Deployment guide
