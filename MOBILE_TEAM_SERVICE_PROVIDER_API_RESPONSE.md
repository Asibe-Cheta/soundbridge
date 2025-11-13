# Service Provider Dashboard API - Web Team Response

**To:** Mobile App Team  
**From:** Web Platform Team  
**Date:** December 12, 2024  
**Re:** Service Provider Dashboard API Authentication & Endpoint Verification

---

## Executive Summary

This document provides comprehensive answers to all your questions about the Service Provider API endpoints, authentication requirements, and response formats. The endpoints are correct, but there are some authentication nuances that need to be addressed.

---

## 1. Endpoint Verification ✅

### **All Endpoints Are Correct**

Yes, all the endpoints you're calling are correct:

1. ✅ **GET** `/api/service-providers/{userId}?include=offerings,portfolio,reviews,availability`
2. ✅ **GET** `/api/service-providers/{userId}/bookings`
3. ✅ **GET** `/api/service-providers/{userId}/badges`
4. ✅ **GET** `/api/service-providers/{userId}/verification/status`
5. ✅ **GET** `/api/service-providers/{userId}/reviews` (Note: Reviews are included in main endpoint via `include=reviews`)

### **Query Parameters**

**`include` Parameter:**
- ✅ **Supported:** Yes, the `include` parameter accepts multiple comma-separated values
- ✅ **Valid Values:** `offerings`, `portfolio`, `availability`, `reviews`
- ✅ **Format:** `?include=offerings,portfolio,reviews,availability`
- ✅ **Case Sensitive:** Yes, use lowercase

**Example:**
```
GET /api/service-providers/{userId}?include=offerings,portfolio,reviews,availability
```

---

## 2. Authentication Requirements 🔐

### **Bearer Token Authentication is Supported**

All service provider endpoints use `getSupabaseRouteClient()` which supports **Bearer token authentication** for mobile apps.

### **Supported Authorization Headers**

The API accepts tokens from these headers (checked in order):

1. `Authorization: Bearer {token}` ✅ **RECOMMENDED**
2. `authorization: Bearer {token}` (lowercase)
3. `X-Authorization: Bearer {token}`
4. `X-Auth-Token: {token}` (raw token, no "Bearer " prefix)
5. `X-Supabase-Token: {token}` (raw token, no "Bearer " prefix)

### **Recommended Header Format**

**Use this format (most reliable):**
```http
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Why:** The `Authorization` header with `Bearer ` prefix is the standard and most reliable.

### **Current Issue Identified**

Your mobile app is sending multiple headers:
```http
Authorization: Bearer {access_token}
X-Auth-Token: {access_token}
X-Authorization: Bearer {access_token}
X-Supabase-Token: {access_token}
```

**Problem:** While the API supports all these headers, there might be an issue with how the token is being extracted if the first header found doesn't match the expected format.

**Solution:** **Use ONLY the `Authorization: Bearer {token}` header** and remove the other headers. This is the most reliable approach.

---

## 3. Authentication Implementation Details

### **How Authentication Works**

The `getSupabaseRouteClient()` function:

1. Checks headers in order (see list above)
2. Extracts token from first matching header
3. If token starts with `Bearer `, strips the prefix
4. Creates Supabase client with token
5. Validates token by calling `supabase.auth.getUser(token)`

### **Token Validation**

The API validates tokens by calling:
```typescript
const { data, error } = await supabase.auth.getUser(token);
```

**If token is invalid:**
- Returns `{ error: 'Authentication required' }` with status `401`
- `user` will be `null`

**If token is valid:**
- Returns user object
- Proceeds with request

### **Authentication Requirements by Endpoint**

| Endpoint | Requires Auth | Notes |
|----------|---------------|-------|
| `GET /api/service-providers/{userId}` | **Optional** | Returns 404 if profile doesn't exist. If authenticated and owner, shows all data. If not authenticated, only shows `active` profiles. |
| `GET /api/service-providers/{userId}/bookings` | **Required** | Must be authenticated and must be the owner (`userId` must match authenticated user) |
| `GET /api/service-providers/{userId}/badges` | **Required** | Must be authenticated and must be the owner |
| `GET /api/service-providers/{userId}/verification/status` | **Optional** | Returns 403 if not owner/admin |
| `GET /api/service-providers/{userId}/reviews` | **N/A** | Reviews are included via `include=reviews` parameter on main endpoint |

---

## 4. Error Handling & Response Formats

### **Error Response Format**

All errors follow this format:
```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

### **Common Error Scenarios**

#### **401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```
**Causes:**
- Missing or invalid token
- Token expired
- Token format incorrect

**Fix:** Ensure token is valid and sent as `Authorization: Bearer {token}`

#### **403 Forbidden**
```json
{
  "error": "You can only view your own bookings"
}
```
**Causes:**
- Authenticated user doesn't match `userId` in URL
- Trying to access another user's private data

**Fix:** Ensure `userId` in URL matches authenticated user's ID

#### **404 Not Found**
```json
{
  "error": "Service provider profile not found"
}
```
**Causes:**
- User doesn't have a service provider profile yet
- Profile was deleted

**Fix:** User needs to create a service provider profile first (via `/become-service-provider`)

### **What Happens If User Doesn't Have a Profile?**

**Behavior:**
- **Main endpoint** (`GET /api/service-providers/{userId}`): Returns `404` with error message
- **Other endpoints**: May return `404` or `403` depending on the endpoint

**Mobile App Should:**
1. Check if profile exists (call main endpoint)
2. If `404`, redirect user to "Become a Service Provider" flow
3. Don't show loading state indefinitely - handle `404` gracefully

---

## 5. Response Schemas 📋

### **1. GET /api/service-providers/{userId}**

**Response Structure:**
```typescript
{
  provider: ServiceProviderProfile,
  offerings?: ServiceOffering[],      // If include=offerings
  portfolio?: PortfolioItem[],        // If include=portfolio
  availability?: AvailabilitySlot[],   // If include=availability
  reviews?: ServiceReview[]            // If include=reviews
}
```

**ServiceProviderProfile:**
```typescript
{
  user_id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  categories: string[];
  default_rate: number | null;
  rate_currency: string | null;
  status: 'draft' | 'pending_review' | 'active' | 'suspended';
  is_verified: boolean;
  verification_status: 'not_requested' | 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}
```

**ServiceOffering:**
```typescript
{
  id: string;
  provider_id: string;
  title: string;
  category: string;
  description: string | null;
  rate_amount: number;
  rate_currency: string;
  rate_unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**PortfolioItem:**
```typescript
{
  id: string;
  provider_id: string;
  media_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  display_order: number | null;
  created_at: string;
}
```

**AvailabilitySlot:**
```typescript
{
  id: string;
  provider_id: string;
  start_time: string;  // ISO 8601
  end_time: string;    // ISO 8601
  is_bookable: boolean;
  recurrence_rule: string | null;
  created_at: string;
}
```

**ServiceReview:**
```typescript
{
  id: string;
  provider_id: string;
  reviewer_id: string;
  booking_id: string | null;
  rating: number;  // 1-5
  comment: string | null;
  status: 'pending' | 'published' | 'hidden';
  created_at: string;
  reviewer: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  }
}
```

---

### **2. GET /api/service-providers/{userId}/bookings**

**Response:**
```typescript
{
  bookings: ServiceBooking[]
}
```

**ServiceBooking:**
```typescript
{
  id: string;
  provider_id: string;
  booker_id: string;
  service_offering_id: string | null;
  venue_id: string | null;
  status: 'pending' | 'confirmed_awaiting_payment' | 'paid' | 'completed' | 'cancelled' | 'disputed';
  scheduled_start: string;  // ISO 8601
  scheduled_end: string;   // ISO 8601
  timezone: string;
  total_amount: number;
  currency: string;
  platform_fee: number;
  provider_payout: number;
  booking_notes: string | null;
  confirmed_at: string | null;
  paid_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  booker: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  },
  offering: {
    id: string;
    title: string;
    category: string;
    rate_amount: number;
    rate_currency: string;
    rate_unit: string;
  } | null,
  venue: {
    id: string;
    name: string;
    address: Record<string, unknown> | null;
  } | null
}
```

---

### **3. GET /api/service-providers/{userId}/badges**

**Response:**
```typescript
{
  insights: {
    badgeTier: 'new' | 'rising' | 'top_rated';
    badges: Array<{
      tier: string;
      label: string;
      description: string;
      isCurrent: boolean;
      unlockedAt: string | null;
      createdAt: string;
    }>;
    nextBadge: {
      tier: string;
      label: string;
      description: string;
      requirements: Array<{
        id: string;
        label: string;
        current: number;
        target: number;
        met: boolean;
      }>;
    } | null;
    completedBookings: number;
    averageRating: number;
    reviewCount: number;
    idVerified: boolean;
    firstBookingDiscountEligible: boolean;
    firstBookingDiscountPercent: number | null;
  }
}
```

---

### **4. GET /api/service-providers/{userId}/verification/status**

**Response:**
```typescript
{
  status: {
    verificationStatus: 'not_requested' | 'pending' | 'approved' | 'rejected';
    prerequisites: {
      [key: string]: {
        met: boolean;
        required: boolean;
        value: any;
      }
    };
  }
}
```

**Prerequisites Keys:**
- `completeProfile`
- `activeOffering`
- `portfolioItems`
- `completedBookings`
- `averageRating`
- `connectAccount`

---

## 6. Base URL 🌐

### **Correct Base URL**

**Use:** `https://www.soundbridge.live` ✅

**NOT:** `https://soundbridge.live` (without www)  
**NOT:** `https://app.soundbridge.fm`

**Why:** The API routes are hosted on the main Next.js app at `www.soundbridge.live`.

**Full Endpoint Examples:**
```
https://www.soundbridge.live/api/service-providers/{userId}
https://www.soundbridge.live/api/service-providers/{userId}/bookings
https://www.soundbridge.live/api/service-providers/{userId}/badges
https://www.soundbridge.live/api/service-providers/{userId}/verification/status
```

---

## 7. Recommended Mobile Implementation 🔧

### **Step 1: Fix Authentication Headers**

**Before (Current):**
```typescript
headers: {
  'Authorization': `Bearer ${access_token}`,
  'X-Auth-Token': access_token,
  'X-Authorization': `Bearer ${access_token}`,
  'X-Supabase-Token': access_token,
  'Content-Type': 'application/json'
}
```

**After (Recommended):**
```typescript
headers: {
  'Authorization': `Bearer ${access_token}`,
  'Content-Type': 'application/json'
}
```

**Why:** Using only the standard `Authorization` header is more reliable and follows best practices.

---

### **Step 2: Handle 404 Gracefully**

**Check if profile exists first:**
```typescript
// 1. Check if service provider profile exists
const profileResponse = await fetch(
  `https://www.soundbridge.live/api/service-providers/${userId}`,
  {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    }
  }
);

if (profileResponse.status === 404) {
  // Redirect to "Become a Service Provider" screen
  navigation.navigate('BecomeServiceProvider');
  return;
}

if (!profileResponse.ok) {
  // Handle other errors
  const error = await profileResponse.json();
  throw new Error(error.error || 'Failed to load profile');
}

const data = await profileResponse.json();
```

---

### **Step 3: Load Dashboard Data**

**Option A: Single Request (Recommended)**
```typescript
// Load everything in one request
const response = await fetch(
  `https://www.soundbridge.live/api/service-providers/${userId}?include=offerings,portfolio,reviews,availability`,
  {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    }
  }
);

const data = await response.json();
// data.provider
// data.offerings
// data.portfolio
// data.reviews
// data.availability
```

**Option B: Multiple Requests (If needed)**
```typescript
// Load separately if needed
const [profile, bookings, badges, verification] = await Promise.all([
  fetch(`https://www.soundbridge.live/api/service-providers/${userId}?include=offerings,portfolio,reviews,availability`, { headers }),
  fetch(`https://www.soundbridge.live/api/service-providers/${userId}/bookings`, { headers }),
  fetch(`https://www.soundbridge.live/api/service-providers/${userId}/badges`, { headers }),
  fetch(`https://www.soundbridge.live/api/service-providers/${userId}/verification/status`, { headers })
]);
```

---

### **Step 4: Error Handling**

```typescript
try {
  const response = await fetch(url, { headers });
  
  if (response.status === 401) {
    // Token expired or invalid
    // Refresh token or redirect to login
    await refreshAuthToken();
    // Retry request
  } else if (response.status === 403) {
    // User doesn't have permission
    // Show error message
  } else if (response.status === 404) {
    // Profile doesn't exist
    // Redirect to create profile
  } else if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  
  const data = await response.json();
  return data;
} catch (error) {
  console.error('API Error:', error);
  // Handle error in UI
}
```

---

## 8. Debugging Tips 🐛

### **Check Token Validity**

If you're getting 401 errors, verify:

1. **Token is not expired:**
   ```typescript
   // Check token expiration
   const tokenData = jwt.decode(access_token);
   const isExpired = tokenData.exp * 1000 < Date.now();
   ```

2. **Token format is correct:**
   - Should be a JWT string
   - Should start with `eyJ` (base64 encoded JSON)
   - Length should be ~800-900 characters for Supabase tokens

3. **Token is sent correctly:**
   ```typescript
   // Log headers to verify
   console.log('Request headers:', {
     'Authorization': `Bearer ${access_token.substring(0, 20)}...`
   });
   ```

### **Enable Debug Logging**

The API logs authentication debug info in development mode. Check server logs for:
```
🔍 Bearer auth debug: {
  hasToken: true,
  tokenLength: 878,
  error: null,
  mode: 'bearer'
}
```

---

## 9. Testing Checklist ✅

Before deploying, test:

- [ ] Profile exists: Returns 200 with profile data
- [ ] Profile doesn't exist: Returns 404, app handles gracefully
- [ ] Valid token: All endpoints return 200
- [ ] Invalid token: Returns 401
- [ ] Expired token: Returns 401
- [ ] Wrong userId: Returns 403 (for protected endpoints)
- [ ] Include parameter: Returns all requested data
- [ ] Network error: App handles gracefully
- [ ] Loading state: Shows while loading, hides on success/error

---

## 10. Summary & Action Items

### **Key Points:**

1. ✅ **Endpoints are correct** - All paths and parameters are valid
2. ✅ **Bearer token auth is supported** - Use `Authorization: Bearer {token}`
3. ⚠️ **Simplify headers** - Use only `Authorization` header, remove others
4. ✅ **Handle 404** - Profile might not exist, redirect to creation flow
5. ✅ **Base URL** - Use `https://www.soundbridge.live`

### **Immediate Actions:**

1. **Update headers** - Remove extra auth headers, use only `Authorization: Bearer {token}`
2. **Add 404 handling** - Check if profile exists before loading dashboard
3. **Test authentication** - Verify token is valid and not expired
4. **Add error boundaries** - Handle all error cases gracefully

---

## 11. Additional Resources

- **Service Provider Workflow:** See `SERVICE_PROVIDER_WORKFLOW_EXPLANATION.md`
- **UI Implementation Guide:** See `WEB_TEAM_SERVICE_PROVIDER_UI_RESPONSE.md`
- **Auth Fix Documentation:** See `WEB_TEAM_SERVICE_PROVIDER_AUTH_FIX.md`

---

**Status:** ✅ Complete Response Provided  
**Last Updated:** December 12, 2024  
**Next Steps:** Mobile team to implement fixes and test

---

**Questions?** If you encounter any issues after implementing these fixes, please provide:
1. Exact error message and status code
2. Request headers (with token masked)
3. Response body
4. Token expiration status

