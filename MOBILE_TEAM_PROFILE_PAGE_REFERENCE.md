# Mobile Team - Profile Page Implementation Reference

**Date:** December 16, 2025
**Purpose:** Understanding how the mobile app handles profile pages and analytics
**Status:** 🔍 **INFORMATION REQUEST**

---

## 📋 Context

The web application's profile page is experiencing slow loading times specifically for the **analytics section**. While the main profile content loads fine, the analytics data shows a "Loading analytics..." spinner that takes too long.

We've successfully migrated the rest of the web app to use direct Supabase queries (matching the mobile app's `dbHelpers` pattern), and now need guidance on how to handle profile analytics.

---

## 🎯 What We Need From Mobile Team

### **1. Profile Page Architecture**

**Questions:**
- How does the mobile app load profile data?
- Do you load analytics separately from profile data?
- What's the typical load time for profile pages?

**Current Web Implementation:**
```typescript
// Profile page loads two things:
1. Profile data (works fine, loads in ~500ms)
2. Analytics data (slow, using /api/profile/analytics)
```

**What We Want to Know:**
- Do you use the same approach (separate queries)?
- Or do you load everything in one query?

---

### **2. Analytics Data Structure**

**Questions:**
- What analytics data does the mobile app show on profile pages?
- Which database tables/views do you query for analytics?
- Do you use any pre-computed analytics tables or views?

**Current Web Analytics (from API route):**
The web app's `/api/profile/analytics` endpoint is slow. We need to know what data you fetch and how you fetch it.

**Suspected Analytics Data:**
- Profile views/visits
- Post engagement stats
- Connection growth
- Content performance
- Audio play stats

**What We Want to Know:**
- Which of these do you actually show?
- What are the exact queries you use?
- Do you cache analytics anywhere?

---

### **3. Direct Supabase Queries for Analytics**

**Questions:**
- What direct Supabase queries do you use for profile analytics?
- Do you use any database views for analytics?
- Are there any special performance optimizations?

**Example We Need:**
```typescript
// How does mobile app load analytics?
// Do you do something like:

async getProfileAnalytics(userId: string) {
  // Query 1: Profile views?
  const { data: views } = await supabase.from('profile_views')...

  // Query 2: Post stats?
  const { data: posts } = await supabase.from('posts')...

  // Query 3: Audio stats?
  const { data: tracks } = await supabase.from('audio_tracks')...

  // Or do you use a view?
  const { data: analytics } = await supabase.from('profile_analytics_view')...
}
```

**What We Want:**
- The actual `dbHelpers` method(s) you use for profile analytics
- The complete query structure
- Any tips for performance optimization

---

### **4. Performance Benchmarks**

**Questions:**
- What's the average load time for profile pages on mobile?
- How long does analytics data take to load?
- Do you show analytics progressively or wait for all data?

**Current Web Performance:**
- Profile data: ~500ms ✅ (using direct query)
- Analytics data: 10s+ ❌ (using API route)

**What We Want to Know:**
- Is analytics slow on mobile too?
- If not, what's your secret?

---

## 📊 Current Web Implementation

### **Profile Page Structure**

**File:** `apps/web/app/profile/page.tsx`

**What's Working:**
```typescript
// Profile data loads fine
const loadProfileData = async () => {
  const response = await fetch('/api/profile', {
    credentials: 'include'
  });
  // Loads in ~500ms
}
```

**What's Slow:**
```typescript
// Analytics loads slowly
const loadAnalyticsData = async () => {
  const response = await fetch('/api/profile/analytics', {
    credentials: 'include'
  });
  // Takes 10+ seconds or times out
}
```

### **What We've Tried:**

1. **Increased timeout** - Didn't help, query is genuinely slow
2. **Checked API route** - Complex queries, multiple joins
3. **Looked at Discover page** - Uses direct queries, loads fast

### **What We Want to Do:**

Migrate analytics to direct Supabase queries like we did for:
- ✅ Homepage (1-3s load time)
- ✅ Feed page (1-2s load time)
- ✅ Network page (0.5-2s load time)

---

## 🔍 Information Needed

### **Minimum Required:**

1. **Database Tables/Views Used:**
   - What tables do you query for analytics?
   - Do you use any custom views?
   - Any materialized views for performance?

2. **Query Examples:**
   - Share 1-2 example queries you use
   - Show us the `dbHelpers` method for profile analytics
   - Any special filtering or aggregations?

3. **Performance Tips:**
   - How do you keep analytics queries fast?
   - Any caching strategy?
   - Do you paginate analytics data?

### **Nice to Have:**

4. **Full `dbHelpers` Code:**
   - The complete profile analytics helper method
   - Any related helper methods
   - Comments explaining the approach

5. **Database Schema:**
   - Structure of analytics-related tables
   - Any indexes that help performance
   - Row Level Security policies

6. **UI/UX Approach:**
   - Do you show loading states for analytics?
   - Progressive loading vs all-at-once?
   - Any analytics that load in the background?

---

## 🎯 Our Goal

**Implement profile analytics using direct Supabase queries that:**
- Load in < 3 seconds (matching other web pages)
- Use the same pattern as mobile app's `dbHelpers`
- Show the same analytics data as mobile app
- Have the same great performance as mobile app

---

## 📝 Response Format

**Please provide information in this format:**

### **1. Tables/Views Used:**
```
- profile_views (or whatever you use)
- posts (for post stats)
- audio_tracks (for track stats)
- etc.
```

### **2. Main Query Example:**
```typescript
// Paste your actual dbHelpers method here
async getProfileAnalytics(userId: string) {
  // Your code here
}
```

### **3. Performance Notes:**
```
- We use X view for pre-computed stats
- We cache Y data for Z minutes
- We limit results to last N days
- etc.
```

### **4. Load Time:**
```
Typical load time: ~500ms
Worst case: ~2s
```

---

## 💡 Why We're Asking

### **Context:**

We've successfully migrated the web app from slow API routes to fast direct Supabase queries for all major pages:

| Feature | Before | After | Method |
|---------|--------|-------|--------|
| Homepage | 15s+ timeout | 1-3s | Direct Supabase queries |
| Feed | 30s+ timeout | 1-2s | Direct Supabase queries |
| Network | 10s+ timeout | 0.5-2s | Direct Supabase queries |

**Only profile analytics remains slow** because we haven't migrated it yet.

### **Why We Need Mobile Team's Help:**

1. **Proven Pattern:** Mobile app already has working, fast implementation
2. **Same Database:** We're querying the same Supabase database
3. **Consistency:** Want web and mobile to show the same analytics
4. **Best Practices:** Mobile team knows what queries work well

### **What We've Learned:**

- Direct Supabase queries are 80-90% faster than API routes
- Split query pattern (fetch parent, then children) works well
- Mobile app's `dbHelpers` pattern is the right approach
- Simple queries beat complex JOINs for performance

---

## 📧 Contact

**Web Team Lead:** [Your Name]
**Slack Channel:** #web-team
**Priority:** Medium (analytics are supplementary, not critical)

---

## 🔄 Expected Timeline

**Ideal Response Time:** 1-2 days
**Acceptable Response Time:** 1 week
**Can We Work Around It:** Yes - analytics are non-critical, can be added later

---

## ✅ What Happens After You Respond

1. **We'll implement** the same approach on web
2. **We'll test** to ensure it performs well (< 3s)
3. **We'll verify** analytics match mobile app
4. **We'll document** the implementation
5. **We'll share results** with the team

---

## 📚 Additional Context

### **Supabase Views We Know About:**

From the Supabase security warnings, we found these analytics-related views:
- `creator_tip_analytics_summary`
- `genre_analytics`
- `ad_analytics`
- `event_notification_analytics`
- `trending_tracks`
- `platform_fee_analytics`

**Question:** Do you use any of these for profile analytics?

### **Database Schema Files:**

We have these schema files in the repo:
- `database_country_banking_schema.sql`
- `database_wallet_schema.sql`

**Question:** Are there other schema files we should reference?

---

## 🎯 TL;DR - Quick Summary

**What:** Need to know how mobile app loads profile analytics
**Why:** Web profile analytics is slow (10s+), want to use mobile's fast approach
**When:** Non-urgent, but would help complete the web performance improvements
**How:** Share your `dbHelpers` method(s) for profile analytics and query examples

**Current Web Performance:**
- ✅ Everything else: 0.5-3s (using direct queries like mobile)
- ❌ Profile analytics: 10s+ (still using slow API routes)

**Goal:** Match mobile app's performance and implementation

---

## 📎 Helpful Links

- Web app migrations: [FINAL_COMPREHENSIVE_FIX_SUMMARY.md](./FINAL_COMPREHENSIVE_FIX_SUMMARY.md)
- Data service implementation: `apps/web/src/lib/data-service.ts`
- Current profile page: `apps/web/app/profile/page.tsx`
- Slow API route: `apps/web/app/api/profile/analytics/route.ts`

---

**Thank you for your help! 🙏**

Your expertise with the mobile app's direct query pattern has already helped us improve the web app's performance by 85%. We'd love to apply the same approach to profile analytics!

---

*Document created: December 16, 2025*
*Author: Claude Sonnet 4.5 (assisting web team)*
*Status: Ready to share with mobile team*
