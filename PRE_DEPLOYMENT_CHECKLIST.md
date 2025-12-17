# Pre-Deployment Checklist

**Purpose:** Prevent production issues like the ones that broke the web app.

**MANDATORY:** All items must be checked before deploying to production.

---

## 🔴 Critical Checks (Blocker if Failed)

### **1. Database Schema Validation**

- [ ] **TypeScript types are up to date**
  ```bash
  # Regenerate types from Supabase
  npx supabase gen types typescript --project-id YOUR_PROJECT > apps/web/src/lib/database.types.ts
  ```
  - [ ] File `database.types.ts` exists
  - [ ] File is not empty (should be 1000+ lines)
  - [ ] All tables in database are represented

- [ ] **No column name assumptions**
  - [ ] Search codebase for hardcoded column names: `grep -r "\.eq\('" apps/web/src`
  - [ ] Verify each column exists in `database.types.ts`
  - [ ] No usage of common wrong names:
    - [ ] ❌ `receiver_id` (should be `recipient_id`)
    - [ ] ❌ `tags` on posts table (should be `post_type`)
    - [ ] ❌ `artist` on audio_tracks (doesn't exist)
    - [ ] ❌ `creator_id` on creator_branding (should be `user_id`)

- [ ] **All queries tested manually**
  - [ ] Run each new/modified query in Supabase SQL editor
  - [ ] Verify results match expectations
  - [ ] No "column does not exist" errors

---

### **2. Code Quality**

- [ ] **No TypeScript errors**
  ```bash
  npm run type-check
  # OR
  npx tsc --noEmit
  ```
  - [ ] Exit code 0 (no errors)
  - [ ] No `@ts-ignore` comments added in this PR
  - [ ] No `any` types introduced without good reason

- [ ] **No console errors in browser**
  - [ ] Open browser console (F12)
  - [ ] Navigate to each page: Home, Feed, Network, Profile, Discover
  - [ ] Check for red errors
  - [ ] Acceptable: warnings about missing env vars in dev
  - [ ] Not acceptable: database errors, runtime errors, unhandled promises

- [ ] **All tests passing**
  ```bash
  npm test
  ```
  - [ ] All unit tests pass
  - [ ] All integration tests pass
  - [ ] No skipped tests without explanation
  - [ ] Code coverage hasn't decreased

- [ ] **Linting passes**
  ```bash
  npm run lint
  ```
  - [ ] No errors
  - [ ] Warnings reviewed and justified

---

### **3. Performance**

- [ ] **Page load times acceptable**
  - [ ] Homepage: < 3 seconds
  - [ ] Feed: < 3 seconds
  - [ ] Network: < 3 seconds
  - [ ] Profile: < 2 seconds
  - [ ] Discover: < 3 seconds

- [ ] **No API route timeouts**
  - [ ] Open Network tab in browser DevTools
  - [ ] Navigate to each page
  - [ ] No requests taking > 10 seconds
  - [ ] No timeout errors (504, 408)

- [ ] **Database query performance**
  - [ ] Check Supabase Dashboard → Database → Query Performance
  - [ ] No queries taking > 5 seconds
  - [ ] Proper indexes exist for common queries
  - [ ] No full table scans on large tables

- [ ] **Bundle size hasn't increased significantly**
  ```bash
  npm run build
  ```
  - [ ] Check `.next/static/chunks` sizes
  - [ ] First Load JS shown for each page
  - [ ] Main page bundle < 500KB (gzipped)
  - [ ] No unexpected large dependencies

---

### **4. Error Handling**

- [ ] **All try-catch blocks reset loading states**
  ```typescript
  // ✅ GOOD
  try {
    setLoading(true)
    await someOperation()
  } catch (error) {
    console.error(error)
  } finally {
    setLoading(false) // ← Always reset
  }

  // ❌ BAD
  try {
    setLoading(true)
    await someOperation()
    setLoading(false) // ← Doesn't run if error occurs
  } catch (error) {
    console.error(error)
  }
  ```
  - [ ] Search for `setLoading(true)` and verify each has `finally` block
  - [ ] Search for `setIsLoading(true)` and verify each has `finally` block
  - [ ] No infinite loading spinners on error

- [ ] **User-friendly error messages shown**
  - [ ] No raw error objects shown to users
  - [ ] Error messages are helpful ("Failed to load posts. Please try again.")
  - [ ] Not just "An error occurred"
  - [ ] Include actionable next steps when possible

- [ ] **Errors logged to monitoring system**
  - [ ] Critical errors sent to Sentry
  - [ ] Errors include context (user ID, page, action)
  - [ ] No sensitive data in error logs (passwords, tokens)

---

### **5. Database**

- [ ] **Schema matches code types**
  - [ ] Run schema diff to check for changes:
    ```bash
    # Compare local types with production schema
    npx supabase db diff --linked
    ```
  - [ ] All migrations applied to production
  - [ ] No pending schema changes

- [ ] **RLS policies enabled on all tables**
  - [ ] Check Supabase Dashboard → Database → Tables
  - [ ] Each table shows "RLS enabled"
  - [ ] Policies exist for SELECT, INSERT, UPDATE, DELETE
  - [ ] Test with non-admin user account

- [ ] **No hardcoded database assumptions**
  - [ ] Search for `.from('` in codebase
  - [ ] Verify each table name exists
  - [ ] No references to old/renamed tables
  - [ ] No assumptions about enum values

- [ ] **Database indexes exist for common queries**
  - [ ] Check slow query log in Supabase
  - [ ] Add indexes for frequently filtered columns
  - [ ] Test query performance with production data volume

---

### **6. Security**

- [ ] **No secrets in client-side code**
  ```bash
  # Search for potential secrets
  grep -r "sk_" apps/web/
  grep -r "secret" apps/web/
  grep -r "private_key" apps/web/
  ```
  - [ ] Only `NEXT_PUBLIC_*` env vars in client code
  - [ ] Server-side secrets only in API routes
  - [ ] No API keys committed to git

- [ ] **Authentication checks in place**
  - [ ] Protected pages check for valid session
  - [ ] API routes verify user authentication
  - [ ] Admin routes verify admin role
  - [ ] No bypassing auth checks in new code

- [ ] **Input validation exists**
  - [ ] User input sanitized before database queries
  - [ ] File uploads validated (type, size)
  - [ ] No SQL injection vulnerabilities
  - [ ] No XSS vulnerabilities

---

### **7. Testing in Production-Like Environment**

- [ ] **Tested with production data volume**
  - [ ] Not just 10 test records
  - [ ] Test with 1000+ posts, 100+ users
  - [ ] Pagination works correctly
  - [ ] No performance degradation with realistic data

- [ ] **Tested on slow network**
  - [ ] Open DevTools → Network tab
  - [ ] Throttle to "Slow 3G"
  - [ ] Pages still usable
  - [ ] Loading states show properly
  - [ ] No timeout errors

- [ ] **Tested in different browsers**
  - [ ] Chrome/Edge (Chromium)
  - [ ] Firefox
  - [ ] Safari (if on Mac)
  - [ ] Mobile browsers (iOS Safari, Chrome Mobile)

- [ ] **Tested with different user roles**
  - [ ] Regular user account
  - [ ] Admin user account
  - [ ] Logged out (public pages)
  - [ ] Premium user account (if applicable)

---

## 🟡 Important Checks (Review if Failed)

### **8. Code Review**

- [ ] **At least 2 developers reviewed**
  - [ ] One senior developer reviewed
  - [ ] All comments addressed
  - [ ] No unresolved discussions

- [ ] **Schema validation checklist completed**
  - [ ] All database column names verified
  - [ ] Type definitions match database types
  - [ ] No assumptions about schema

- [ ] **Performance review completed**
  - [ ] No new slow queries introduced
  - [ ] API routes vs direct queries justified
  - [ ] Caching strategy reviewed

---

### **9. Documentation**

- [ ] **Code is documented**
  - [ ] Complex functions have JSDoc comments
  - [ ] Database schema changes documented
  - [ ] API endpoint changes documented in `API_ENDPOINTS_DOCUMENTATION.md`

- [ ] **README updated if needed**
  - [ ] New environment variables documented
  - [ ] New setup steps added
  - [ ] Dependencies updated in docs

- [ ] **Migration guide created if needed**
  - [ ] Breaking changes documented
  - [ ] User-facing changes explained
  - [ ] Rollback plan documented

---

### **10. Monitoring & Logging**

- [ ] **Sentry error tracking configured**
  - [ ] Sentry initialized in `_app.tsx`
  - [ ] Source maps uploaded for error tracking
  - [ ] User context attached to errors
  - [ ] Release version set

- [ ] **Performance monitoring enabled**
  - [ ] Sentry performance monitoring active
  - [ ] Core Web Vitals tracked
  - [ ] Database query performance logged
  - [ ] API endpoint response times tracked

- [ ] **Logging is appropriate**
  - [ ] No excessive console.log in production
  - [ ] Critical operations logged
  - [ ] No sensitive data in logs
  - [ ] Log levels used appropriately (info, warn, error)

---

## 🟢 Nice to Have (Optional)

### **11. Deployment Strategy**

- [ ] **Feature flags configured (if applicable)**
  - [ ] New features behind flags
  - [ ] Can disable without redeployment
  - [ ] Gradual rollout plan documented

- [ ] **Rollback plan documented**
  - [ ] Steps to revert deployment
  - [ ] Database migration rollback tested
  - [ ] Known issues and workarounds listed

- [ ] **Gradual rollout planned**
  - [ ] Deploy to 5% of users first
  - [ ] Monitor for 1 hour
  - [ ] Expand to 25%, monitor
  - [ ] Full deployment after validation

---

### **12. Load Testing**

- [ ] **Stress test completed (optional)**
  - [ ] Simulated 100+ concurrent users
  - [ ] No memory leaks detected
  - [ ] Server handles load gracefully
  - [ ] Database doesn't crash

---

## 📋 Quick Checklist Summary

**Before every deployment, run through this:**

```bash
# 1. Regenerate database types
npx supabase gen types typescript --project-id YOUR_PROJECT > apps/web/src/lib/database.types.ts

# 2. Run type check
npm run type-check

# 3. Run tests
npm test

# 4. Run linter
npm run lint

# 5. Build production bundle
npm run build

# 6. Test in browser
# - Open each page
# - Check console for errors
# - Verify performance
# - Test on slow network (Slow 3G)

# 7. Deploy to staging first
# - Verify staging works
# - Run smoke tests
# - Get approval from team

# 8. Deploy to production
# - Monitor error rates in Sentry
# - Watch server metrics
# - Be ready to rollback
```

---

## 🚨 Red Flags - DO NOT DEPLOY

**If any of these are true, STOP and fix:**

1. ❌ TypeScript has errors
2. ❌ Tests are failing
3. ❌ Console shows database errors
4. ❌ Pages timeout or load forever
5. ❌ Loading spinners stuck on error
6. ❌ Column name errors in console
7. ❌ RLS policies not enabled
8. ❌ Secrets exposed in client code
9. ❌ No code review completed
10. ❌ Breaking changes without migration plan

---

## ✅ Green Lights - Safe to Deploy

**All of these should be true:**

1. ✅ All tests passing
2. ✅ No TypeScript errors
3. ✅ No console errors
4. ✅ All pages load < 3 seconds
5. ✅ Database schema matches code
6. ✅ RLS policies enabled
7. ✅ Code reviewed by 2+ developers
8. ✅ Tested in production-like environment
9. ✅ Tested on slow network
10. ✅ Error monitoring configured

---

## 📖 How to Use This Checklist

### **For Each Pull Request:**

1. Copy this checklist into PR description
2. Developer completes applicable sections
3. Reviewers verify critical items
4. Merge only when all critical items checked

### **For Each Deployment:**

1. Run through entire checklist
2. Document any skipped items with justification
3. Get approval from tech lead
4. Deploy to staging first
5. Verify staging before production
6. Monitor production after deployment

### **For Hotfixes:**

1. Still run critical checks (1-5)
2. Can skip nice-to-have items (11-12)
3. Document what was skipped
4. Follow up with full checklist later

---

## 🎯 Customization

**Adapt this checklist for your team:**

- Add company-specific checks
- Add checks for your tech stack
- Remove inapplicable items
- Set your own performance thresholds
- Add automated checks to CI/CD

---

## 📝 Example Usage

### **Pull Request Template:**

```markdown
## Pre-Deployment Checklist

### Critical Checks
- [x] TypeScript types up to date
- [x] No console errors in browser
- [x] All tests passing
- [x] Page load times < 3 seconds
- [x] All try-catch blocks reset loading states
- [x] Database schema matches code

### Important Checks
- [x] Code reviewed by 2 developers
- [x] Documentation updated
- [x] Sentry configured

### Deployment
- [x] Tested in staging
- [x] Rollback plan: Revert commit abc123
- [ ] Deploy to 5% of users first

### Notes
- New feature behind feature flag `enable_new_analytics`
- Can be disabled without redeployment
- Performance tested with 10,000 records
```

---

## 🔗 Related Documents

- [ROOT_CAUSE_ANALYSIS.md](./ROOT_CAUSE_ANALYSIS.md) - Why these checks matter
- [API_ENDPOINTS_DOCUMENTATION.md](./API_ENDPOINTS_DOCUMENTATION.md) - API endpoint status
- [GENERATE_SUPABASE_TYPES_GUIDE.md](./GENERATE_SUPABASE_TYPES_GUIDE.md) - How to generate types

---

*This checklist would have prevented the issues that broke the web app.*
*Use it religiously to maintain quality and user trust.*

**Last updated:** December 16, 2025
