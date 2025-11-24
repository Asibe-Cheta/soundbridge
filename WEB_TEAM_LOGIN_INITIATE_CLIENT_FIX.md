# 🔧 Login-Initiate Client Fix - Web Team Response

**Date:** November 23, 2025  
**Status:** ✅ Code Updated with Debug Logging

## Summary

We've updated the `/api/auth/login-initiate` route to:
1. Create the service role client fresh for each request (instead of module-level)
2. Add comprehensive debug logging to verify client configuration
3. Ensure environment variables are properly accessed

## Changes Made

### 1. Client Creation Pattern

**Before (Module-level):**
```typescript
const supabaseAdmin = createClient(..., SUPABASE_SERVICE_ROLE_KEY);
```

**After (Function-level with helper):**
```typescript
function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createClient(..., serviceRoleKey);
}

// Inside POST function
const supabaseAdmin = getSupabaseAdmin();
```

**Why:** In serverless environments, creating the client fresh for each request ensures:
- Environment variables are correctly accessed
- No stale client instances
- Better error handling if env vars are missing

### 2. Debug Logging Added

Added comprehensive logging before the insert operation:

```typescript
console.log('🔍 Service Role Client Verification:');
console.log('  - supabaseAdmin exists:', !!supabaseAdmin);
console.log('  - SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('  - SUPABASE_SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
console.log('  - SUPABASE_SERVICE_ROLE_KEY starts with:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) || 'N/A');
console.log('  - SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('  - Client type check:', typeof supabaseAdmin);
```

This will help diagnose:
- Whether the service role key is available
- Whether the client is created correctly
- What's happening when the insert fails

### 3. Enhanced Error Logging

The existing error logging already includes:
- Error code, message, details, hint
- User ID
- Service role key existence check

## Code Verification

✅ **Client Creation:** Using `SUPABASE_SERVICE_ROLE_KEY`  
✅ **Client Usage:** Using `supabaseAdmin` for the insert  
✅ **No Helper Functions:** Direct insert, no intermediate functions  
✅ **Client Scope:** Client created in function scope, accessible for insert

## Testing Steps

### 1. Check Vercel Logs

After deployment, check Vercel function logs when calling `/api/auth/login-initiate`. Look for:

```
🔍 Service Role Client Verification:
  - supabaseAdmin exists: true
  - SUPABASE_SERVICE_ROLE_KEY exists: true
  - SUPABASE_SERVICE_ROLE_KEY length: [should be > 0]
  - SUPABASE_SERVICE_ROLE_KEY starts with: [first 10 chars]
  - SUPABASE_URL exists: true
  - Client type check: object
```

### 2. Verify Environment Variable

**In Vercel Dashboard:**
- Go to Project Settings → Environment Variables
- Verify `SUPABASE_SERVICE_ROLE_KEY` exists
- Verify it's set for **Production** environment
- Check that the value matches Supabase Dashboard → Settings → API → Service Role Key

### 3. Test the Endpoint

**Request:**
```bash
POST /api/auth/login-initiate
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Expected Response (if 2FA enabled):**
```json
{
  "success": true,
  "requires2FA": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "verificationSessionId": "uuid"
  }
}
```

**If RLS Error Persists:**
Check the error logs for the detailed error message and the debug information above.

## Possible Issues & Solutions

### Issue 1: Environment Variable Not Set in Vercel

**Symptom:** Debug logs show `SUPABASE_SERVICE_ROLE_KEY exists: false`

**Solution:**
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add `SUPABASE_SERVICE_ROLE_KEY` with value from Supabase Dashboard
3. Redeploy the application

### Issue 2: Environment Variable Set for Wrong Environment

**Symptom:** Key exists but might be set only for Development, not Production

**Solution:**
1. Check Vercel environment variable settings
2. Ensure it's set for **Production** (or **All Environments**)
3. Redeploy

### Issue 3: Service Role Key Incorrect

**Symptom:** Key exists but doesn't match Supabase

**Solution:**
1. Get the correct key from Supabase Dashboard → Settings → API → Service Role Key
2. Update in Vercel
3. Redeploy

### Issue 4: Client Still Not Recognized as Service Role

**Symptom:** RLS error persists even with correct key

**Solution:**
This would indicate a Supabase client library issue. Check:
- Supabase JS library version
- Whether we need to explicitly set headers
- Supabase documentation for serverless environments

## Next Steps

1. ✅ **Code Updated** - Client creation moved to function level
2. ✅ **Debug Logging Added** - Will help diagnose the issue
3. ⏳ **Deploy to Vercel** - Changes will auto-deploy
4. ⏳ **Check Logs** - Review debug output in Vercel function logs
5. ⏳ **Verify Fix** - Test the endpoint and confirm RLS error is resolved

## If Issue Persists

If the RLS error continues after these changes:

1. **Share the debug logs** from Vercel function logs (the `🔍 Service Role Client Verification` section)
2. **Verify the service role key** matches between Vercel and Supabase
3. **Check Supabase logs** to see what role is being used for the insert
4. **Consider creating a test endpoint** (as suggested by mobile team) to isolate the issue

## Technical Notes

### Why Function-Level Client Creation?

In Next.js serverless functions:
- Module-level code is cached and reused
- Environment variables might not be available at module load time
- Creating clients fresh ensures correct environment variable access
- This is a common pattern for serverless functions

### Service Role Key Format

The service role key should:
- Start with `eyJ...` (JWT format)
- Be approximately 200+ characters long
- Be kept secret (never expose in client-side code)
- Only be used in server-side API routes

---

**Status:** Code updated and ready for testing. The debug logging will help identify the exact issue if it persists.

