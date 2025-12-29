# Cursor Prompt: Implement Beta Access Control for SoundBridge Web App

## 🎯 OBJECTIVE

Implement a beta access control system that:
1. Redirects all public users trying to access `/login` or `/signup` to the waitlist page
2. Allows only users with a special beta code to access login/signup
3. Keeps the waitlist page publicly accessible
4. Does NOT break any existing functionality

---

## 📋 REQUIREMENTS

### **What We Need You To Do:**

**Phase 1: Discovery (CRITICAL - DO THIS FIRST)**
1. Find the current waitlist page URL by searching the codebase
   - Search for files containing "waitlist" or "wait-list" or "waiting-list"
   - Check routes, navigation, pages directories
   - Confirm the exact path (e.g., `/waitlist`, `/waiting-list`, `/join`, etc.)
   - **OUTPUT:** Tell us the exact URL path before proceeding

2. Identify the current authentication setup
   - Find login page location
   - Find signup page location
   - Check if using Next.js, React Router, or other routing
   - Identify authentication method (Supabase Auth, custom, etc.)
   - **OUTPUT:** List all auth-related files you found

3. Check existing environment variables
   - Look in `.env`, `.env.local`, `.env.example`
   - Note any existing beta-related or mode-related variables
   - **OUTPUT:** List current env vars (don't show values, just keys)

**Phase 2: Implementation**
Only proceed after Phase 1 is complete and confirmed.

---

## 🔒 IMPLEMENTATION STRATEGY

### **Approach: Combined Redirect + Beta Code Access**

**How it should work:**

**For Regular Users (Public):**
- Visit `soundbridge.live/login` → Auto-redirect to waitlist page
- Visit `soundbridge.live/signup` → Auto-redirect to waitlist page
- Visit `soundbridge.live/waitlist` → Works normally ✅

**For Beta Testers (Private):**
- Receive special link: `soundbridge.live/beta?code=SOUNDBRIDGE2025`
- Clicking link grants them beta access (stored in localStorage)
- Can then access `/login` and `/signup` normally
- Access persists until they clear browser data

---

## 💻 IMPLEMENTATION STEPS

### **Step 1: Add Environment Variables**

Add these to `.env.local` (or wherever environment variables are stored):

```bash
# Beta Access Control
NEXT_PUBLIC_BETA_MODE=true
NEXT_PUBLIC_BETA_CODE=SOUNDBRIDGE2025
```

**IMPORTANT:** 
- Do NOT commit the actual beta code to git
- Add to `.env.example` with placeholder value
- Update `.gitignore` to exclude `.env.local` if not already

---

### **Step 2: Create Beta Access Page**

Create a new page at `/beta` (or `/pages/beta.tsx` if Next.js):

```typescript
// This page validates the beta code and grants access
// Then redirects to login

import { useEffect } from 'react';
import { useRouter } from 'next/router'; // Adjust based on routing library

export default function BetaAccessPage() {
  const router = useRouter();
  const { code } = router.query;

  useEffect(() => {
    const validBetaCode = process.env.NEXT_PUBLIC_BETA_CODE;

    if (code === validBetaCode) {
      // Grant beta access
      localStorage.setItem('beta_access', 'granted');
      localStorage.setItem('beta_access_granted_at', new Date().toISOString());
      
      // Redirect to login
      router.push('/login');
    } else {
      // Invalid code - redirect to waitlist
      router.push('/waitlist'); // UPDATE THIS WITH ACTUAL WAITLIST PATH
    }
  }, [code, router]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column'
    }}>
      <h2>Verifying access...</h2>
      <p>Please wait while we redirect you.</p>
    </div>
  );
}
```

**CRITICAL:** Replace `/waitlist` with the actual waitlist path you found in Phase 1.

---

### **Step 3: Add Beta Check to Login Page**

Find the login page component and add this check at the TOP of the component:

```typescript
import { useEffect } from 'react';
import { useRouter } from 'next/router'; // Adjust based on routing library

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if beta mode is active
    const isBetaMode = process.env.NEXT_PUBLIC_BETA_MODE === 'true';
    const hasBetaAccess = localStorage.getItem('beta_access') === 'granted';

    if (isBetaMode && !hasBetaAccess) {
      // No beta access - redirect to waitlist
      router.push('/waitlist'); // UPDATE THIS WITH ACTUAL WAITLIST PATH
    }
  }, [router]);

  // REST OF EXISTING LOGIN CODE STAYS EXACTLY THE SAME
  // DO NOT MODIFY ANYTHING ELSE
}
```

**IMPORTANT:**
- Add this BEFORE any other logic
- Do NOT change existing authentication code
- Do NOT modify form handlers
- Do NOT change styling
- ONLY add the beta access check

---

### **Step 4: Add Beta Check to Signup Page**

Find the signup page component and add the EXACT SAME check:

```typescript
import { useEffect } from 'react';
import { useRouter } from 'next/router'; // Adjust based on routing library

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if beta mode is active
    const isBetaMode = process.env.NEXT_PUBLIC_BETA_MODE === 'true';
    const hasBetaAccess = localStorage.getItem('beta_access') === 'granted';

    if (isBetaMode && !hasBetaAccess) {
      // No beta access - redirect to waitlist
      router.push('/waitlist'); // UPDATE THIS WITH ACTUAL WAITLIST PATH
    }
  }, [router]);

  // REST OF EXISTING SIGNUP CODE STAYS EXACTLY THE SAME
  // DO NOT MODIFY ANYTHING ELSE
}
```

---

### **Step 5: Update .env.example**

Add these placeholder values:

```bash
# Beta Access Control (for private testing phase)
NEXT_PUBLIC_BETA_MODE=false
NEXT_PUBLIC_BETA_CODE=your-secret-code-here
```

Add comment explaining:
```bash
# Set NEXT_PUBLIC_BETA_MODE=true during private beta testing
# Set NEXT_PUBLIC_BETA_MODE=false when launching publicly
# BETA_CODE should be kept secret and shared only with test users
```

---

## 🚨 CRITICAL PRESERVATION RULES

### **DO NOT CHANGE:**
- ❌ Existing authentication logic
- ❌ Supabase configuration
- ❌ Form validation
- ❌ Styling/CSS
- ❌ Navigation components
- ❌ Any other routes or pages
- ❌ Database queries
- ❌ API endpoints

### **ONLY ADD:**
- ✅ Beta access check (useEffect hook)
- ✅ New beta page
- ✅ Environment variables
- ✅ localStorage operations

---

## 🧪 TESTING CHECKLIST

After implementation, verify these scenarios work:

**Scenario 1: Public User (No Beta Access)**
1. Visit `/login` → Should redirect to waitlist
2. Visit `/signup` → Should redirect to waitlist
3. Visit `/waitlist` → Should work normally

**Scenario 2: Beta User (Has Access)**
1. Visit `/beta?code=SOUNDBRIDGE2025` → Should redirect to login
2. Check localStorage → Should have `beta_access: "granted"`
3. Visit `/login` → Should work normally (no redirect)
4. Visit `/signup` → Should work normally (no redirect)
5. Refresh page → Beta access should persist

**Scenario 3: Invalid Beta Code**
1. Visit `/beta?code=WRONGCODE` → Should redirect to waitlist
2. Visit `/login` → Should redirect to waitlist (no access granted)

**Scenario 4: Existing Auth Still Works**
1. User with beta access can login normally
2. User with beta access can signup normally
3. Logout functionality still works
4. Session persistence still works

---

## 📂 FILES YOU WILL CREATE/MODIFY

**Create:**
- [ ] `/pages/beta.tsx` (or equivalent based on structure)
- [ ] `.env.local` (if doesn't exist)

**Modify:**
- [ ] Login page component (add beta check only)
- [ ] Signup page component (add beta check only)
- [ ] `.env.example` (add beta variables)
- [ ] `.gitignore` (ensure `.env.local` is excluded)

**DO NOT MODIFY:**
- Any Supabase files
- Any authentication utilities
- Any API routes
- Any other pages/components

---

## 🎯 DELIVERABLES

Please provide:

1. **Phase 1 Discovery Report:**
   - Waitlist page URL: `_______`
   - Login page location: `_______`
   - Signup page location: `_______`
   - Routing library: `_______`
   - Current auth method: `_______`

2. **Implementation Summary:**
   - Files created: `_______`
   - Files modified: `_______`
   - Environment variables added: `_______`

3. **Testing Confirmation:**
   - [ ] Public users redirect to waitlist ✅
   - [ ] Beta code grants access ✅
   - [ ] Invalid code redirects to waitlist ✅
   - [ ] Existing auth still works ✅
   - [ ] No console errors ✅

---

## 🔄 HOW TO DISABLE BETA MODE (When Launching)

When ready to launch publicly:

**Step 1:** Change environment variable
```bash
# In .env.local
NEXT_PUBLIC_BETA_MODE=false
```

**Step 2:** Restart development server

**That's it!** All redirects will stop, everyone can access login/signup.

---

## ⚠️ IMPORTANT NOTES

1. **Do NOT remove the beta check code** - just toggle the env variable
   - Keep the code for future testing phases
   - Easy to re-enable if needed

2. **localStorage will persist** - users who had beta access will keep it
   - This is fine - they're legitimate users
   - Clear manually if needed: `localStorage.removeItem('beta_access')`

3. **Environment variables require restart** - after changing `.env.local`:
   - Stop the dev server
   - Restart: `npm run dev` or `yarn dev`

4. **Keep beta code secret** - do NOT:
   - Commit actual code to git
   - Share publicly
   - Post on social media
   - Include in client-side code (it's safe in NEXT_PUBLIC_ because it's only a gatekeeper)

---

## 🚀 LAUNCH DAY CHECKLIST

Before going public:

- [ ] Set `NEXT_PUBLIC_BETA_MODE=false`
- [ ] Test that anyone can access `/login` and `/signup`
- [ ] Test that existing users can still login
- [ ] Verify mobile app can authenticate (if applicable)
- [ ] Remove or archive `/beta` page (optional)
- [ ] Update any documentation referencing beta access

---

## 🆘 IF SOMETHING BREAKS

**Rollback immediately:**

1. Remove the beta check code from login/signup pages
2. Delete `/beta` page
3. Remove environment variables
4. Restart server

**Then report:**
- What broke
- Error messages
- Which file was modified
- Steps to reproduce

---

## 📞 FINAL NOTES

- **Work carefully** - authentication is critical
- **Test thoroughly** - before confirming complete
- **Preserve existing code** - only add, don't modify
- **Ask questions** - if anything is unclear about existing structure

**Start with Phase 1 discovery and report findings before implementing anything.**

Good luck! 🎯