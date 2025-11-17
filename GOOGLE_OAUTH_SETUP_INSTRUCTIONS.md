# Google OAuth Setup Instructions

## ✅ **Action Required: Update Google Console Redirect URLs**

You need to add **ONE** redirect URL to your Google Cloud Console:

### **Steps:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services** → **Credentials**
3. Click your **OAuth 2.0 Client ID**
4. Under **"Authorized redirect URIs"**, add:
   ```
   https://aunxdbqukbxyyiusaeqi.supabase.co/auth/v1/callback
   ```
5. Click **Save**
6. **Wait 5-10 minutes** for Google's OAuth settings to propagate

### **Current Issue:**

The OAuth flow is failing with "unexpected_failure" because Google is not allowing redirects to Supabase's callback URL.

### **Why This Redirect URL:**

- Supabase handles OAuth with a **server-side callback** at `/auth/v1/callback`
- This is the **standard approach** for Supabase OAuth
- After processing, Supabase redirects to your website (`https://www.soundbridge.live/`)

---

## 🧪 **After Adding the Redirect URL:**

1. **Wait 5-10 minutes** for Google propagation
2. **Clear browser data** or use **Private/Incognito**
3. Go to `https://www.soundbridge.live/login`
4. **Click "Sign in with Google"**
5. ✅ **Should work!**

---

## 📝 **Current Redirect URLs You Should Have:**

```
https://aunxdbqukbxyyiusaeqi.supabase.co/auth/v1/callback
```

**Note:** You may also have other URLs like `https://www.soundbridge.live/auth/callback` from previous attempts - you can keep them or remove them. The important one is the Supabase URL above.

