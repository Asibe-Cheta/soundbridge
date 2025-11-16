# 🔐 SoundBridge Authentication & Email System - Full Context Documentation

**Date:** January 2025  
**Purpose:** Complete context awareness for authentication and email flows  
**Status:** ✅ **PRODUCTION READY** - SendGrid resubscribed and ready for testing

---

## 📋 **TABLE OF CONTENTS**

1. [System Overview](#system-overview)
2. [Architecture Components](#architecture-components)
3. [Authentication Flow](#authentication-flow)
4. [Email System](#email-system)
5. [Password Reset Flow](#password-reset-flow)
6. [Environment Variables](#environment-variables)
7. [Key Files & Their Roles](#key-files--their-roles)
8. [Testing Procedures](#testing-procedures)
9. [Troubleshooting Guide](#troubleshooting-guide)

---

## 🎯 **SYSTEM OVERVIEW**

### **What We Have**

- **Dual Platform:** Web app (Next.js) + Mobile app (React Native)
- **Auth Provider:** Supabase Auth
- **Email Service:** SendGrid (via custom Auth Hooks)
- **Session Management:** Cookie-based (web) + Bearer token (mobile)
- **Password Security:** Supabase built-in hashing (bcrypt)

### **Why This Architecture?**

1. **Supabase Auth Hooks** allow us to use SendGrid instead of Supabase's default email system
2. **Custom email templates** provide branded, professional communication
3. **Dual auth methods** (cookies + Bearer tokens) support both web and mobile seamlessly
4. **Centralized auth logic** in `AuthContext` prevents duplicated code

---

## 🏗️ **ARCHITECTURE COMPONENTS**

### **1. Authentication Layers**

```
┌─────────────────────────────────────────────────┐
│                  User Interface                  │
│  (Login/Signup Pages - Web & Mobile)           │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│              AuthContext                         │
│  (State Management + Auth Methods)              │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│           Supabase Client                       │
│  (createBrowserClient / MobileAuthService)      │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│          Supabase Auth API                      │
│  (User creation, session management)            │
└────────────────┬────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼───────┐  ┌─────▼──────┐
│  Auth Hooks   │  │  Database  │
│  (SendGrid)   │  │ (Profiles) │
└───────────────┘  └────────────┘
```

### **2. Email Flow**

```
┌──────────────┐         ┌──────────────────┐
│  User Signs  │────────>│  Supabase Auth   │
│      Up      │         │   Creates User   │
└──────────────┘         └────────┬─────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │  Supabase Auth Hook        │
                    │  Sends webhook to:         │
                    │  /api/auth/send-email      │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │  Our API Route validates   │
                    │  and sends to SendGrid     │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │  SendGrid sends email      │
                    │  with confirmation link    │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │  User clicks link          │
                    │  → /auth/callback          │
                    └────────────────────────────┘
```

---

## 🔄 **AUTHENTICATION FLOW**

### **Web App Authentication**

**Location:** `apps/web/src/contexts/AuthContext.tsx`

#### **Sign Up Flow:**

1. **User fills form** (`apps/web/app/(auth)/signup/page.tsx`)
   - Fields: First name, last name, email, password, role (creator/listener), location
   
2. **Form submission calls** `signUp()` from `AuthContext`
   ```typescript
   const { data, error } = await signUp(formData.email, formData.password, {
     first_name: formData.firstName,
     last_name: formData.lastName,
     role: selectedRole,
     location: formData.location,
   });
   ```

3. **Supabase creates user** and triggers Auth Hook

4. **Auth Hook sends email** via `/api/auth/send-email` → SendGrid

5. **User receives email** with confirmation link:
   ```
   https://www.soundbridge.live/auth/callback?token_hash={hash}&type=signup&next=/
   ```

6. **User clicks link** → `/auth/callback` route handler

7. **Callback route verifies** token and creates profile:
   ```typescript
   // Verify OTP
   const { data, error } = await supabase.auth.verifyOtp({
     token_hash: tokenHash,
     type: 'signup'
   });
   
   // Create profile in database
   await supabase.from('profiles').insert({
     id: data.user.id,
     username: `user${data.user.id.substring(0, 8)}`,
     display_name: ...,
     role: 'listener',
     onboarding_completed: false,
     ...
   });
   ```

8. **Redirect to onboarding** (`/?onboarding=true`)

#### **Sign In Flow:**

1. **User enters credentials** (`apps/web/app/(auth)/login/page.tsx`)

2. **Form submission calls** `signIn()` from `AuthContext`
   ```typescript
   const { data, error } = await signIn(formData.email, formData.password);
   ```

3. **Supabase validates credentials** and returns session

4. **Session synced to cookies** for API routes:
   ```typescript
   await fetch('/api/auth/sync-session', {
     method: 'POST',
     body: JSON.stringify({
       access_token: data.session.access_token,
       refresh_token: data.session.refresh_token,
     }),
   });
   ```

5. **AuthContext updates state** with user and session

6. **Redirect to dashboard** or intended page

#### **OAuth Flow (Google):**

1. **User clicks "Continue with Google"**

2. **Calls** `signInWithProvider('google')`
   ```typescript
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: {
       redirectTo: `${window.location.origin}/auth/callback`,
     },
   });
   ```

3. **Redirects to Google OAuth**

4. **Google redirects back** with code:
   ```
   /auth/callback?code={auth_code}
   ```

5. **Callback exchanges code** for session:
   ```typescript
   const { data, error } = await supabase.auth.exchangeCodeForSession(code);
   ```

6. **Creates profile if doesn't exist** (similar to sign up)

7. **Redirects to dashboard** or onboarding

### **Mobile App Authentication**

**Location:** `src/contexts/AuthContext.tsx` + `src/lib/supabase.ts`

#### **Key Differences from Web:**

1. **Uses AsyncStorage** instead of cookies:
   ```typescript
   export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
     auth: {
       storage: AsyncStorage,  // ← Mobile-specific
       autoRefreshToken: true,
       persistSession: true,
       detectSessionInUrl: true,
       flowType: 'pkce',
     },
   });
   ```

2. **Bearer token authentication** for API calls:
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   
   fetch(apiUrl, {
     headers: {
       'Authorization': `Bearer ${session.access_token}`,
     }
   });
   ```

3. **Deep linking** for email confirmation:
   ```typescript
   // Handles links like: soundbridge://auth/callback
   const linkingListener = Linking.addEventListener('url', (event) => {
     handleDeepLink(event.url);
   });
   ```

4. **Email verification** happens via mobile-specific callback page:
   - User opens email on mobile
   - Clicks link → web browser
   - Web callback detects mobile user-agent
   - Redirects to `/auth/mobile-callback` with verification status

---

## 📧 **EMAIL SYSTEM**

### **SendGrid Integration**

**API Route:** `apps/web/app/api/auth/send-email/route.ts`

#### **How It Works:**

1. **Supabase Auth Hook** sends POST request to our endpoint

2. **Our endpoint receives:**
   ```json
   {
     "type": "signup",  // or "recovery"
     "user": "user@example.com",  // or { email: "..." }
     "email_data": {
       "email_action_type": "signup",  // or "recovery"
       "token": "...",
       "token_hash": "...",
       "redirect_to": "..."
     }
   }
   ```

3. **Endpoint determines template:**
   ```typescript
   if (emailActionType === 'signup' || type === 'signup') {
     templateId = SENDGRID_SIGNUP_TEMPLATE_ID;
     // Build confirmation URL
     confirmationUrl = `${siteUrl}/auth/callback?token_hash=${token_hash}&type=signup&next=/`;
     dynamicData = {
       user_name: email.split('@')[0],
       confirmation_url: confirmationUrl,
       email: email
     };
   } else if (emailActionType === 'recovery' || type === 'recovery') {
     templateId = SENDGRID_RESET_TEMPLATE_ID;
     // Build reset URL
     resetUrl = `${siteUrl}/auth/callback?token_hash=${token_hash}&type=recovery&next=/update-password`;
     dynamicData = {
       user_name: email.split('@')[0],
       reset_url: resetUrl,
       email: email
     };
   }
   ```

4. **Sends to SendGrid API:**
   ```typescript
   const sendGridData = {
     from: { 
       email: 'contact@soundbridge.live', 
       name: 'SoundBridge Team' 
     },
     personalizations: [{
       to: [{ email: userEmail }],
       dynamic_template_data: dynamicData
     }],
     template_id: templateId
   };
   
   await fetch('https://api.sendgrid.com/v3/mail/send', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${SENDGRID_API_KEY}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify(sendGridData)
   });
   ```

### **Email Templates**

#### **Signup Confirmation Email**
- **Template ID:** `SENDGRID_SIGNUP_TEMPLATE_ID`
- **Variables:**
  - `{{user_name}}` - Username extracted from email
  - `{{confirmation_url}}` - Link to verify email
  - `{{email}}` - User's email address

#### **Password Reset Email**
- **Template ID:** `SENDGRID_RESET_TEMPLATE_ID`
- **Variables:**
  - `{{user_name}}` - Username extracted from email
  - `{{reset_url}}` - Link to reset password
  - `{{email}}` - User's email address

### **Supabase Configuration Required**

**In Supabase Dashboard:**

1. Go to **Authentication** → **Settings** → **Auth Hooks**
2. Add Custom Auth Hook:
   - **Hook URL:** `https://soundbridge.live/api/auth/send-email`
   - **Events:** ✅ Sign Up, ✅ Password Recovery
   - **HTTP Method:** `POST`
   - **Headers:** 
     ```json
     {
       "Content-Type": "application/json",
       "Authorization": "Bearer {SUPABASE_AUTH_HOOK_SECRET}"
     }
     ```

---

## 🔒 **PASSWORD RESET FLOW**

### **Step-by-Step**

#### **1. User Requests Reset**

**Web:** `apps/web/app/(auth)/reset-password/page.tsx`
**Mobile:** `src/screens/ResetPasswordScreen.tsx`

```typescript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/update-password`,
});
```

#### **2. Supabase Triggers Auth Hook**

- Sends webhook to `/api/auth/send-email`
- Includes `type: 'recovery'` and token data

#### **3. Our API Sends Email**

- Uses SendGrid reset template
- Includes reset URL with token_hash

#### **4. User Clicks Reset Link**

```
https://www.soundbridge.live/auth/callback?token_hash={hash}&type=recovery&next=/update-password
```

#### **5. Callback Route Verifies Token**

**Location:** `apps/web/app/auth/callback/route.ts`

```typescript
if (type === 'recovery') {
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash!,
    type: 'recovery'
  });

  if (data.user) {
    // Token verified - redirect to update password page
    return NextResponse.redirect(new URL('/update-password', request.url));
  }
}
```

#### **6. User Updates Password**

**Location:** `apps/web/app/update-password/page.tsx`

```typescript
const { error } = await supabase.auth.updateUser({
  password: formData.password
});

// Success - redirect to login
setTimeout(() => {
  router.push('/login');
}, 3000);
```

---

## 🔑 **ENVIRONMENT VARIABLES**

### **Required Variables**

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# SendGrid Configuration
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_SIGNUP_TEMPLATE_ID=d-xxxxxxxxxxxx
SENDGRID_RESET_TEMPLATE_ID=d-xxxxxxxxxxxx
SENDGRID_FROM_EMAIL=contact@soundbridge.live
SENDGRID_FROM_NAME=SoundBridge Team

# Auth Hook Security
SUPABASE_AUTH_HOOK_SECRET=v1,whsec_your_webhook_secret

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://soundbridge.live
```

### **Variable Locations**

- **Web App:** `apps/web/.env.local`
- **Mobile App:** `src/config/supabase.ts` (Supabase credentials only)
- **Template:** `env-template.txt` (for reference)

---

## 📁 **KEY FILES & THEIR ROLES**

### **Web App**

| File | Purpose | Key Functions |
|------|---------|--------------|
| `apps/web/src/contexts/AuthContext.tsx` | Auth state management | `signIn()`, `signUp()`, `signOut()`, `signInWithProvider()` |
| `apps/web/app/(auth)/signup/page.tsx` | Signup UI | Form handling, role selection, validation |
| `apps/web/app/(auth)/login/page.tsx` | Login UI | Form handling, password visibility toggle |
| `apps/web/app/(auth)/reset-password/page.tsx` | Password reset request UI | Email input, Supabase reset trigger |
| `apps/web/app/update-password/page.tsx` | Password update UI | New password form, Supabase password update |
| `apps/web/app/api/auth/send-email/route.ts` | Email sending API | Receives webhooks, sends via SendGrid |
| `apps/web/app/auth/callback/route.ts` | Auth callback handler | Token verification, profile creation, redirects |
| `apps/web/src/lib/supabase.ts` | Supabase client factory | `createBrowserClient()`, `createServerClient()` |
| `middleware.ts` | Route protection | Session refresh, auth redirects |

### **Mobile App**

| File | Purpose | Key Functions |
|------|---------|--------------|
| `src/contexts/AuthContext.tsx` | Auth state management (mobile) | `signIn()`, `signUp()`, `signOut()`, deep link handling |
| `src/screens/AuthScreen.tsx` | Login/signup UI | Combined auth screen with tabs |
| `src/screens/ResetPasswordScreen.tsx` | Password reset UI | Reset request form |
| `src/lib/supabase.ts` | Supabase mobile client | `MobileAuthService`, AsyncStorage integration |
| `src/config/supabase.ts` | Supabase config | Environment-specific credentials |

### **Shared/Common**

| File | Purpose | Notes |
|------|---------|-------|
| `env-template.txt` | Environment variable template | Reference for required variables |
| `SUPABASE_AUTH_HOOK_SETUP.md` | Auth hook setup guide | Step-by-step Supabase configuration |
| `AUTH_INTEGRATION_README.md` | Auth integration docs | High-level architecture overview |

---

## 🧪 **TESTING PROCEDURES**

### **Pre-Testing Checklist**

- [x] SendGrid account active and API key valid
- [x] SendGrid templates created and IDs configured
- [ ] Supabase Auth Hook configured in dashboard
- [ ] Environment variables set in `.env.local`
- [ ] Test email address ready (not previously used)

### **Test 1: Signup Email (Web)**

```bash
# Steps:
1. Go to https://www.soundbridge.live/signup
2. Fill in form with NEW email address
3. Submit form
4. Check email inbox (including spam/junk)
5. Click confirmation link in email
6. Verify redirect to onboarding
7. Check Supabase dashboard for new user
8. Check SendGrid Activity for email delivery

# Expected Results:
✅ Email received within 1-2 minutes
✅ Confirmation link works
✅ User redirected to onboarding
✅ Profile created in database
```

### **Test 2: Password Reset (Web)**

```bash
# Steps:
1. Go to https://www.soundbridge.live/reset-password
2. Enter existing user email
3. Submit form
4. Check email inbox
5. Click reset link in email
6. Enter new password (twice)
7. Submit password form
8. Verify redirect to login
9. Login with new password

# Expected Results:
✅ Reset email received within 1-2 minutes
✅ Reset link works
✅ Password successfully updated
✅ Can login with new password
```

### **Test 3: Signup Email (Mobile)**

```bash
# Steps:
1. Open mobile app
2. Go to signup screen
3. Fill in form with NEW email
4. Submit form
5. Check email on mobile device
6. Click confirmation link (opens browser)
7. Verify web callback handles mobile verification
8. Return to app - session should be established

# Expected Results:
✅ Email received on mobile
✅ Link opens in browser
✅ Web callback shows mobile-specific message
✅ App session established after return
```

### **Test 4: API Endpoint Health Check**

```bash
# Test the email endpoint directly
curl https://www.soundbridge.live/api/auth/send-email

# Expected Response:
{
  "status": "ok",
  "message": "Auth hook is running",
  "templates": {
    "signup": "configured",
    "reset": "configured"
  },
  "apiKey": "configured",
  "authHookSecret": "configured",
  "instructions": {
    "note": "This auth hook needs to be configured in Supabase Dashboard",
    "url": "https://supabase.com/dashboard → Authentication → Settings → Auth Hooks",
    "hookUrl": "https://soundbridge.live/api/auth/send-email"
  }
}
```

---

## 🔍 **TROUBLESHOOTING GUIDE**

### **Issue 1: Email Not Received**

#### **Diagnosis Steps:**

1. **Check Supabase Logs:**
   - Go to Supabase Dashboard → Logs → Auth
   - Look for auth hook calls
   - Verify webhook was triggered

2. **Check SendGrid Activity:**
   - Go to SendGrid Dashboard → Activity → Email Activity
   - Search for recipient email
   - Check delivery status

3. **Check Server Logs:**
   - Look for `/api/auth/send-email` requests
   - Check for errors in API route

4. **Verify Environment Variables:**
   ```bash
   # In production (Vercel):
   - Check all SendGrid variables are set
   - Verify template IDs match SendGrid templates
   - Confirm API key is valid
   ```

#### **Common Causes:**

- ❌ **Auth Hook not configured** in Supabase Dashboard
  - **Fix:** Follow `SUPABASE_AUTH_HOOK_SETUP.md`
  
- ❌ **SendGrid API key invalid/expired**
  - **Fix:** Regenerate API key in SendGrid, update `.env.local`
  
- ❌ **Template IDs incorrect**
  - **Fix:** Verify template IDs in SendGrid Dashboard
  
- ❌ **Email in spam/junk folder**
  - **Fix:** Check spam folder, mark as "Not Spam"

### **Issue 2: Confirmation Link Broken**

#### **Diagnosis Steps:**

1. **Check link format** in email:
   ```
   Should be: https://www.soundbridge.live/auth/callback?token_hash=...&type=signup&next=/
   ```

2. **Test link manually** - click it and watch browser console

3. **Check callback route** logs for errors

#### **Common Causes:**

- ❌ **Token hash missing** or malformed
  - **Fix:** Check `/api/auth/send-email` builds correct URL
  
- ❌ **Callback route error**
  - **Fix:** Check `apps/web/app/auth/callback/route.ts` logs

### **Issue 3: Password Reset Fails**

#### **Diagnosis Steps:**

1. **Check reset email received**
2. **Click reset link** - does it redirect correctly?
3. **Check `/update-password` page** loads
4. **Try updating password** - any errors?

#### **Common Causes:**

- ❌ **Token expired** (default: 1 hour)
  - **Fix:** Request new reset email
  
- ❌ **Update password API fails**
  - **Fix:** Check browser console, verify Supabase credentials

### **Issue 4: Mobile Deep Link Not Working**

#### **Diagnosis Steps:**

1. **Check deep link configuration** in `app.json`:
   ```json
   "scheme": "soundbridge"
   ```

2. **Test deep link** directly:
   ```bash
   adb shell am start -W -a android.intent.action.VIEW -d "soundbridge://auth/callback"
   ```

3. **Check AuthContext** deep link handler logs

#### **Common Causes:**

- ❌ **Deep link not registered** in app config
  - **Fix:** Update `app.json`, rebuild app
  
- ❌ **URL scheme mismatch**
  - **Fix:** Ensure email links use `soundbridge://` scheme

### **Issue 5: Session Not Persisting (Web)**

#### **Diagnosis Steps:**

1. **Check cookies** in browser DevTools
2. **Verify session sync** happens after login
3. **Check `/api/auth/sync-session`** endpoint

#### **Common Causes:**

- ❌ **Cookies blocked** by browser
  - **Fix:** Check browser cookie settings
  
- ❌ **Session sync failed**
  - **Fix:** Check network tab for API errors

---

## 📊 **MONITORING & ANALYTICS**

### **What to Monitor**

1. **Email Delivery Rates** (SendGrid Dashboard)
   - Target: >95% delivered
   - Alert if <90%

2. **Auth Success Rates** (Supabase Dashboard)
   - Target: >98% success
   - Monitor failed login attempts

3. **Password Reset Requests** (Application Logs)
   - Monitor for unusual spikes
   - Could indicate account takeover attempts

4. **Email Open Rates** (SendGrid Analytics)
   - Target: >25% open rate
   - Improve templates if lower

### **Key Metrics**

- **Signup Completion Rate:** Users who complete email verification
- **Password Reset Success Rate:** Users who successfully reset password
- **Session Duration:** How long users stay logged in
- **Auth Errors:** Rate of authentication failures

---

## ✅ **CURRENT STATUS**

### **What's Working**

✅ **Web Authentication:**
- Signup with email/password
- Login with email/password
- Google OAuth
- Password reset
- Email confirmation
- Session persistence

✅ **Mobile Authentication:**
- Signup with email/password
- Login with email/password
- Session persistence with AsyncStorage
- Deep linking for email confirmation

✅ **Email System:**
- SendGrid integration configured
- Custom email templates
- Auth hook endpoint ready
- Health check endpoint working

### **What Needs Testing**

⚠️ **After SendGrid Resubscription:**
- [ ] Test signup email delivery (web)
- [ ] Test signup email delivery (mobile)
- [ ] Test password reset email delivery
- [ ] Verify email open rates
- [ ] Confirm all template variables work correctly

### **Next Steps**

1. **Verify SendGrid API key** is active
2. **Test email flows** using procedures above
3. **Monitor SendGrid dashboard** for delivery stats
4. **Check Supabase Auth Hook** configuration
5. **Document any issues** found during testing

---

## 📞 **SUPPORT CONTACTS**

- **SendGrid Support:** https://support.sendgrid.com/
- **Supabase Support:** https://supabase.com/support
- **Internal Docs:** `SUPABASE_AUTH_HOOK_SETUP.md`, `AUTH_INTEGRATION_README.md`

---

**Last Updated:** January 2025  
**Maintained By:** SoundBridge Development Team  
**Version:** 1.0

