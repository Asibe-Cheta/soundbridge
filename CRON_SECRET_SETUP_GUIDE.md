# 🔐 Cron Secret Setup Guide

**Date:** December 3, 2025  
**Purpose:** Guide to generating and configuring the CRON_SECRET for the grace period downgrade endpoint

---

## 🔑 **What is CRON_SECRET?**

The `CRON_SECRET` is a security token that prevents unauthorized access to your cron job endpoint. Only requests with the correct secret can trigger the grace period downgrade process.

**Why It's Needed:**
- Protects your cron endpoint from unauthorized access
- Prevents malicious users from triggering downgrades
- Ensures only your cron service can call the endpoint

---

## 🛠️ **How to Generate a Cron Secret**

### **Option 1: Using Node.js (Recommended)**

Open a terminal and run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This generates a secure 64-character random string.

**Example Output:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

---

### **Option 2: Using Online Generator**

1. Go to: https://www.lastpass.com/features/password-generator
2. Set length to 32-64 characters
3. Include letters, numbers, and symbols
4. Copy the generated string

---

### **Option 3: Using OpenSSL (Linux/Mac)**

```bash
openssl rand -hex 32
```

---

### **Option 4: Using PowerShell (Windows)**

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

Or use this one-liner for a more secure version:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)
Write-Output $secret
```

---

### **Option 5: Using Python**

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## ✅ **Recommended Secret Format**

- **Length:** 32-64 characters (64 recommended)
- **Characters:** Letters (a-z, A-Z), numbers (0-9)
- **Optional:** Special characters if your cron service supports them
- **Format:** Hex string or base64 string

**Example Secrets:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

---

## 🔧 **Adding CRON_SECRET to Environment Variables**

### **1. Local Development (.env.local)**

Add to `apps/web/.env.local`:

```env
CRON_SECRET=your_generated_secret_here
```

**Important:** Never commit `.env.local` to git (it should already be in `.gitignore`).

---

### **2. Vercel Production**

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add New**
4. Set:
   - **Name:** `CRON_SECRET`
   - **Value:** Your generated secret
   - **Environment:** Production, Preview, Development (check all)
5. Click **Save**

---

### **3. Other Hosting Platforms**

Add `CRON_SECRET` to your environment variables in your hosting platform's dashboard (same way you added other secrets like `SENDGRID_API_KEY`).

---

## 🔒 **Security Best Practices**

1. ✅ **Use a Strong Secret:**
   - At least 32 characters
   - Random and unpredictable
   - Don't use common words or patterns

2. ✅ **Keep It Secret:**
   - Never commit to git
   - Never share in chat/slack
   - Store only in environment variables

3. ✅ **Use Different Secrets:**
   - Different secret for development vs production
   - Rotate secrets periodically (every 6-12 months)

4. ✅ **Monitor Access:**
   - Check server logs for unauthorized access attempts
   - Set up alerts for failed cron job executions

---

## 📋 **Verify Secret is Set**

After adding the secret, verify it's loaded correctly:

### **Check in Code (Temporary - Remove After Testing)**

Add this temporarily to your cron endpoint:

```typescript
console.log('CRON_SECRET configured:', !!process.env.CRON_SECRET);
console.log('CRON_SECRET length:', process.env.CRON_SECRET?.length);
```

**Then remove this logging code after verification!**

---

## 🚀 **Testing the Secret**

Once you have the secret configured, test it:

```bash
# Test with correct secret
curl "https://soundbridge.live/api/cron/downgrade-past-due?secret=YOUR_SECRET"

# Should return JSON response with success message

# Test with wrong secret
curl "https://soundbridge.live/api/cron/downgrade-past-due?secret=wrong_secret"

# Should return 401 Unauthorized
```

---

## ❓ **FAQ**

**Q: Can I use the same secret for multiple cron jobs?**  
A: Yes, but it's recommended to use different secrets for different endpoints for better security.

**Q: What if I lose the secret?**  
A: Generate a new one and update:
1. Environment variable
2. Cron job configuration (URL parameter)

**Q: How often should I rotate the secret?**  
A: Every 6-12 months, or immediately if you suspect it was compromised.

**Q: Can I see the secret value after setting it?**  
A: In most platforms (like Vercel), you can view it in the environment variables section. But it's masked/hidden by default.

---

**Last Updated:** December 3, 2025  
**Next Step:** Set up cron job configuration (see next section)
