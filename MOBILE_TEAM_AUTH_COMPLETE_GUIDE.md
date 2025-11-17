# 🔐 SoundBridge Mobile Authentication - Complete Implementation Guide

**Date**: November 17, 2025  
**Status**: ✅ **Production Ready** - All Auth Flows Tested & Working  
**Breaking Changes**: Bearer token authentication now required for all API calls

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication Architecture](#authentication-architecture)
3. [Email/Password Registration](#emailpassword-registration)
4. [Email/Password Login](#emailpassword-login)
5. [Password Reset Flow](#password-reset-flow)
6. [Google OAuth Integration](#google-oauth-integration)
7. [Session Management](#session-management)
8. [API Authentication](#api-authentication)
9. [Onboarding Flow](#onboarding-flow)
10. [Error Handling](#error-handling)
11. [Testing Checklist](#testing-checklist)

---

## 1. Overview

### ✅ What's Working

- ✅ Email/Password Registration with email verification
- ✅ Email/Password Login
- ✅ Password Reset Flow
- ✅ Google OAuth (PKCE Flow)
- ✅ Automatic profile creation after auth
- ✅ Bearer token authentication for all API calls
- ✅ Complete onboarding flow integration

### 🔧 Recent Fixes (Nov 17, 2025)

1. **Bearer Token Authentication** (CRITICAL):
   - All API calls now require `Authorization: Bearer <access_token>` header
   - Cookie-based auth deprecated due to cross-platform issues
   - Unified `fetchWithAuth` pattern for consistent auth

2. **Missing Profile Handling**:
   - All endpoints now check if profile exists before updating
   - Auto-create profile with defaults if missing
   - Prevents "Cannot coerce to single JSON object" errors

3. **Google OAuth Stability**:
   - Fixed "invalid request: both auth code and code verifier should be non-empty" error
   - Migrated to `@supabase/ssr` for Next.js 15 compatibility
   - Proper session persistence across OAuth redirects

---

## 2. Authentication Architecture

### 🏗️ Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    MOBILE APP (React Native)                     │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Supabase Client (@supabase/supabase-js)                   │ │
│  │  - Handles auth state (login, register, OAuth)              │ │
│  │  - Stores session in AsyncStorage (persistent)              │ │
│  │  - Auto-refreshes tokens                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Bearer Token Extraction                                    │ │
│  │  const { access_token } = session                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
└──────────────────────────────┼────────────────────────────────────┘
                               │
                               ▼
            Authorization: Bearer <access_token>
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WEB API (Next.js Routes)                      │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  getSupabaseRouteClient (api-auth.ts)                      │ │
│  │  1. Extracts bearer token from Authorization header        │ │
│  │  2. Validates with Supabase                                 │ │
│  │  3. Returns authenticated user + Supabase client            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  API Route Logic                                            │ │
│  │  - Profile CRUD                                             │ │
│  │  - Onboarding progress                                      │ │
│  │  - Content management                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 🔑 Key Components

1. **Supabase Client** (Mobile):
   - URL: `https://aunxdbqukbxyyiusaeqi.supabase.co`
   - Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU1NTE3MTIsImV4cCI6MjA0MTEyNzcxMn0.qJGw3VIv0BN7S0-MUp-y1Z35TueDdmVMIGJlS4X7Bqs`

2. **Auth Endpoints**:
   - Registration: Supabase Auth API (handled by SDK)
   - Login: Supabase Auth API (handled by SDK)
   - OAuth: Supabase Auth API (handled by SDK)
   - Password Reset: Supabase Auth API (handled by SDK)

3. **Custom API Endpoints**:
   - Profile Management: `/api/user/complete-profile`
   - Onboarding: `/api/user/complete-onboarding`
   - Onboarding Progress: `/api/user/onboarding-progress`
   - Onboarding Status: `/api/user/onboarding-status`
   - Profile Status: `/api/user/profile-status`

---

## 3. Email/Password Registration

### 📝 Implementation

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize Supabase client (do this once in your app)
const supabase = createClient(
  'https://aunxdbqukbxyyiusaeqi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU1NTE3MTIsImV4cCI6MjA0MTEyNzcxMn0.qJGw3VIv0BN7S0-MUp-y1Z35TueDdmVMIGJlS4X7Bqs',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Important for mobile!
    },
  }
);

// Registration function
async function registerWithEmail(email: string, password: string, metadata?: any) {
  try {
    console.log('📝 Starting registration for:', email);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata, // Optional: { full_name: 'John Doe' }
        // Email confirmation will be sent automatically by Supabase
      },
    });

    if (error) {
      console.error('❌ Registration error:', error);
      return { success: false, error: error.message };
    }

    if (data.user) {
      console.log('✅ Registration successful:', data.user.id);
      console.log('📧 Confirmation email sent to:', email);
      
      // Note: User needs to verify email before they can sign in
      // Session will NOT be available until email is confirmed
      return {
        success: true,
        user: data.user,
        needsEmailVerification: !data.session, // true if email confirmation required
        message: 'Please check your email to verify your account'
      };
    }

    return { success: false, error: 'Unknown error during registration' };
  } catch (error: any) {
    console.error('❌ Unexpected registration error:', error);
    return { success: false, error: error.message || 'Registration failed' };
  }
}
```

### 📧 Email Verification Flow

1. **User registers** → Supabase sends confirmation email
2. **User clicks link in email** → Redirects to web callback
3. **Web callback creates profile** → Sets `onboarding_completed: false`
4. **User opens mobile app** → Session is synced automatically
5. **App checks onboarding status** → Shows onboarding if needed

### 🔍 Important Notes

- **Email verification is REQUIRED** by default in Supabase
- User **cannot sign in** until email is verified
- Session will be `null` until email is confirmed
- To disable email verification (NOT RECOMMENDED):
  - Go to Supabase Dashboard → Authentication → Settings
  - Disable "Enable email confirmations"

### ✅ What Happens After Registration

1. ✅ User record created in `auth.users` table
2. ✅ Confirmation email sent (if enabled)
3. ✅ Profile will be created when user verifies email (via web callback)
4. ✅ Onboarding flag set to `false` (user needs to complete onboarding)

---

## 4. Email/Password Login

### 🔐 Implementation

```typescript
async function signInWithEmail(email: string, password: string) {
  try {
    console.log('🔐 Attempting login for:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ Login error:', error);
      
      // Handle specific error cases
      if (error.message.includes('Email not confirmed')) {
        return {
          success: false,
          error: 'Please verify your email before signing in',
          needsEmailVerification: true
        };
      }
      
      if (error.message.includes('Invalid login credentials')) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }
      
      return { success: false, error: error.message };
    }

    if (data.session && data.user) {
      console.log('✅ Login successful:', data.user.id);
      console.log('🔑 Access token:', data.session.access_token.substring(0, 20) + '...');
      
      // Store session (AsyncStorage handles this automatically)
      // Extract access token for API calls
      const accessToken = data.session.access_token;
      
      return {
        success: true,
        user: data.user,
        session: data.session,
        accessToken,
      };
    }

    return { success: false, error: 'Unknown login error' };
  } catch (error: any) {
    console.error('❌ Unexpected login error:', error);
    return { success: false, error: error.message || 'Login failed' };
  }
}
```

### 🎯 Post-Login Flow

```typescript
async function handleSuccessfulLogin(session: Session, user: User) {
  try {
    // 1. Check if user needs onboarding
    const { needsOnboarding } = await checkOnboardingStatus(session.access_token, user.id);
    
    if (needsOnboarding) {
      // Navigate to onboarding screen
      navigation.navigate('Onboarding');
    } else {
      // Navigate to main app
      navigation.navigate('Home');
    }
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    // Default to showing onboarding to be safe
    navigation.navigate('Onboarding');
  }
}

// Helper function to check onboarding status
async function checkOnboardingStatus(accessToken: string, userId: string) {
  const response = await fetch('https://www.soundbridge.live/api/user/onboarding-status', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`, // CRITICAL!
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    needsOnboarding: data.needsOnboarding || false,
    profile: data.profile,
    onboarding: data.onboarding,
  };
}
```

---

## 5. Password Reset Flow

### 🔄 Implementation

```typescript
// Step 1: Request password reset email
async function requestPasswordReset(email: string) {
  try {
    console.log('📧 Requesting password reset for:', email);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://www.soundbridge.live/update-password',
    });

    if (error) {
      console.error('❌ Password reset request error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Password reset email sent');
    return {
      success: true,
      message: 'Password reset email sent. Please check your inbox.'
    };
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
}

// Step 2: User clicks link in email → Web handles password update
// Step 3: User signs in with new password in mobile app
```

### 📝 Password Reset Flow

1. **User clicks "Forgot Password"** → App calls `requestPasswordReset(email)`
2. **Supabase sends email** → Contains reset link to web app
3. **User clicks link** → Opens `https://www.soundbridge.live/update-password`
4. **Web app shows password form** → User enters new password
5. **Password updated** → User can now sign in with new password
6. **User returns to mobile app** → Signs in with new password

### ⚠️ Important Note

- Password reset is handled via web interface (not deep link)
- This is intentional for security reasons
- User simply returns to mobile app and signs in with new password

---

## 6. Google OAuth Integration

### 🔐 Implementation (React Native)

```typescript
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// CRITICAL: Complete the auth session after OAuth redirect
WebBrowser.maybeCompleteAuthSession();

async function signInWithGoogle() {
  try {
    console.log('🔐 Starting Google OAuth flow');
    
    // Create redirect URL for your app
    const redirectTo = Linking.createURL('/auth/callback');
    
    console.log('📍 Redirect URL:', redirectTo);
    
    // Initiate OAuth with Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo, // Your app's deep link
        skipBrowserRedirect: false, // Let Supabase handle redirect
      },
    });

    if (error) {
      console.error('❌ OAuth error:', error);
      return { success: false, error: error.message };
    }

    if (data.url) {
      console.log('🌐 Opening OAuth URL:', data.url);
      
      // Open browser for OAuth
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      console.log('📱 Browser result:', result.type);

      if (result.type === 'success') {
        // Extract tokens from URL
        const { url } = result;
        const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
        
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        
        if (access_token && refresh_token) {
          // Set session in Supabase client
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) {
            console.error('❌ Session error:', sessionError);
            return { success: false, error: sessionError.message };
          }

          console.log('✅ Google OAuth successful');
          return {
            success: true,
            session: sessionData.session,
            user: sessionData.user,
            accessToken: access_token,
          };
        }
      }

      return { success: false, error: 'OAuth was cancelled or failed' };
    }

    return { success: false, error: 'No OAuth URL received' };
  } catch (error: any) {
    console.error('❌ Unexpected OAuth error:', error);
    return { success: false, error: error.message };
  }
}
```

### 🔧 Deep Link Configuration

#### iOS (`ios/YourApp/Info.plist`)

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>soundbridge</string> <!-- Your app scheme -->
    </array>
  </dict>
</array>
```

#### Android (`android/app/src/main/AndroidManifest.xml`)

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="soundbridge" /> <!-- Your app scheme -->
</intent-filter>
```

#### Expo (`app.json`)

```json
{
  "expo": {
    "scheme": "soundbridge",
    "ios": {
      "bundleIdentifier": "com.yourcompany.soundbridge"
    },
    "android": {
      "package": "com.yourcompany.soundbridge"
    }
  }
}
```

### 🌐 Supabase OAuth Configuration

In Supabase Dashboard → Authentication → URL Configuration:

**Redirect URLs** (add both):
```
soundbridge://auth/callback
exp://localhost:19000/--/auth/callback
```

**Site URL**:
```
https://www.soundbridge.live
```

### ✅ What Happens After Google OAuth

1. ✅ User authenticated via Google
2. ✅ Supabase creates user in `auth.users`
3. ✅ Web callback creates profile with Google metadata (name, avatar)
4. ✅ Profile auto-populated: `display_name`, `first_name`, `last_name`, `avatar_url`
5. ✅ Onboarding flag set to `false` (user needs to select role/interests)
6. ✅ Session synced to mobile app

---

## 7. Session Management

### 🔄 Session Persistence

```typescript
// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔄 Auth event:', event);
  
  if (event === 'SIGNED_IN' && session) {
    console.log('✅ User signed in:', session.user.id);
    // Store access token for API calls
    const accessToken = session.access_token;
    // Navigate to appropriate screen
  }
  
  if (event === 'SIGNED_OUT') {
    console.log('🚪 User signed out');
    // Clear any local state
    // Navigate to login screen
  }
  
  if (event === 'TOKEN_REFRESHED' && session) {
    console.log('🔄 Token refreshed');
    // Update stored access token
    const accessToken = session.access_token;
  }
  
  if (event === 'USER_UPDATED' && session) {
    console.log('👤 User updated');
    // Refresh user data
  }
});
```

### 🔑 Getting Current Session

```typescript
async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Error getting session:', error);
      return null;
    }
    
    if (session) {
      console.log('✅ Active session found for:', session.user.email);
      return {
        user: session.user,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at,
      };
    }
    
    console.log('⚠️ No active session');
    return null;
  } catch (error) {
    console.error('❌ Unexpected error getting session:', error);
    return null;
  }
}
```

### 🚪 Sign Out

```typescript
async function signOut() {
  try {
    console.log('🚪 Signing out user');
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Sign out error:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ User signed out successfully');
    // Clear any local storage
    // Navigate to login screen
    return { success: true };
  } catch (error: any) {
    console.error('❌ Unexpected sign out error:', error);
    return { success: false, error: error.message };
  }
}
```

---

## 8. API Authentication

### 🔑 Making Authenticated API Calls

**CRITICAL**: All API calls to `/api/*` endpoints MUST include bearer token!

```typescript
async function makeAuthenticatedRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  try {
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      throw new Error('No active session - user must sign in');
    }
    
    // Extract access token
    const accessToken = session.access_token;
    
    // Make request with bearer token
    const response = await fetch(`https://www.soundbridge.live${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`, // CRITICAL!
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('❌ API request error:', error);
    throw error;
  }
}

// Example usage
async function completeProfile(profileData: any) {
  return await makeAuthenticatedRequest('/api/user/complete-profile', {
    method: 'POST',
    body: JSON.stringify(profileData),
  });
}
```

### 📋 Available API Endpoints

#### 1. **Check Onboarding Status**
```typescript
GET /api/user/onboarding-status
Headers: Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "needsOnboarding": true,
  "profile": {
    "id": "user-id",
    "onboarding_completed": false,
    "onboarding_step": "role_selection",
    "profile_completed": false
  },
  "onboarding": {
    "currentStep": "role_selection",
    "profileCompleted": false,
    "firstActionCompleted": false
  }
}
```

#### 2. **Update Onboarding Progress**
```typescript
POST /api/user/onboarding-progress
Headers: Authorization: Bearer <access_token>
Body: {
  "userId": "user-id",
  "currentStep": "profile_setup", // optional
  "selectedRole": "musician", // optional: musician, podcaster, event_promoter, listener
  "profileCompleted": true, // optional
  "firstActionCompleted": false // optional
}

Response:
{
  "success": true,
  "message": "Onboarding progress updated successfully",
  "profile": { /* updated profile */ }
}
```

#### 3. **Complete Profile**
```typescript
POST /api/user/complete-profile
Headers: Authorization: Bearer <access_token>
Body: {
  "role": "musician", // Required: musician, podcaster, event_promoter, listener
  "display_name": "John Doe", // Required
  "avatar_url": "https://...", // Optional
  "country": "US", // Optional
  "bio": "I'm a musician...", // Optional
  "genres": ["pop", "rock"], // Optional: array of genre IDs
  
  // Optional creator-specific fields:
  "collaboration_enabled": true,
  "min_notice_days": 7,
  "auto_decline_unavailable": true,
  "social_links": {
    "spotify": "https://...",
    "instagram": "https://..."
  }
}

Response:
{
  "success": true,
  "message": "Profile completed successfully",
  "profile": { /* complete profile */ }
}
```

#### 4. **Complete Onboarding**
```typescript
POST /api/user/complete-onboarding
Headers: Authorization: Bearer <access_token>
Body: {
  "userId": "user-id"
}

Response:
{
  "success": true,
  "message": "Onboarding completed successfully",
  "profile": { /* updated profile with onboarding_completed: true */ }
}
```

#### 5. **Get Profile Status**
```typescript
GET /api/user/profile-status
Headers: Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "profile": {
    "id": "user-id",
    "username": "johndoe",
    "display_name": "John Doe",
    "role": "musician",
    "onboarding_completed": true,
    "profile_completed": true
  }
}
```

---

## 9. Onboarding Flow

### 📝 Complete Onboarding Implementation

```typescript
// Step 1: Role Selection
async function selectRole(role: 'musician' | 'podcaster' | 'event_promoter' | 'listener') {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');
    
    const response = await fetch('https://www.soundbridge.live/api/user/onboarding-progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        userId: session.user.id,
        selectedRole: role,
        currentStep: 'profile_setup',
      }),
    });
    
    if (!response.ok) throw new Error('Failed to save role');
    
    return await response.json();
  } catch (error) {
    console.error('Error selecting role:', error);
    throw error;
  }
}

// Step 2: Complete Profile
async function completeProfile(profileData: {
  role: string;
  display_name: string;
  avatar_url?: string;
  country?: string;
  bio?: string;
  genres?: string[];
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');
    
    const response = await fetch('https://www.soundbridge.live/api/user/complete-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(profileData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to complete profile');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error completing profile:', error);
    throw error;
  }
}

// Step 3: Complete Onboarding
async function completeOnboarding() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');
    
    const response = await fetch('https://www.soundbridge.live/api/user/complete-onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        userId: session.user.id,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to complete onboarding');
    }
    
    const result = await response.json();
    console.log('✅ Onboarding completed successfully');
    
    // Navigate to main app
    // navigation.navigate('Home');
    
    return result;
  } catch (error) {
    console.error('Error completing onboarding:', error);
    throw error;
  }
}
```

### 🎯 Onboarding Screens Flow

```
1. Role Selection Screen
   ↓ (call selectRole())
   
2. Profile Setup Screen
   - Display Name
   - Avatar Upload
   - Country
   - Bio
   - Genre Selection (if musician/podcaster)
   ↓ (call completeProfile())
   
3. First Action Screen (optional)
   - Follow suggested creators
   - Listen to featured tracks
   - Explore events
   ↓ (call completeOnboarding())
   
4. Home Screen (main app)
```

---

## 10. Error Handling

### ⚠️ Common Errors and Solutions

#### 1. **401 Unauthorized**
```typescript
Error: "Authentication required"
Cause: Missing or invalid bearer token
Solution:
  - Ensure user is signed in: await supabase.auth.getSession()
  - Check access token is included: Authorization: Bearer <token>
  - Token may be expired: Supabase auto-refreshes, check event listener
```

#### 2. **500 Cannot coerce to single JSON object**
```typescript
Error: "Cannot coerce the result to a single JSON object"
Cause: Profile doesn't exist for user
Solution:
  - This is now handled automatically by backend
  - Profile will be created on first API call
  - If you see this error, backend needs updating
```

#### 3. **Email not confirmed**
```typescript
Error: "Email not confirmed"
Cause: User hasn't verified their email
Solution:
  - Show message: "Please check your email to verify your account"
  - Provide "Resend verification email" button:
    await supabase.auth.resend({ type: 'signup', email })
```

#### 4. **Invalid login credentials**
```typescript
Error: "Invalid login credentials"
Cause: Wrong email or password
Solution:
  - Show user-friendly message: "Invalid email or password"
  - Provide "Forgot password?" link
```

#### 5. **OAuth: invalid request**
```typescript
Error: "invalid request: both auth code and code verifier should be non-empty"
Cause: PKCE flow issue or expired OAuth session
Solution:
  - Ensure WebBrowser.maybeCompleteAuthSession() is called
  - Check deep link configuration (scheme must match)
  - Clear Supabase storage and retry:
    await AsyncStorage.clear()
```

### 🛡️ Error Handling Pattern

```typescript
async function handleAuthError(error: any) {
  console.error('Auth error:', error);
  
  // Parse error message
  const errorMessage = error.message || error.error || 'An error occurred';
  
  // Map to user-friendly messages
  const friendlyErrors: Record<string, string> = {
    'Email not confirmed': 'Please verify your email before signing in',
    'Invalid login credentials': 'Invalid email or password',
    'User already registered': 'An account with this email already exists',
    'Authentication required': 'Please sign in to continue',
    'Password should be at least 6 characters': 'Password must be at least 6 characters long',
  };
  
  // Find matching error
  const friendlyMessage = Object.entries(friendlyErrors).find(([key]) => 
    errorMessage.includes(key)
  )?.[1] || errorMessage;
  
  // Show to user
  Alert.alert('Error', friendlyMessage);
  
  // Log for debugging
  console.error('Detailed error:', error);
}
```

---

## 11. Testing Checklist

### ✅ Manual Testing Checklist

#### Email/Password Registration
- [ ] Can register with valid email and password
- [ ] Receives confirmation email
- [ ] Cannot sign in before email confirmation
- [ ] Can resend confirmation email
- [ ] Email link successfully verifies account
- [ ] Profile is created after verification
- [ ] Onboarding modal appears after first sign in

#### Email/Password Login
- [ ] Can sign in with verified account
- [ ] Error shown for unverified account
- [ ] Error shown for invalid credentials
- [ ] Session persists after app restart
- [ ] Can access authenticated API endpoints

#### Password Reset
- [ ] Can request password reset email
- [ ] Receives reset email with link
- [ ] Web page allows password update
- [ ] Can sign in with new password
- [ ] Old password no longer works

#### Google OAuth
- [ ] Google sign-in button opens browser
- [ ] Can authenticate with Google account
- [ ] Redirects back to mobile app
- [ ] Session is established in mobile app
- [ ] Profile is auto-created with Google metadata
- [ ] Onboarding modal appears for new users
- [ ] Existing users bypass onboarding

#### Onboarding Flow
- [ ] Role selection saves successfully
- [ ] Profile completion saves all fields
- [ ] Genre selection works (if applicable)
- [ ] Avatar upload works
- [ ] Progress persists between app restarts
- [ ] Completion redirects to home screen
- [ ] Can skip onboarding if allowed

#### Session Management
- [ ] Session persists after app restart
- [ ] Token auto-refreshes before expiry
- [ ] Sign out clears session completely
- [ ] Auth state changes trigger UI updates

#### API Authentication
- [ ] All API calls include bearer token
- [ ] 401 errors handled gracefully
- [ ] Token refresh works automatically
- [ ] Concurrent API calls work correctly

---

## 📞 Support & Questions

### 🐛 Reporting Issues

If you encounter any issues:

1. **Check this guide first** - Most common issues are covered
2. **Check Supabase logs**:
   - Dashboard → Authentication → Users
   - Dashboard → Logs
3. **Check network logs** in your mobile app debugger
4. **Provide detailed error information**:
   - Error message
   - Stack trace
   - Steps to reproduce
   - User ID (if applicable)

### 📚 Additional Resources

- **Supabase Docs**: https://supabase.com/docs/guides/auth
- **Supabase JS Client**: https://supabase.com/docs/reference/javascript/auth-api
- **React Native Setup**: https://supabase.com/docs/guides/auth/native-mobile-deep-linking

---

## 🎉 Summary

### ✅ What's Ready

1. ✅ **Email/Password Auth** - Registration, login, password reset all working
2. ✅ **Google OAuth** - Fully tested and working with PKCE flow
3. ✅ **Bearer Token Auth** - All API endpoints require and validate tokens
4. ✅ **Auto Profile Creation** - Profiles created automatically after auth
5. ✅ **Onboarding Flow** - Complete integration with progress tracking
6. ✅ **Session Management** - Auto-refresh, persistence, error handling

### 🚀 Next Steps for Mobile Team

1. **Initialize Supabase Client** with provided credentials
2. **Implement auth screens** using code examples above
3. **Add bearer token to all API calls** (CRITICAL!)
4. **Implement onboarding flow** with role selection → profile → completion
5. **Test thoroughly** using checklist above
6. **Handle errors gracefully** using error handling patterns

---

**Last Updated**: November 17, 2025  
**Document Version**: 2.0  
**Web Backend Version**: Latest (all auth flows tested and working)

