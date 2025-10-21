# Disable Captcha in Supabase Dashboard

## 🚨 **Current Issue:**
- Captcha verification still failing despite code changes
- Error: "captcha verification process failed"
- Changes deployed but server-level captcha still active

## 🔧 **Solution: Disable Captcha in Supabase Dashboard**

### **Step 1: Access Supabase Dashboard**
1. Go to [supabase.com](https://supabase.com)
2. Navigate to your SoundBridge project
3. Go to **Authentication** → **Settings**

### **Step 2: Disable Bot Protection**
Look for these settings and disable them:

1. **Bot Protection:**
   - Find "Bot Protection" or "Captcha" section
   - **Disable** or set to "None"
   - **Save** changes

2. **Rate Limiting:**
   - Check if rate limiting is too strict
   - Adjust if necessary

3. **Security Settings:**
   - Look for "Captcha Provider" 
   - Set to "None" or "Disabled"

### **Step 3: Alternative - Environment Variable Override**

If you can't find the settings, add this to your Vercel environment variables:

```bash
# In Vercel Dashboard → Settings → Environment Variables
SUPABASE_DISABLE_CAPTCHA=true
```

### **Step 4: Check Supabase Auth Configuration**

In your Supabase dashboard, also check:
- **Authentication** → **URL Configuration**
- **Authentication** → **Email Templates**
- **Authentication** → **Providers**

Look for any captcha or bot protection settings.

## 🎯 **Expected Result:**
- Login/signup should work without captcha errors
- Consistent experience with mobile app
- No more "captcha verification process failed" errors

## 📱 **Why This Matters:**
- Mobile app has no captcha requirement
- Web app should match this experience
- Users expect consistent behavior across platforms
