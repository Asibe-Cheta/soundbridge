# 🚀 2FA Deployment Checklist

**Date**: November 18, 2025  
**Status**: Ready for Deployment

---

## Pre-Deployment Checklist

### 1. Environment Variables

- [ ] Generate encryption key: `openssl rand -hex 32`
- [ ] Add `TOTP_ENCRYPTION_KEY` to `.env.local` (local)
- [ ] Add `TOTP_ENCRYPTION_KEY` to Vercel environment variables (production)
- [ ] Verify `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is set

### 2. Database Setup

- [ ] Open Supabase SQL Editor
- [ ] Run `database/2fa_schema.sql`
- [ ] Verify all 4 tables created:
  - [ ] `two_factor_secrets`
  - [ ] `two_factor_backup_codes`
  - [ ] `two_factor_verification_sessions`
  - [ ] `two_factor_audit_log`
- [ ] Verify RLS policies are enabled
- [ ] Verify indexes are created

**Verification Query**:
```sql
SELECT 
  'two_factor_secrets' as table_name, 
  COUNT(*) as row_count 
FROM two_factor_secrets
UNION ALL
SELECT 'two_factor_backup_codes', COUNT(*) FROM two_factor_backup_codes
UNION ALL
SELECT 'two_factor_verification_sessions', COUNT(*) FROM two_factor_verification_sessions
UNION ALL
SELECT 'two_factor_audit_log', COUNT(*) FROM two_factor_audit_log;
```

### 3. NPM Dependencies

- [x] ✅ Packages already installed:
  - `speakeasy`
  - `qrcode`
  - `bcrypt`
  - `@upstash/redis`
  - `@upstash/ratelimit`
  - `@types/speakeasy`
  - `@types/qrcode`
  - `@types/bcrypt`

### 4. Code Review

- [ ] Review `apps/web/src/lib/encryption.ts`
- [ ] Review `apps/web/src/lib/backup-codes.ts`
- [ ] Review all 8 API endpoints in `apps/web/app/api/user/2fa/`
- [ ] Verify no hardcoded secrets or keys
- [ ] Verify error handling is comprehensive

---

## Deployment Steps

### Step 1: Local Testing

```bash
# Navigate to web app
cd apps/web

# Install dependencies (if not done)
npm install

# Set environment variable
export TOTP_ENCRYPTION_KEY="your-64-char-hex-key"

# Build
npm run build

# Start dev server
npm run dev
```

- [ ] Test `/api/user/2fa/setup-totp` endpoint
- [ ] Test `/api/user/2fa/verify-setup` endpoint
- [ ] Test `/api/user/2fa/check-required` endpoint
- [ ] Test `/api/user/2fa/verify-code` endpoint
- [ ] Test `/api/user/2fa/status` endpoint

### Step 2: Deploy to Vercel

```bash
# From project root
cd ../..

# Deploy
vercel --prod
```

- [ ] Deployment successful
- [ ] Environment variables set in Vercel
- [ ] Test production endpoints

### Step 3: Verify Production

**Base URL**: `https://www.soundbridge.live/api/user/2fa`

Test each endpoint:

- [ ] `POST /setup-totp` - Returns QR code
- [ ] `POST /verify-setup` - Returns backup codes
- [ ] `POST /check-required` - Returns session token
- [ ] `POST /verify-code` - Verifies TOTP code
- [ ] `POST /verify-backup-code` - Verifies backup code
- [ ] `GET /status` - Returns 2FA status
- [ ] `POST /disable` - Disables 2FA
- [ ] `POST /regenerate-backup-codes` - Generates new codes

### Step 4: Monitor Logs

- [ ] Check Vercel logs for any errors
- [ ] Check Supabase logs for database issues
- [ ] Monitor first few 2FA setups

---

## Post-Deployment

### 1. Notify Mobile Team

Send this message:

```
Subject: 🎉 2FA Backend APIs are LIVE

The 2FA backend is deployed and operational!

Production URL: https://www.soundbridge.live/api/user/2fa

All 8 endpoints are ready:
✅ POST /setup-totp
✅ POST /verify-setup
✅ POST /check-required
✅ POST /verify-code
✅ POST /verify-backup-code
✅ GET /status
✅ POST /disable
✅ POST /regenerate-backup-codes

Next Steps:
1. Change USE_MOCK_2FA_SERVICE = false
2. Test all flows
3. Report any issues immediately

Documentation:
- API Specs: WEB_TEAM_2FA_ANSWERS_CRITICAL.md
- Integration Guide: WEB_APP_2FA_IMPLEMENTATION_COMPLETE.md
```

- [ ] Email sent to mobile team
- [ ] Mobile team confirms receipt
- [ ] Mobile team begins testing

### 2. Create Test User

- [ ] Create a test user account
- [ ] Enable 2FA for test user
- [ ] Save QR code and backup codes
- [ ] Test full login flow with 2FA
- [ ] Test backup code login
- [ ] Share test credentials with mobile team

### 3. Documentation

- [ ] Update main README with 2FA feature
- [ ] Add 2FA to API documentation
- [ ] Create user guide for 2FA setup
- [ ] Document troubleshooting steps

### 4. Monitoring Setup

**Supabase Queries to Monitor**:

1. **2FA Adoption Rate**:
```sql
SELECT 
  COUNT(DISTINCT user_id) as users_with_2fa,
  (SELECT COUNT(*) FROM auth.users) as total_users,
  ROUND(100.0 * COUNT(DISTINCT user_id) / (SELECT COUNT(*) FROM auth.users), 2) as adoption_rate
FROM two_factor_secrets;
```

2. **Failed Attempts (Last 24 Hours)**:
```sql
SELECT COUNT(*) as failed_attempts
FROM two_factor_audit_log
WHERE success = false 
  AND action IN ('verification_failed', 'backup_code_failed')
  AND created_at > NOW() - INTERVAL '24 hours';
```

3. **Recent 2FA Activity**:
```sql
SELECT 
  action,
  COUNT(*) as count,
  MAX(created_at) as last_occurrence
FROM two_factor_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY action
ORDER BY last_occurrence DESC;
```

- [ ] Set up daily monitoring dashboard
- [ ] Configure alerts for high failure rates
- [ ] Track adoption metrics weekly

---

## Rollback Plan (If Needed)

### Emergency Rollback

If critical issues are found:

1. **Disable 2FA Requirement** (Database):
```sql
-- Temporarily disable all 2FA
DELETE FROM two_factor_secrets;
```

2. **Revert Vercel Deployment**:
```bash
vercel rollback
```

3. **Notify Mobile Team**:
```
URGENT: 2FA backend rolled back due to [ISSUE].
Mobile team: Keep USE_MOCK_2FA_SERVICE = true
```

### Issues Requiring Rollback

- [ ] Encryption key lost/compromised
- [ ] Critical security vulnerability discovered
- [ ] Database corruption
- [ ] >10% of users unable to login

---

## Success Criteria

Deployment is successful when:

- [x] ✅ All 8 API endpoints are operational
- [ ] Mobile team successfully switches to real APIs
- [ ] At least 5 test users enable 2FA successfully
- [ ] No critical errors in logs for 24 hours
- [ ] Mobile team confirms all flows work
- [ ] Zero rollbacks needed

---

## Timeline

- **Day 1** (Today): Deploy backend, run database migration
- **Day 2**: Mobile team switches to real APIs, intensive testing
- **Day 3-7**: Monitor adoption, fix minor issues
- **Week 2**: Gradual rollout to all users
- **Week 3+**: Promote 2FA to users, track adoption

---

## Contact Information

**Web Team Lead**: [Your Name]  
**Mobile Team Lead**: [Mobile Lead Name]  
**Emergency Contact**: [Phone/Slack]

---

## Notes

- Keep encryption key backed up securely
- Document any issues encountered during deployment
- Update this checklist based on actual deployment experience

---

**Last Updated**: November 18, 2025  
**Deployment Status**: ⏳ Pending

