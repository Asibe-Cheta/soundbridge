# 🐛 Mobile App Login Error - Debugging Guide

**Date**: November 22, 2025  
**From**: Web Team  
**To**: Mobile Team  
**Issue**: "undefined is not a function" error during login  
**Priority**: 🔴 **HIGH**

---

## 🎯 **ERROR DESCRIPTION**

**Error Message:**
```
Login Failed
undefined is not a function
```

**When It Happens:**
- User enters email and password
- Clicks login button
- Error appears immediately

---

## 🔍 **ROOT CAUSE ANALYSIS**

The error "undefined is not a function" is a **JavaScript runtime error** that occurs when:
1. Code tries to call a function that doesn't exist
2. A variable is `undefined` when it should be a function
3. An object method is missing or not initialized

**Most Likely Causes:**
1. ✅ **Supabase client not properly initialized**
2. ✅ **Function called on undefined object**
3. ✅ **API response structure mismatch**
4. ✅ **Supabase SDK version mismatch**

---

## 🛠️ **DEBUGGING STEPS FOR MOBILE TEAM**

### **Step 1: Check Supabase Client Initialization**

**Check if Supabase client is properly initialized:**

```typescript
// In your login function, add logging:
console.log('🔍 Supabase client check:');
console.log('- supabase exists:', !!supabase);
console.log('- supabase.auth exists:', !!supabase?.auth);
console.log('- signInWithPassword exists:', typeof supabase?.auth?.signInWithPassword);

// Before calling signInWithPassword:
if (!supabase || !supabase.auth || typeof supabase.auth.signInWithPassword !== 'function') {
  console.error('❌ Supabase client not properly initialized!');
  return { error: 'Authentication service not available' };
}
```

**Common Issues:**
- Supabase client is `null` or `undefined`
- `supabase.auth` is `undefined`
- `signInWithPassword` method doesn't exist

**Fix:**
```typescript
// Ensure Supabase client is initialized before use
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

// Initialize ONCE, reuse the instance
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Verify it's initialized
if (!supabase || !supabase.auth) {
  throw new Error('Failed to initialize Supabase client');
}
```

---

### **Step 2: Check Login Function Implementation**

**Verify your login function:**

```typescript
async function signIn(email: string, password: string) {
  try {
    console.log('🔐 Starting login for:', email);
    
    // ✅ CHECK 1: Verify supabase client exists
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    // ✅ CHECK 2: Verify auth object exists
    if (!supabase.auth) {
      throw new Error('Supabase auth not available');
    }
    
    // ✅ CHECK 3: Verify signInWithPassword is a function
    if (typeof supabase.auth.signInWithPassword !== 'function') {
      console.error('❌ signInWithPassword is not a function!');
      console.error('Type:', typeof supabase.auth.signInWithPassword);
      console.error('Available methods:', Object.keys(supabase.auth));
      throw new Error('signInWithPassword method not available');
    }
    
    console.log('✅ All checks passed, calling signInWithPassword...');
    
    // ✅ CALL: Now safe to call
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Login successful:', data.user?.id);
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
```

---

### **Step 3: Check Supabase SDK Version**

**Verify you're using a compatible Supabase SDK version:**

```bash
# Check your package.json
npm list @supabase/supabase-js

# Should be version 2.x.x (latest stable)
```

**Recommended Version:**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  }
}
```

**If using React Native:**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@react-native-async-storage/async-storage": "^1.21.0"
  }
}
```

**Update if needed:**
```bash
npm install @supabase/supabase-js@latest
# or
yarn add @supabase/supabase-js@latest
```

---

### **Step 4: Check for Async/Await Issues**

**Ensure you're properly awaiting async calls:**

```typescript
// ❌ WRONG - Missing await
const result = supabase.auth.signInWithPassword({ email, password });
console.log(result); // This will be a Promise, not the result!

// ✅ CORRECT - Properly awaited
const { data, error } = await supabase.auth.signInWithPassword({ 
  email, 
  password 
});
```

---

### **Step 5: Check Error Handling**

**Add comprehensive error handling:**

```typescript
async function signIn(email: string, password: string) {
  try {
    // Validate inputs
    if (!email || !password) {
      return { 
        success: false, 
        error: 'Email and password are required' 
      };
    }
    
    // Check Supabase client
    if (!supabase?.auth?.signInWithPassword) {
      return { 
        success: false, 
        error: 'Authentication service not available. Please restart the app.' 
      };
    }
    
    // Attempt login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    
    if (error) {
      // Handle specific errors
      if (error.message.includes('Invalid login credentials')) {
        return { 
          success: false, 
          error: 'Invalid email or password' 
        };
      }
      
      if (error.message.includes('Email not confirmed')) {
        return { 
          success: false, 
          error: 'Please verify your email before signing in',
          needsEmailVerification: true
        };
      }
      
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      };
    }
    
    if (!data?.session || !data?.user) {
      return { 
        success: false, 
        error: 'Login succeeded but no session was created' 
      };
    }
    
    return { 
      success: true, 
      data,
      session: data.session,
      user: data.user
    };
    
  } catch (error) {
    console.error('❌ Login exception:', error);
    
    // Check if it's the "undefined is not a function" error
    if (error instanceof TypeError && error.message.includes('is not a function')) {
      return {
        success: false,
        error: 'Authentication service error. Please update the app.',
        technicalError: error.message,
        stack: error.stack
      };
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    };
  }
}
```

---

### **Step 6: Check for API Calls After Login**

**If your app makes API calls immediately after login, verify they handle Bearer tokens:**

```typescript
// After successful login, get the access token
const { data: { session } } = await supabase.auth.getSession();
const accessToken = session?.access_token;

if (!accessToken) {
  console.error('❌ No access token after login!');
  return { error: 'Failed to get access token' };
}

// Use Bearer token for API calls
const response = await fetch('https://www.soundbridge.live/api/user/profile-status', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});

const profileData = await response.json();
```

---

## 🔧 **COMMON FIXES**

### **Fix #1: Reinitialize Supabase Client**

```typescript
// If Supabase client might be undefined, reinitialize:
import { createClient } from '@supabase/supabase-js';

let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_URL';
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_KEY';
    
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: AsyncStorage, // For React Native
      },
    });
  }
  
  return supabase;
}

// Use it:
const client = getSupabaseClient();
const { data, error } = await client.auth.signInWithPassword({ email, password });
```

---

### **Fix #2: Check Environment Variables**

**Verify environment variables are set:**

```typescript
// Add this check at app startup:
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('URL:', !!supabaseUrl);
  console.error('Key:', !!supabaseAnonKey);
  // Show error to user or use fallback
}
```

---

### **Fix #3: Add Defensive Checks**

```typescript
// Before calling any Supabase method, check it exists:
function safeSignIn(email: string, password: string) {
  // Check 1: Supabase client exists
  if (!supabase) {
    return { error: 'Supabase client not initialized' };
  }
  
  // Check 2: Auth object exists
  if (!supabase.auth) {
    return { error: 'Supabase auth not available' };
  }
  
  // Check 3: Method exists
  if (typeof supabase.auth.signInWithPassword !== 'function') {
    return { error: 'signInWithPassword method not available' };
  }
  
  // Now safe to call
  return supabase.auth.signInWithPassword({ email, password });
}
```

---

## 🧪 **TESTING CHECKLIST**

### **Test 1: Basic Login**
- [ ] Verify Supabase client is initialized
- [ ] Verify `signInWithPassword` method exists
- [ ] Test with valid credentials
- [ ] Check error handling for invalid credentials

### **Test 2: Error Scenarios**
- [ ] Test with empty email/password
- [ ] Test with invalid email format
- [ ] Test with wrong password
- [ ] Test with unverified email
- [ ] Test with network error (airplane mode)

### **Test 3: Session Management**
- [ ] Verify session is created after login
- [ ] Verify access token is available
- [ ] Test API calls with Bearer token
- [ ] Verify session persists after app restart

---

## 📊 **WHAT TO CHECK IN YOUR CODE**

### **1. Supabase Client Setup**

**Location:** Usually in a config file or service

**Check:**
```typescript
// ✅ Should look like this:
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage'; // React Native

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage, // React Native
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);
```

---

### **2. Login Function**

**Location:** Your login screen or auth service

**Check:**
```typescript
// ✅ Should use await:
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

---

### **3. Error Display**

**Location:** Your login UI component

**Check:**
```typescript
// ✅ Should handle errors properly:
if (error) {
  // Show user-friendly error
  setError(error.message || 'Login failed');
} else {
  // Handle success
  navigation.navigate('Home');
}
```

---

## 🚨 **IMMEDIATE ACTION ITEMS**

### **For Mobile Team:**

1. **Add Logging:**
   ```typescript
   console.log('Supabase client:', !!supabase);
   console.log('Auth object:', !!supabase?.auth);
   console.log('signInWithPassword:', typeof supabase?.auth?.signInWithPassword);
   ```

2. **Check Stack Trace:**
   - Look at the full error stack trace
   - Identify which line is calling the undefined function
   - Share the stack trace with web team

3. **Verify Supabase SDK Version:**
   ```bash
   npm list @supabase/supabase-js
   ```

4. **Test with Minimal Code:**
   ```typescript
   // Create a test function to isolate the issue
   async function testLogin() {
     try {
       const { data, error } = await supabase.auth.signInWithPassword({
         email: 'test@example.com',
         password: 'test123',
       });
       console.log('Result:', { data, error });
     } catch (err) {
       console.error('Exception:', err);
     }
   }
   ```

---

## 📞 **IF STILL NOT WORKING**

**Share with Web Team:**

1. **Full Error Stack Trace:**
   - Copy the complete error from console
   - Include line numbers

2. **Supabase Client Initialization Code:**
   - How you're creating the Supabase client
   - Environment variables used

3. **Login Function Code:**
   - The exact login function implementation
   - Any error handling

4. **Package Versions:**
   ```bash
   npm list @supabase/supabase-js
   npm list @react-native-async-storage/async-storage  # If React Native
   ```

5. **Device/Platform Info:**
   - iOS or Android
   - React Native or Expo
   - Device model and OS version

---

## ✅ **EXPECTED BEHAVIOR**

**After Fix, Login Should:**
1. ✅ Call `signInWithPassword` without errors
2. ✅ Return `{ data, error }` object
3. ✅ Create a session if credentials are valid
4. ✅ Return user object with `id`, `email`, etc.
5. ✅ Provide `access_token` for API calls

---

## 🔗 **RELATED DOCUMENTATION**

- **Supabase Auth Docs:** https://supabase.com/docs/guides/auth
- **React Native Setup:** https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
- **Bearer Token Guide:** See `MOBILE_TEAM_2FA_CURRENT_STRUCTURE_UPDATE.md`

---

**Status:** 🔴 **NEEDS MOBILE TEAM INVESTIGATION**  
**Next Step:** Mobile team adds logging and shares stack trace

---

**Web Team**  
November 22, 2025

