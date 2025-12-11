# SoundBridge Pricing Tier Restructure - Deployment Handoff

**Status:** ✅ Backend Implementation Complete
**Date:** December 11, 2025
**Next Owner:** Justice (for Stripe/App Store setup)

---

## Executive Summary

All backend code for the pricing tier restructure is **complete and ready for deployment**. The implementation includes:

- ✅ Database schema for subscription management
- ✅ API endpoints for webhooks, upload limits, custom usernames, analytics
- ✅ Cron jobs for subscription management and collaboration matching
- ✅ Frontend analytics component
- ✅ Stream event tracking in audio player
- ✅ Comprehensive documentation for mobile team

**Your Action Items:**
1. Run database migrations (see below)
2. Create 4 Stripe subscription products (see STRIPE_PRODUCTS_SETUP.md)
3. Set up webhooks and provide environment variables
4. Configure App Store Connect & Google Play Console
5. Set up RevenueCat
6. Forward MOBILE_IMPLEMENTATION_GUIDE.md to mobile team
7. Deploy backend code

---

## Step 1: Run Database Migrations

Execute this SQL file in your Supabase database:

```bash
psql $DATABASE_URL -f database/subscription_tier_schema.sql
```

**What this does:**
- Adds subscription columns to `profiles` table
- Creates helper functions for upload limits, username validation
- Sets up indexes for performance
- Initializes all existing users as "free" tier

**Verification:**
```sql
-- Check that new columns exist
SELECT subscription_tier, uploads_this_period, total_uploads_lifetime, custom_username
FROM profiles
LIMIT 5;

-- Check that functions exist
SELECT proname FROM pg_proc WHERE proname IN ('check_upload_limit', 'update_custom_username');
```

---

## Step 2: Create Stripe Products

Follow the step-by-step guide in **[STRIPE_PRODUCTS_SETUP.md](STRIPE_PRODUCTS_SETUP.md)**.

**Summary - Create 4 products:**

| Product | Price | Billing |
|---------|-------|---------|
| SoundBridge Premium | £6.99 | Monthly |
| SoundBridge Premium Annual | £69.99 | Yearly (16% discount) |
| SoundBridge Unlimited | £12.99 | Monthly |
| SoundBridge Unlimited Annual | £129.99 | Yearly (17% discount) |

**After creating each product:**
1. Copy the **Price ID** (starts with `price_xxxxx`) - **NOT** the Product ID!
2. Store in a secure note for environment variables

**Important:** You need the Price ID, not the Product ID. When you create a product in Stripe, it will have both a Product ID and a Price ID. Make sure you copy the Price ID.

---

## Step 3: Set Up Webhooks

### Stripe Webhook

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://soundbridge.live/api/webhooks/subscription`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
4. Copy webhook signing secret (starts with `whsec_xxxxx`)

### RevenueCat Webhook

1. Go to RevenueCat Dashboard > Project Settings > Integrations
2. Add webhook: `https://soundbridge.live/api/webhooks/subscription`
3. Copy webhook secret

---

## Step 4: Environment Variables

Add these to your hosting platform (Vercel/Railway):

```bash
# Stripe Price IDs (from Step 2) - IMPORTANT: Use price_xxxxx NOT prod_xxxxx!
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_xxxxx
STRIPE_UNLIMITED_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_UNLIMITED_ANNUAL_PRICE_ID=price_xxxxx

# Webhook Secrets (from Step 3)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
REVENUECAT_WEBHOOK_SECRET=xxxxx

# Cron Secret (generate random 32-char string)
CRON_SECRET=your_random_secret_here
```

**Generate Cron Secret:**
```bash
# In terminal
openssl rand -hex 32
```

---

## Step 5: Set Up Cron Jobs

Choose **ONE** of these options:

### Option A: Vercel Cron (Recommended)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/subscription-management",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/collaboration-matching",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

### Option B: External Cron Service (cron-job.org)

1. Create account at cron-job.org
2. Add two cron jobs:
   - **Daily at 00:00 UTC:** `https://soundbridge.live/api/cron/subscription-management`
   - **Weekly Monday at 09:00 UTC:** `https://soundbridge.live/api/cron/collaboration-matching`
3. Add header to both: `Authorization: Bearer ${CRON_SECRET}`

---

## Step 6: App Store & Play Store Setup

### iOS (App Store Connect)

Create 4 in-app subscriptions with these Product IDs:
- `soundbridge_premium_monthly` - £6.99/month
- `soundbridge_premium_annual` - £69.16/year
- `soundbridge_unlimited_monthly` - £12.99/month
- `soundbridge_unlimited_annual` - £129.38/year

**Group:** Create subscription group "SoundBridge Subscriptions"

### Android (Google Play Console)

Create 4 subscription products matching iOS pricing.

**Important:** Use same Product IDs for cross-platform consistency.

---

## Step 7: RevenueCat Configuration

1. Create offerings:
   - `premium` (monthly + annual packages)
   - `unlimited` (monthly + annual packages)
2. Link Stripe, App Store Connect, Google Play Console
3. Copy API keys
4. Provide to mobile team

---

## Step 8: Deploy Backend Code

All backend files are ready in the repository. Deploy to production:

```bash
git add .
git commit -m "feat: implement pricing tier restructure

- Add subscription management (Free/Premium/Unlimited)
- Implement upload limits (3 lifetime, 7/month, unlimited)
- Add webhook handlers for RevenueCat and Stripe
- Create cron jobs for subscription management
- Add advanced analytics for Premium/Unlimited
- Implement custom usernames and collaboration matching
- Create comprehensive documentation for mobile team"
git push origin main
```

This will auto-deploy to Vercel.

---

## Step 9: Mobile Team Handoff

Forward these files to the mobile team:

1. **[MOBILE_IMPLEMENTATION_GUIDE.md](MOBILE_IMPLEMENTATION_GUIDE.md)** - Complete implementation guide with code examples
2. **[pricing-tier-update-specification.md](pricing-tier-update-specification.md)** - Original specification

**Mobile team deliverables:**
- Update RevenueCat integration
- Implement 3-tier pricing page
- Add tier badges to profiles
- Enforce upload limits
- Gate features by tier
- Implement upgrade prompts
- Test all subscription flows

---

## Files Created/Modified

### Database Schema
- ✅ `database/subscription_tier_schema.sql` - Subscription management schema

### API Endpoints
- ✅ `apps/web/app/api/webhooks/subscription/route.ts` - RevenueCat/Stripe webhooks
- ✅ `apps/web/app/api/upload/check-limit/route.ts` - Upload limit checking
- ✅ `apps/web/app/api/profile/custom-username/route.ts` - Custom username management
- ✅ `apps/web/app/api/analytics/advanced/route.ts` - Advanced analytics (existing)
- ✅ `apps/web/app/api/cron/subscription-management/route.ts` - Daily subscription tasks
- ✅ `apps/web/app/api/cron/collaboration-matching/route.ts` - Weekly AI matching

### Frontend Components
- ✅ `apps/web/src/components/analytics/AdvancedAnalytics.tsx` - Analytics dashboard
- ✅ `apps/web/src/lib/audio-player-service.ts` - Enhanced with stream tracking

### Documentation
- ✅ `BACKEND_IMPLEMENTATION_SUMMARY.md` - Full backend details
- ✅ `MOBILE_IMPLEMENTATION_GUIDE.md` - Mobile team guide
- ✅ `STRIPE_PRODUCTS_SETUP.md` - Stripe configuration
- ✅ `IMPLEMENTATION_QUICK_REFERENCE.md` - Quick reference
- ✅ `DEPLOYMENT_HANDOFF.md` - This file

---

## Testing Checklist

### High Priority (Before Launch)

- [ ] Database migration runs successfully
- [ ] All 4 Stripe products created
- [ ] Webhook endpoints return 200 OK
- [ ] Test subscription purchase (Stripe test card)
- [ ] Test upload limit enforcement (Free: 3, Premium: 7)
- [ ] Test custom username setting (Premium/Unlimited)
- [ ] Test advanced analytics access (Premium/Unlimited)
- [ ] Test subscription cancellation
- [ ] Cron jobs execute successfully

### Test Subscription Flow

```bash
# Use Stripe test card
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits

# Expected behavior:
1. Purchase Premium Monthly (£6.99)
2. Check profile: subscription_tier = 'premium'
3. Upload 7 tracks (should succeed)
4. Try 8th upload (should fail with limit message)
5. Check advanced analytics (should show data)
6. Set custom username (should succeed)
7. Cancel subscription
8. Check profile: subscription_status = 'cancelled'
```

---

## Common Issues & Solutions

### Issue: Webhook returns 401 Unauthorized
**Solution:** Check webhook secret matches environment variable

### Issue: Upload limit not enforcing
**Solution:** Verify database function `check_upload_limit()` exists, check user's `subscription_tier` value

### Issue: Advanced analytics returns 403
**Solution:** User is on Free tier, this is correct behavior

### Issue: Cron job returns 401
**Solution:** Verify `Authorization: Bearer ${CRON_SECRET}` header is set

### Issue: Custom username fails with "Already taken"
**Solution:** Username is reserved or already in use, check `profiles.custom_username`

---

## Pricing Summary Reference

| Feature | Free | Premium (£6.99/mo) | Unlimited (£12.99/mo) |
|---------|------|-------------------|----------------------|
| **Uploads** | 3 lifetime | 7/month | Unlimited |
| **Custom URL** | ❌ | ✅ | ✅ |
| **Badge** | None | "Pro" | "Unlimited" |
| **Featured** | ❌ | 1x/month | 2x/month |
| **Analytics** | Basic | Advanced | Advanced |
| **Audio Clips** | 30s | 60s | 60s |
| **Collaboration Matching** | ❌ | ✅ Weekly | ✅ Weekly |
| **Feed Priority** | Normal | +30-50% | +50-80% |
| **Promo Tools** | ❌ | ❌ | ✅ |

---

## Success Metrics to Track

After launch, monitor:
- Conversion rate (Free → Premium/Unlimited)
- Churn rate
- Monthly Recurring Revenue (MRR)
- Upload limit hit rate
- Advanced analytics usage
- Custom username adoption
- Collaboration match acceptance
- Featured artist engagement boost

---

## Support Contacts

- **Backend Issues:** Backend team
- **Mobile Integration:** Mobile team + RevenueCat support
- **Stripe Setup:** Justice + Stripe support (stripe.com/support)
- **Database Issues:** DevOps + Supabase support

---

## Timeline (Recommended)

### Week 1 (This Week)
- [x] Backend implementation (DONE)
- [ ] Justice: Run database migrations
- [ ] Justice: Create Stripe products
- [ ] Justice: Set up webhooks
- [ ] Justice: Add environment variables
- [ ] Deploy backend code
- [ ] Test webhook integration

### Week 2
- [ ] Justice: Configure App Store Connect
- [ ] Justice: Configure Google Play Console
- [ ] Justice: Set up RevenueCat
- [ ] Provide RevenueCat API keys to mobile team
- [ ] Mobile team: Begin implementation
- [ ] Set up cron jobs

### Week 3-4
- [ ] Mobile team: Complete implementation
- [ ] Submit mobile app updates for review
- [ ] Implement web pricing page UI
- [ ] Comprehensive testing
- [ ] Soft launch (no marketing)

### Week 5
- [ ] Monitor metrics and fix issues
- [ ] Full launch (blog post, email, social media)
- [ ] Begin A/B testing and optimization

---

## Next Immediate Steps (In Order)

1. **Run database migration** - Execute `subscription_tier_schema.sql`
2. **Open Stripe Dashboard** - Create 4 subscription products
3. **Copy Product IDs** - Store in secure note
4. **Set up webhooks** - Stripe + RevenueCat
5. **Add environment variables** - Vercel/Railway dashboard
6. **Deploy backend** - `git push origin main`
7. **Test with Stripe test card** - Verify full flow
8. **Forward mobile guide** - Send to mobile team
9. **Configure app stores** - iOS + Android subscriptions
10. **Set up RevenueCat** - Link all platforms

---

## Questions?

If you encounter any issues:
1. Check [BACKEND_IMPLEMENTATION_SUMMARY.md](BACKEND_IMPLEMENTATION_SUMMARY.md) for technical details
2. Check [STRIPE_PRODUCTS_SETUP.md](STRIPE_PRODUCTS_SETUP.md) for Stripe-specific help
3. Check [IMPLEMENTATION_QUICK_REFERENCE.md](IMPLEMENTATION_QUICK_REFERENCE.md) for quick answers
4. Contact backend team for webhook/API debugging

---

**All backend code is complete and ready. Follow this guide step-by-step for a smooth deployment!** 🚀
