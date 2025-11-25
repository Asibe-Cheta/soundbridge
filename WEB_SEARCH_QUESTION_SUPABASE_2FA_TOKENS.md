# Web Search Question: Supabase 2FA Token Generation

**Copy and paste this entire question into Claude (or similar AI assistant) with web search enabled:**

---

I'm working on a Next.js application with Supabase authentication that implements custom 2FA (Two-Factor Authentication) using TOTP (Time-based One-Time Password). After a user successfully verifies their 2FA code, I need to generate valid Supabase session tokens (accessToken and refreshToken) programmatically on the server side using the Supabase Admin API.

## Current Situation

**Tech Stack:**
- Next.js 14+ (App Router)
- Supabase (using `@supabase/supabase-js`)
- Node.js backend (API routes)
- Custom 2FA implementation with TOTP codes

**Current Flow:**
1. User logs in with email/password → Gets Supabase session
2. System checks if 2FA is enabled → Creates temporary verification session
3. User enters 6-digit TOTP code from authenticator app
4. Server verifies TOTP code against stored secret
5. **PROBLEM**: Need to generate valid Supabase accessToken and refreshToken after verification

**Current Implementation Attempt:**

```typescript
// After successful 2FA verification
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Attempting to generate tokens using generateLink
const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
  type: 'magiclink',
  email: userData.user.email!,
});

// Problem: generateLink() appears to return a link, not direct tokens
// Code comment says: "generateLink returns a link, but we need to extract tokens differently"
```

**What We Need:**
- Valid Supabase JWT `accessToken` that can be used for authenticated API requests
- Valid `refreshToken` that can be used to refresh the access token
- Tokens should work with Supabase RLS (Row Level Security) policies
- Tokens should be the same format as tokens from regular `signInWithPassword()`

**Constraints:**
- Must use server-side code (API route)
- Must use Supabase Admin API (service role key)
- User has already authenticated with email/password and verified 2FA code
- We have the user's email and user ID
- This is for a custom 2FA flow (not using Supabase's built-in 2FA)

## Questions

1. **What is the correct method to generate Supabase session tokens programmatically after custom 2FA verification?**
   - Does `auth.admin.generateLink()` actually return tokens in `properties.access_token` and `properties.refresh_token`?
   - Has the behavior of `generateLink()` changed in recent Supabase versions (especially with PKCE flow)?
   - Is there an alternative admin API method to create sessions directly?

2. **What are the current best practices (as of November 2025) for generating Supabase session tokens server-side?**
   - Are there any new admin API methods introduced recently?
   - Should we use a different approach than `generateLink()`?

3. **Security considerations:**
   - Is it secure to return tokens directly after 2FA verification?
   - What are the security implications of generating tokens server-side vs client-side?
   - Should tokens be generated on-demand or can we use a session token pattern?

4. **Alternative approaches:**
   - Should we use `auth.admin.createUser()` or `auth.admin.updateUserById()` with specific options?
   - Is there a way to use the existing Supabase session from email/password login and just "elevate" it after 2FA verification?
   - Should we use a different token generation pattern entirely?

5. **Code examples:**
   - Please provide a working TypeScript example of generating valid Supabase session tokens after custom 2FA verification
   - Include error handling and security best practices
   - Show how to extract tokens from the response (if using generateLink) or alternative method

## Additional Context

- We're storing 2FA verification status in a custom `two_factor_verification_sessions` table
- The verified session is marked as `verified: true` after successful code verification
- Current workaround: Web app re-signs in with email/password after verification (not ideal for mobile apps)
- Mobile app needs tokens directly in API response (can't store/retrieve password)

**Please search for the most recent information (2024-2025) about:**
- Supabase Admin API session token generation
- Changes to `generateLink()` behavior
- Best practices for custom 2FA with Supabase
- Server-side token generation patterns

Thank you for your help!

---

