# ✅ 2FA Verification Guide

**Status**: Database schema deployed ✅  
**Auto-deploy**: Vercel will deploy automatically ✅  
**Time to verify**: 10 minutes

---

## 🔑 Step 1: Set Encryption Key (CRITICAL - 2 minutes)

### Generate Key
```bash
openssl rand -hex 32
```

Copy the output (64 characters).

### Add to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **soundbridge** project
3. **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `TOTP_ENCRYPTION_KEY`
   - **Value**: (paste your 64-char key)
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
5. Click **Save**

⚠️ **Important**: After adding the environment variable, trigger a redeploy:
- Go to **Deployments** tab
- Click **•••** on latest deployment
- Click **Redeploy**

---

## 🧪 Step 2: Quick Verification Test (5 minutes)

### Option A: Browser Test (Easiest)

1. **Login to your app**: https://www.soundbridge.live
2. **Get your access token**:
   - Open browser DevTools (F12)
   - Go to **Console** tab
   - Paste this:
   ```javascript
   // Get Supabase session
   const { data } = await window.supabase.auth.getSession();
   console.log('Access Token:', data.session?.access_token);
   ```
   - Copy the token

3. **Test Setup Endpoint**:
   - Still in Console, paste:
   ```javascript
   // Test 2FA setup
   const token = data.session?.access_token;
   const response = await fetch('https://www.soundbridge.live/api/user/2fa/setup-totp', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     }
   });
   const result = await response.json();
   console.log('2FA Setup Result:', result);
   ```

4. **Check Response**:
   - ✅ **Success**: You'll see a QR code (data:image/png;base64...)
   - ❌ **Error**: Check the error message

---

### Option B: Command Line Test (Quick)

```bash
# Replace YOUR_TOKEN with your actual access token
curl -X POST https://www.soundbridge.live/api/user/2fa/setup-totp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Success Response**:
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "otpauthUrl": "otpauth://totp/SoundBridge..."
  },
  "message": "Scan the QR code with your authenticator app"
}
```

---

## 🎯 Step 3: Full Flow Test (3 minutes)

### Test Complete 2FA Flow

1. **Setup 2FA** (from Step 2)
2. **Save the QR code**:
   ```javascript
   // In browser console
   const qrCode = result.data.qrCode;
   const img = document.createElement('img');
   img.src = qrCode;
   document.body.appendChild(img);
   ```

3. **Scan with Authenticator App**:
   - Use Google Authenticator, Authy, or 1Password
   - Scan the QR code
   - Get a 6-digit code

4. **Verify Setup**:
   ```javascript
   // Replace 123456 with your actual code
   const verifyResponse = await fetch('https://www.soundbridge.live/api/user/2fa/verify-setup', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({ code: '123456' })
   });
   const verifyResult = await verifyResponse.json();
   console.log('Verify Result:', verifyResult);
   ```

5. **Check Backup Codes**:
   - You should receive 8 backup codes
   - Save them somewhere safe!

---

## ✅ Success Indicators

You'll know it's working when:

### Database Check
```sql
-- Run in Supabase SQL Editor
SELECT 
  'two_factor_secrets' as table, COUNT(*) as count FROM two_factor_secrets
UNION ALL
SELECT 'two_factor_backup_codes', COUNT(*) FROM two_factor_backup_codes
UNION ALL
SELECT 'two_factor_audit_log', COUNT(*) FROM two_factor_audit_log;
```

**Expected**:
- `two_factor_secrets`: 1 row (your test user)
- `two_factor_backup_codes`: 8 rows (backup codes)
- `two_factor_audit_log`: 2+ rows (setup events)

### API Response Check
- ✅ Status code: 200
- ✅ `success: true` in response
- ✅ QR code is a valid data URL
- ✅ Backup codes are 8 strings (format: XXXX-XXXXXX)

### Audit Log Check
```sql
-- Check recent 2FA activity
SELECT action, success, created_at 
FROM two_factor_audit_log 
ORDER BY created_at DESC 
LIMIT 10;
```

**Expected actions**:
- `setup_initiated` (success: true)
- `enabled` (success: true)

---

## 🐛 Common Issues & Fixes

### Issue 1: "TOTP_ENCRYPTION_KEY not set"
**Fix**: 
1. Check Vercel environment variables
2. Make sure you clicked "Save"
3. Redeploy after adding the variable

### Issue 2: "Authentication required" (401)
**Fix**: 
- Your token expired
- Get a fresh token (login again)

### Issue 3: "Failed to decrypt secret"
**Fix**:
- Wrong encryption key
- Delete test data and try again:
```sql
DELETE FROM two_factor_secrets WHERE user_id = 'your-user-id';
```

### Issue 4: No response / 500 error
**Fix**:
1. Check Vercel deployment logs
2. Check Supabase logs
3. Verify database tables exist

---

## 📱 Notify Mobile Team (Final Step)

Once verified, send this message:

```
Subject: ✅ 2FA Backend is LIVE and VERIFIED

Hi Mobile Team,

The 2FA backend is deployed, tested, and working!

✅ Database schema deployed
✅ All 8 endpoints operational
✅ Encryption working
✅ Test user successfully enabled 2FA

You can now switch to real APIs:
USE_MOCK_2FA_SERVICE = false

Production URL: https://www.soundbridge.live/api/user/2fa

Test credentials available if needed.

Ready for integration testing!
```

---

## 🎉 Quick Verification Checklist

- [x] ✅ Database schema deployed (you confirmed this)
- [ ] Encryption key set in Vercel
- [ ] Vercel redeployed with new env variable
- [ ] Test endpoint returns QR code
- [ ] QR code scans successfully
- [ ] Backup codes generated
- [ ] Database has test data
- [ ] Audit log shows activity
- [ ] Mobile team notified

---

## 🚀 Next Steps

1. **Set encryption key** (if not done)
2. **Run one test** (Option A or B above)
3. **Check database** (verify data created)
4. **Notify mobile team**
5. **Monitor first few real users**

---

**Estimated Total Time**: 10 minutes  
**Current Status**: Database ✅ | Encryption Key ⏳ | Testing ⏳

---

## 💡 Pro Tip: Create a Test User

For easier testing, create a dedicated test user:

```javascript
// In browser console
const testEmail = 'test-2fa@soundbridge.com';
const testPassword = 'TestPassword123!';

// Sign up
await window.supabase.auth.signUp({
  email: testEmail,
  password: testPassword
});

// Then use this user for all 2FA testing
```

---

**Need Help?** Check:
- Vercel logs: https://vercel.com/dashboard
- Supabase logs: https://app.supabase.com
- Full guide: `WEB_APP_2FA_IMPLEMENTATION_COMPLETE.md`

