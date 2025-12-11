# Implementation Quick Reference

**Status:** ✅ Backend Complete | 📱 Mobile Pending | 🎨 UI Pending
**Date:** December 11, 2025

---

## What Was Implemented

### ✅ Database Schema
- [stream_events_schema.sql](database/stream_events_schema.sql) - Stream events tracking
- [subscription_tier_schema.sql](database/subscription_tier_schema.sql) - Subscription management
- [increment_play_count_function.sql](database/increment_play_count_function.sql) - Play count increment

### ✅ API Endpoints
- `/api/analytics/stream-event` - Log listening events
- `/api/analytics/advanced` - Get advanced analytics (Premium/Unlimited)
- `/api/upload/check-limit` - Check upload limits
- `/api/profile/custom-username` - Manage custom usernames
- `/api/webhooks/subscription` - Handle RevenueCat/Stripe events
- `/api/cron/subscription-management` - Daily tier management
- `/api/cron/collaboration-matching` - Weekly AI matching

### ✅ Frontend Components
- [AdvancedAnalytics.tsx](apps/web/src/components/analytics/AdvancedAnalytics.tsx) - Analytics dashboard
- [audio-player-service.ts](apps/web/src/lib/audio-player-service.ts) - Enhanced with stream tracking

### ✅ Documentation
- [BACKEND_IMPLEMENTATION_SUMMARY.md](BACKEND_IMPLEMENTATION_SUMMARY.md) - Full backend details
- [MOBILE_IMPLEMENTATION_GUIDE.md](MOBILE_IMPLEMENTATION_GUIDE.md) - Mobile team guide
- [STRIPE_PRODUCTS_SETUP.md](STRIPE_PRODUCTS_SETUP.md) - Stripe configuration
- [pricing-tier-update-specification.md](pricing-tier-update-specification.md) - Original spec

---

## Pricing Tiers (Quick Reference)

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

## File Structure

```
soundbridge/
├── database/
│   ├── stream_events_schema.sql ✅
│   ├── subscription_tier_schema.sql ✅
│   └── increment_play_count_function.sql ✅
├── apps/web/
│   ├── app/api/
│   │   ├── analytics/
│   │   │   ├── stream-event/route.ts ✅
│   │   │   └── advanced/route.ts ✅
│   │   ├── upload/
│   │   │   └── check-limit/route.ts ✅
│   │   ├── profile/
│   │   │   └── custom-username/route.ts ✅
│   │   ├── webhooks/
│   │   │   └── subscription/route.ts ✅
│   │   └── cron/
│   │       ├── subscription-management/route.ts ✅
│   │       └── collaboration-matching/route.ts ✅
│   └── src/
│       ├── components/analytics/
│       │   └── AdvancedAnalytics.tsx ✅
│       └── lib/
│           └── audio-player-service.ts ✅ (updated)
└── docs/
    ├── BACKEND_IMPLEMENTATION_SUMMARY.md ✅
    ├── MOBILE_IMPLEMENTATION_GUIDE.md ✅
    ├── STRIPE_PRODUCTS_SETUP.md ✅
    └── IMPLEMENTATION_QUICK_REFERENCE.md ✅ (this file)
```

---

## Deployment Checklist

### 1. Database Setup ✅ (DONE)
```bash
psql $DATABASE_URL -f database/stream_events_schema.sql
psql $DATABASE_URL -f database/subscription_tier_schema.sql
psql $DATABASE_URL -f database/increment_play_count_function.sql
```

### 2. Environment Variables (Justice)
```bash
# Required
CRON_SECRET=<generate_random_string>
STRIPE_WEBHOOK_SECRET=<from_stripe_dashboard>
REVENUECAT_WEBHOOK_SECRET=<from_revenuecat>
# IMPORTANT: Use Price IDs (price_xxxxx) NOT Product IDs (prod_xxxxx)!
STRIPE_PREMIUM_MONTHLY_PRICE_ID=<from_stripe>
STRIPE_PREMIUM_ANNUAL_PRICE_ID=<from_stripe>
STRIPE_UNLIMITED_MONTHLY_PRICE_ID=<from_stripe>
STRIPE_UNLIMITED_ANNUAL_PRICE_ID=<from_stripe>
```

### 3. Stripe Setup (Justice)
- [ ] Create 4 subscription products
- [ ] Set up webhook endpoint
- [ ] Copy **Price IDs** (NOT Product IDs!)
- [ ] Copy webhook secret

See: [STRIPE_PRODUCTS_SETUP.md](STRIPE_PRODUCTS_SETUP.md)

### 4. RevenueCat Setup (Justice)
- [ ] Configure offerings (premium, unlimited)
- [ ] Link to Stripe
- [ ] Link to App Store Connect
- [ ] Link to Google Play Console
- [ ] Copy API keys
- [ ] Provide to mobile team

### 5. App Store Connect (Justice)
- [ ] Create 4 in-app subscriptions
- [ ] Set prices
- [ ] Submit for review

### 6. Google Play Console (Justice)
- [ ] Create 4 subscription products
- [ ] Set prices
- [ ] Submit for review

### 7. Cron Jobs Setup (Justice or DevOps)

**Option A: Vercel Cron (vercel.json)**
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

**Option B: External Service (cron-job.org)**
- Daily 00:00 UTC: `https://soundbridge.live/api/cron/subscription-management`
- Weekly Mon 09:00 UTC: `https://soundbridge.live/api/cron/collaboration-matching`
- Header: `Authorization: Bearer ${CRON_SECRET}`

### 8. Deploy Backend
```bash
git add .
git commit -m "feat: implement pricing tier restructure"
git push origin main
# Auto-deploys to Vercel
```

### 9. Mobile Team Implementation

See: [MOBILE_IMPLEMENTATION_GUIDE.md](MOBILE_IMPLEMENTATION_GUIDE.md)

Required:
- [ ] Update RevenueCat integration
- [ ] Implement 3-tier pricing page
- [ ] Add tier badges
- [ ] Enforce upload limits
- [ ] Gate features by tier
- [ ] Implement upgrade prompts
- [ ] Test all flows

---

## Testing Priority

### High Priority (Must Test Before Launch)
1. ✅ Upload limit enforcement (Free: 3, Premium: 7/month, Unlimited: unlimited)
2. ✅ Subscription webhook handling (RevenueCat & Stripe)
3. ✅ Tier feature gating (analytics, custom URL, audio length)
4. ✅ Stream event tracking (analytics data collection)
5. ✅ Cron jobs (upload reset, expiration, featured rotation)

### Medium Priority
6. Advanced analytics display
7. Custom username validation
8. Collaboration matching algorithm
9. Featured artist rotation

### Low Priority
10. Email notifications (TODO)
11. UI components (TODO)
12. Feed priority algorithm (TODO)

---

## Product IDs Reference

### Mobile App (RevenueCat/App Stores)
```
soundbridge_premium_monthly
soundbridge_premium_annual
soundbridge_unlimited_monthly
soundbridge_unlimited_annual
```

### Stripe Price IDs (Justice to Provide)
```
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_xxxxx
STRIPE_UNLIMITED_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_UNLIMITED_ANNUAL_PRICE_ID=price_xxxxx
```
**Note:** Use Price IDs (price_xxxxx), NOT Product IDs (prod_xxxxx)!

---

## API Quick Reference

### Check Upload Limit
```http
GET /api/upload/check-limit
Authorization: Bearer <token>
```

### Advanced Analytics
```http
GET /api/analytics/advanced?period=30d
Authorization: Bearer <token>
```

### Log Stream Event
```http
POST /api/analytics/stream-event
Content-Type: application/json

{
  "trackId": "uuid",
  "durationListened": 120,
  "totalDuration": 180
}
```

### Custom Username
```http
POST /api/profile/custom-username
Content-Type: application/json

{
  "username": "john-doe"
}
```

---

## Common Issues & Solutions

### Issue: Webhook not receiving events
**Solution:** Check webhook URL, verify secret, check Stripe/RevenueCat logs

### Issue: Upload limit not enforcing
**Solution:** Verify database function `check_upload_limit()` exists, check tier value

### Issue: Advanced analytics returning 403
**Solution:** User is on Free tier, prompt upgrade

### Issue: Cron jobs not running
**Solution:** Verify CRON_SECRET is set, check authorization header

### Issue: Stream events not logging
**Solution:** Check audio player integration, verify API endpoint is accessible

---

## Support Contacts

- **Backend Issues:** Backend team
- **Mobile Integration:** Mobile team + RevenueCat support
- **Stripe Setup:** Justice + Stripe support
- **Database Issues:** DevOps + Supabase support

---

## Success Metrics to Track

After launch, monitor:
- Conversion rate (Free → Premium, Free → Unlimited, Premium → Unlimited)
- Churn rate (cancellations / active subscriptions)
- Monthly Recurring Revenue (MRR)
- Upload limit hit rate (% of Premium users hitting 7/month)
- Advanced analytics usage (Premium/Unlimited)
- Custom username adoption rate
- Collaboration match acceptance rate
- Featured artist engagement boost

---

## Next Steps

**Immediate (This Week):**
1. Justice: Create Stripe products → Provide Product IDs
2. Justice: Set up webhooks → Provide webhook secrets
3. Deploy backend code (already written)
4. Set environment variables
5. Run database migrations
6. Test webhook integration

**Short-term (Next Week):**
1. Justice: Configure App Store Connect & Google Play Console
2. Justice: Set up RevenueCat → Provide API keys to mobile
3. Mobile team: Begin implementation (see mobile guide)
4. Set up cron jobs
5. Test end-to-end subscription flow

**Medium-term (Next 2 Weeks):**
1. Mobile team: Complete implementation
2. Submit mobile app updates for review
3. Implement web UI components (pricing page, subscription settings)
4. Implement email notifications
5. Comprehensive testing

**Launch (Week 3-4):**
1. Soft launch (no marketing)
2. Monitor metrics and fix issues
3. Full launch (blog post, email, social media)
4. Begin A/B testing and optimization

---

**All backend code is complete and ready. Follow this guide for deployment!** 🚀

