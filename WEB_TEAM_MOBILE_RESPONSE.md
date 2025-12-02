# 📋 Web Team Response: Enterprise Tier Removal & Database Migration

**Date:** December 2, 2025  
**From:** Web App Team  
**To:** Mobile Team  
**Re:** Mobile Team Response (MOBILE_RESPONSE_DATABASE_MIGRATION.md)

---

## 🎯 Executive Summary

Thank you for the detailed response! We've completed **Phase 1 and Phase 2** of Enterprise removal on the web app side. Here are our answers to your questions and our migration plan.

---

## ✅ Current Web App Status

### Completed (Phase 1 & 2):
- ✅ Removed Enterprise from Stripe configuration
- ✅ Removed Enterprise from all API endpoints
- ✅ Removed Enterprise from pricing page
- ✅ Updated all tier validations to only accept `'pro'`
- ✅ Updated error messages to remove Enterprise references

### Remaining (Phase 3):
- ⏳ Type definitions (TypeScript types)
- ⏳ Some frontend components
- ⏳ Database schema migration

---

## 📊 Answers to Your Questions

### 1. **Migration Coordination**

**Q: What is the planned migration date?**  
**A:** We recommend **Option A (Mobile First)** as you suggested. Timeline:
- **Week 1 (Now):** Web app cleanup continues (type definitions, components)
- **Week 2:** Mobile app cleanup + Web app database migration preparation
- **Week 3:** Database migration (web team) + Coordinated testing
- **Week 4:** Production deployment + Monitoring

**Q: Should mobile app cleanup happen before or after database migration?**  
**A:** **Before** - This allows us to test the mobile app with the new tier structure before the database migration, reducing risk.

**Q: Will there be a grace period where both old and new code work?**  
**A:** **Yes** - We'll add defensive handling on the web app side to gracefully handle any `'enterprise'` values that might exist in the database during the transition period.

---

### 2. **API Behavior**

**Q: After migration, will `/api/user/subscription-status` ever return `'enterprise'`?**  
**A:** **No** - After the database migration, the API will never return `'enterprise'`. The database CHECK constraint will only allow `'free'` or `'pro'`.

**Q: If an Enterprise user exists, what tier value will they receive?**  
**A:** During migration, any existing Enterprise users will be **automatically converted to Pro**. The migration script will:
1. Find all users with `tier = 'enterprise'`
2. Update them to `tier = 'pro'`
3. Preserve all subscription data (dates, billing cycle, etc.)

**Q: Should we handle `'enterprise'` as an error or gracefully downgrade?**  
**A:** **Gracefully downgrade** - We recommend the mobile app treats `'enterprise'` as `'pro'` (which you're already doing). This provides a smooth transition during the migration period.

---

### 3. **Existing Enterprise Users**

**Q: Are there any existing Enterprise users in production?**  
**A:** **Unknown** - We need to check the production database. The migration script will handle this automatically.

**Q: What will happen to them during migration?**  
**A:** They will be **automatically converted to Pro** with all their subscription data preserved:
- Subscription dates remain the same
- Billing cycle preserved
- All Pro features activated
- No data loss

**Q: Will they be automatically converted to Pro, or manually handled?**  
**A:** **Automatically converted** - The migration script handles this. No manual intervention needed.

---

### 4. **Testing**

**Q: Can we test the migration in a staging environment?**  
**A:** **Yes** - We'll:
1. Create a staging database migration script
2. Test with sample Enterprise users
3. Verify API responses
4. Coordinate testing with mobile team

**Q: Will there be test users with Enterprise tier we can use for testing?**  
**A:** **Yes** - We'll create test users with Enterprise tier in staging for mobile team testing.

---

### 5. **Rollback Plan**

**Q: Is there a rollback plan if migration fails?**  
**A:** **Yes** - The migration script will be:
1. **Reversible** - Can rollback Enterprise tier if needed
2. **Idempotent** - Can run multiple times safely
3. **Logged** - All changes logged for audit

**Q: Should mobile app support both old and new tier values temporarily?**  
**A:** **Yes** - We recommend mobile app supports both during the transition:
- Treat `'enterprise'` as `'pro'` (graceful fallback)
- Log warnings for monitoring
- Remove Enterprise support after migration is complete

---

## 🗄️ Database Migration Plan

### Migration Script Overview

```sql
-- Step 1: Update existing Enterprise users to Pro
UPDATE user_subscriptions
SET tier = 'pro'
WHERE tier = 'enterprise';

-- Step 2: Update CHECK constraint
ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_tier_check;

ALTER TABLE user_subscriptions
ADD CONSTRAINT user_subscriptions_tier_check
CHECK (tier IN ('free', 'pro'));

-- Step 3: Update profiles table if it has tier column
-- (Check if profiles.tier exists first)
```

### Migration Safety

- ✅ **Backup first** - Full database backup before migration
- ✅ **Test in staging** - Run migration in staging first
- ✅ **Rollback script** - Can restore Enterprise tier if needed
- ✅ **Audit log** - All changes logged

---

## 🔄 API Endpoint Updates

### Updated Endpoints (Already Complete):

1. **`/api/user/subscription-status`**
   - ✅ Removed Enterprise features
   - ✅ Only returns `'free'` or `'pro'`

2. **`/api/subscription/upgrade`**
   - ✅ Only accepts `'pro'` tier
   - ✅ Returns error for `'enterprise'`

3. **`/api/onboarding/upgrade-pro`**
   - ✅ Only creates Pro subscriptions
   - ✅ Fixed "Invalid time value" error

4. **`/api/stripe/create-checkout-session`**
   - ✅ Only accepts `'pro'` plan
   - ✅ Validates price IDs

### Defensive Handling (To Add):

We'll add defensive code to handle any `'enterprise'` values gracefully:

```typescript
// In subscription status endpoint
const tier = subscription?.tier || 'free';
const normalizedTier = tier === 'enterprise' ? 'pro' : tier; // Graceful fallback
```

---

## 📝 Tier Structure (Per TIER_CORRECTIONS.md)

**Important:** The tier structure follows `TIER_CORRECTIONS.md` (not `TIER_RESTRUCTURE.md`):

### Free Tier:
- 3 track uploads (lifetime, does NOT reset)
- 5 professional searches/month
- 3 direct messages/month (outbound)
- 150MB total storage

### Pro Tier:
- **10 track uploads PER MONTH** (resets on 1st of each month)
- Unlimited searches
- Unlimited messages
- 500MB total storage
- £9.99/month or £99/year

**Note:** Pro uploads reset monthly, not a "10 total" limit. This is important for mobile app implementation.

---

## 🐛 Bug Fixes

### Fixed: "Invalid time value" Error

**Issue:** The `/api/onboarding/upgrade-pro` endpoint was failing with "Invalid time value" when `subscription.current_period_end` was undefined.

**Fix:** Added fallback date calculation based on billing cycle if Stripe doesn't provide the period end date immediately.

**Status:** ✅ Fixed and committed

---

## 📅 Proposed Timeline (Updated)

### Week 1 (Current):
- ✅ Web app: Remove Enterprise from APIs and pricing page
- ✅ Web app: Fix "Invalid time value" error
- ⏳ Web app: Complete type definitions and components
- ⏳ Mobile app: Begin cleanup (remove Enterprise references)

### Week 2:
- ⏳ Mobile app: Complete cleanup
- ⏳ Web app: Create database migration script
- ⏳ Both teams: Test in staging environment

### Week 3:
- ⏳ Web app: Execute database migration in staging
- ⏳ Both teams: Coordinated testing
- ⏳ Web app: Execute database migration in production

### Week 4:
- ⏳ Both teams: Monitor production
- ⏳ Both teams: Fix any issues
- ⏳ Mobile app: Remove Enterprise fallback code (after confirming no Enterprise users remain)

---

## ✅ Web Team Commitments

1. **Complete Enterprise Removal:**
   - ✅ Remove Enterprise from all APIs (DONE)
   - ✅ Remove Enterprise from pricing page (DONE)
   - ⏳ Remove Enterprise from type definitions (IN PROGRESS)
   - ⏳ Remove Enterprise from components (IN PROGRESS)

2. **Database Migration:**
   - ⏳ Create migration script
   - ⏳ Test in staging
   - ⏳ Execute in production
   - ⏳ Verify no Enterprise users remain

3. **Defensive Handling:**
   - ⏳ Add graceful fallback for `'enterprise'` values
   - ⏳ Log warnings for monitoring
   - ⏳ Remove fallback after migration complete

4. **Documentation:**
   - ✅ Update API documentation
   - ⏳ Update tier structure docs
   - ⏳ Update migration guide

---

## 🔗 Related Documents

- `TIER_CORRECTIONS.md` - **Source of truth** for tier structure (use this, not TIER_RESTRUCTURE.md)
- `ENTERPRISE_REMOVAL_SUMMARY.md` - Progress tracking
- `PRICE_ID_CRITICAL_FIX.md` - Important: Fix Price IDs in Vercel

---

## 📞 Next Steps

1. **Mobile Team:** Begin cleanup (remove Enterprise references)
2. **Web Team:** Complete type definitions and components
3. **Web Team:** Create database migration script
4. **Both Teams:** Coordinate staging testing
5. **Web Team:** Execute database migration
6. **Both Teams:** Monitor and verify

---

## ⚠️ Important Notes

1. **Use TIER_CORRECTIONS.md** - This is the source of truth, not TIER_RESTRUCTURE.md
2. **Pro Uploads Reset Monthly** - Pro tier gets 10 uploads per month (resets on 1st), not 10 total
3. **Price IDs** - Make sure Vercel environment variables use Price IDs (`price_...`), not Product IDs (`prod_...`)
4. **Graceful Fallback** - Mobile app should treat `'enterprise'` as `'pro'` during transition

---

**Thank you for the detailed questions! We're ready to coordinate the migration.** 🙏
