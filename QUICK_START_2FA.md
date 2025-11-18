# ⚡ 2FA Quick Start Guide

**Time to Production**: 30 minutes  
**Difficulty**: Easy  
**Status**: Ready to Deploy

---

## 🚀 5-Step Launch Process

### Step 1: Generate Encryption Key (2 minutes)

```bash
# Generate a secure 256-bit key
openssl rand -hex 32
```

Copy the output (64 characters). Example:
```
5f9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b
```

⚠️ **CRITICAL**: Save this key somewhere secure (password manager). You'll need it for deployment.

---

### Step 2: Set Environment Variables (3 minutes)

#### Local Development
Add to `apps/web/.env.local`:
```bash
TOTP_ENCRYPTION_KEY=your-64-character-hex-string-from-step-1
```

#### Vercel Production
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (soundbridge)
3. Settings → Environment Variables
4. Add new variable:
   - **Name**: `TOTP_ENCRYPTION_KEY`
   - **Value**: (paste your 64-char key)
   - **Environments**: Production, Preview, Development
5. Click "Save"

---

### Step 3: Run Database Migration (5 minutes)

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to SQL Editor
4. Click "New Query"
5. Copy **entire contents** of `database/2fa_schema.sql`
6. Paste into SQL editor
7. Click "Run"

✅ **Verify Success**:
Run this query:
```sql
SELECT 'two_factor_secrets' as table_name FROM two_factor_secrets LIMIT 1
UNION ALL
SELECT 'two_factor_backup_codes' FROM two_factor_backup_codes LIMIT 1
UNION ALL
SELECT 'two_factor_verification_sessions' FROM two_factor_verification_sessions LIMIT 1
UNION ALL
SELECT 'two_factor_audit_log' FROM two_factor_audit_log LIMIT 1;
```

Should return 4 rows without errors.

---

### Step 4: Deploy to Production (5 minutes)

```bash
# Navigate to project root
cd /path/to/soundbridge

# Deploy to Vercel
vercel --prod
```

Wait for deployment to complete (~3 minutes).

✅ **Verify Deployment**:
- Visit: https://www.soundbridge.live
- Check Vercel dashboard for green checkmark
- No build errors in logs

---

### Step 5: Test & Notify (15 minutes)

#### Quick Test
```bash
# Test setup endpoint
curl -X POST https://www.soundbridge.live/api/user/2fa/setup-totp \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

Expected response (partial):
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,...",
    "otpauthUrl": "otpauth://totp/..."
  }
}
```

#### Notify Mobile Team

Send this email:

```
To: mobile-team@soundbridge.com
Subject: 🎉 2FA Backend is LIVE!

Hi Mobile Team,

The 2FA backend is deployed and ready!

Production URL: https://www.soundbridge.live/api/user/2fa

Action Required:
1. Change one line: USE_MOCK_2FA_SERVICE = false
2. Test all flows
3. Report any issues

All 8 endpoints operational:
✅ POST /setup-totp
✅ POST /verify-setup
✅ POST /check-required
✅ POST /verify-code
✅ POST /verify-backup-code
✅ GET /status
✅ POST /disable
✅ POST /regenerate-backup-codes

Documentation:
- WEB_APP_2FA_IMPLEMENTATION_COMPLETE.md
- WEB_TEAM_2FA_ANSWERS_CRITICAL.md

Let's test together tomorrow morning!
```

---

## ✅ Post-Launch Checklist

### Immediate (Today)
- [ ] Encryption key set in Vercel
- [ ] Database migration completed
- [ ] Production deployment successful
- [ ] At least one endpoint tested
- [ ] Mobile team notified

### Next Day
- [ ] Mobile team switches to real APIs
- [ ] Create 3-5 test users with 2FA enabled
- [ ] Test full login flow with 2FA
- [ ] Test backup code flow
- [ ] Monitor logs for errors

### First Week
- [ ] No critical bugs reported
- [ ] Mobile team confirms integration works
- [ ] Monitor 2FA adoption rate
- [ ] Review audit logs for suspicious activity
- [ ] Address any minor issues

---

## 🆘 Emergency Contacts

### If Something Goes Wrong

**Option 1: Rollback Deployment**
```bash
vercel rollback
```

**Option 2: Disable 2FA Temporarily**
```sql
-- In Supabase SQL Editor
DELETE FROM two_factor_secrets;
```

**Option 3: Contact Support**
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- Mobile Team Lead: [Add contact]

---

## 📊 Success Indicators

You'll know it's working when:

✅ Mobile team reports successful integration  
✅ Test users can enable 2FA  
✅ Login with 2FA works on mobile  
✅ Backup codes work  
✅ No errors in logs  
✅ Audit log shows activity  

---

## 🎯 Quick Commands

### Test All Endpoints (with valid token)
```bash
export TOKEN="your-access-token-here"
export BASE="https://www.soundbridge.live/api/user/2fa"

# 1. Setup
curl -X POST $BASE/setup-totp -H "Authorization: Bearer $TOKEN"

# 2. Status
curl -X GET $BASE/status -H "Authorization: Bearer $TOKEN"

# 3. Check Required
curl -X POST $BASE/check-required -H "Authorization: Bearer $TOKEN"
```

### Check Database Tables
```sql
-- Row counts
SELECT 
  'two_factor_secrets' as table_name, COUNT(*) as rows FROM two_factor_secrets
UNION ALL
SELECT 'two_factor_backup_codes', COUNT(*) FROM two_factor_backup_codes
UNION ALL
SELECT 'two_factor_verification_sessions', COUNT(*) FROM two_factor_verification_sessions
UNION ALL
SELECT 'two_factor_audit_log', COUNT(*) FROM two_factor_audit_log;
```

### Monitor Activity
```sql
-- Recent 2FA activity
SELECT action, COUNT(*) as count, MAX(created_at) as last_occurrence
FROM two_factor_audit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY action;
```

---

## 📖 Full Documentation

For detailed information, see:

- **Implementation Guide**: `WEB_APP_2FA_IMPLEMENTATION_COMPLETE.md` (45 pages)
- **Deployment Checklist**: `2FA_DEPLOYMENT_CHECKLIST.md`
- **Executive Summary**: `2FA_IMPLEMENTATION_SUMMARY.md`
- **Mobile Integration**: `WEB_TEAM_2FA_ANSWERS_CRITICAL.md`

---

## 🎉 You're Ready!

Everything is built and ready to go. Just follow the 5 steps above and you'll be live in 30 minutes.

**Good luck!** 🚀

---

**Last Updated**: November 18, 2025  
**Next Action**: Start with Step 1 (Generate Encryption Key)

