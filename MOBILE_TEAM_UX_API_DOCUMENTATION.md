# Mobile Team - UX Improvements API Documentation

**Date:** November 7, 2025  
**From:** Web App Development Team  
**To:** Mobile Development Team  
**Version:** 1.0  
**Status:** ✅ Complete & Ready for Integration

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL & CORS](#base-url--cors)
4. [New API Endpoints](#new-api-endpoints)
   - [User Preferences](#1-user-preferences-api)
   - [Upload Quota](#2-upload-quota-api)
   - [Creator Earnings Summary](#3-creator-earnings-summary-api)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Testing](#testing)
8. [Code Examples](#code-examples)

---

## OVERVIEW

This document provides complete API documentation for the 3 new endpoints created to support mobile UX improvements:

1. **User Preferences API** - Manage event distance preferences
2. **Upload Quota API** - Check upload limits and remaining quota
3. **Creator Earnings Summary API** - Get consolidated earnings data

All endpoints support CORS for mobile app integration and require JWT authentication.

---

## AUTHENTICATION

All endpoints require authentication via JWT bearer token.

### Request Header Format

```typescript
headers: {
  'Authorization': `Bearer ${userToken}`,
  'Content-Type': 'application/json'
}
```

### Getting the Token

```typescript
// Using Supabase client
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

### Authentication Errors

| Status Code | Error Message | Description |
|------------|---------------|-------------|
| 401 | Authentication required | No token provided or invalid token |
| 403 | Unauthorized | Token valid but user lacks permission |

---

## BASE URL & CORS

### Base URL

```
Production: https://www.soundbridge.live/api
Staging: https://staging.soundbridge.live/api
Development: http://localhost:3000/api
```

### CORS Configuration

All endpoints support:
- **Origins:** `*` (all origins allowed)
- **Methods:** `GET, POST, PATCH, OPTIONS`
- **Headers:** `Content-Type, Authorization`

### Preflight Requests

All endpoints support OPTIONS requests for CORS preflight:

```typescript
OPTIONS /api/endpoint
Response: 200 OK with CORS headers
```

---

## NEW API ENDPOINTS

## 1. USER PREFERENCES API

Manage user preferences including event discovery distance.

### 1.1 Get User Preferences

**Endpoint:** `GET /api/users/{userId}/preferences`

**Description:** Retrieve user's preferences including event distance radius.

**Path Parameters:**
- `userId` (string, required) - User's UUID

**Authentication:** Required (JWT bearer token)

**Authorization:** User can only access their own preferences

**Request Example:**

```typescript
GET /api/users/123e4567-e89b-12d3-a456-426614174000/preferences
Headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'Content-Type': 'application/json'
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "preferences": {
    "preferred_event_distance": 25
  }
}
```

**Response Fields:**
- `success` (boolean) - Operation success status
- `preferences` (object) - User preferences
  - `preferred_event_distance` (integer) - Event discovery radius in miles (5-100)

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Authentication required | No valid JWT token |
| 403 | Unauthorized | Attempting to access another user's preferences |
| 500 | Failed to fetch preferences | Database error |

---

### 1.2 Update User Preferences

**Endpoint:** `PATCH /api/users/{userId}/preferences`

**Description:** Update user's preferences.

**Path Parameters:**
- `userId` (string, required) - User's UUID

**Authentication:** Required (JWT bearer token)

**Authorization:** User can only update their own preferences

**Request Body:**

```json
{
  "preferred_event_distance": 50
}
```

**Body Parameters:**
- `preferred_event_distance` (integer, optional) - Event discovery radius in miles
  - **Range:** 5-100 miles
  - **Default:** 25 miles

**Request Example:**

```typescript
PATCH /api/users/123e4567-e89b-12d3-a456-426614174000/preferences
Headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'Content-Type': 'application/json'
}
Body: {
  "preferred_event_distance": 50
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "preferences": {
    "preferred_event_distance": 50
  }
}
```

**Response Fields:**
- `success` (boolean) - Operation success status
- `message` (string) - Success message
- `preferences` (object) - Updated preferences
  - `preferred_event_distance` (integer) - New event discovery radius

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | preferred_event_distance must be a number | Invalid data type |
| 400 | preferred_event_distance must be between 5 and 100 miles | Out of range |
| 400 | No valid preferences provided to update | Empty request body |
| 401 | Authentication required | No valid JWT token |
| 403 | Unauthorized | Attempting to update another user's preferences |
| 500 | Failed to update preferences | Database error |

---

## 2. UPLOAD QUOTA API

Check user's upload quota, limits, and remaining uploads.

### 2.1 Get Upload Quota Status

**Endpoint:** `GET /api/upload/quota`

**Description:** Get user's current upload quota status including tier, limits, usage, and reset date.

**Authentication:** Required (JWT bearer token)

**Authorization:** User can only check their own quota

**Request Example:**

```typescript
GET /api/upload/quota
Headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'Content-Type': 'application/json'
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "quota": {
    "tier": "free",
    "upload_limit": 3,
    "uploads_this_month": 1,
    "remaining": 2,
    "reset_date": "2025-12-01T00:00:00.000Z",
    "is_unlimited": false,
    "can_upload": true
  }
}
```

**Response Fields:**
- `success` (boolean) - Operation success status
- `quota` (object) - Upload quota information
  - `tier` (string) - User's subscription tier ('free', 'pro', 'enterprise')
  - `upload_limit` (integer) - Maximum uploads per month for this tier
  - `uploads_this_month` (integer) - Number of uploads in current calendar month
  - `remaining` (integer) - Remaining uploads this month
  - `reset_date` (string) - ISO 8601 date when quota resets (first day of next month)
  - `is_unlimited` (boolean) - True for enterprise tier
  - `can_upload` (boolean) - Whether user can upload right now

**Tier Upload Limits:**
- **Free:** 3 tracks/month
- **Pro:** 10 tracks/month
- **Enterprise:** Unlimited (999999)

**Reset Logic:**
- Quota resets on the **1st day of each calendar month**
- Reset happens at 00:00:00 UTC
- Previous month's uploads don't carry over

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Authentication required | No valid JWT token |
| 500 | Failed to check upload quota | Database error |

---

## 3. CREATOR EARNINGS SUMMARY API

Get consolidated creator earnings including tips, streams, and followers.

### 3.1 Get Creator Earnings Summary

**Endpoint:** `GET /api/creator/earnings-summary`

**Description:** Get comprehensive earnings summary for a creator including tips, streams, followers, and engagement metrics.

**Authentication:** Required (JWT bearer token)

**Authorization:** User can only access their own earnings

**Query Parameters:**
- `month` (string, optional) - Month to query in YYYY-MM format (e.g., "2025-11")
  - **Default:** Current month if not provided
  - **Format:** YYYY-MM
  - **Example:** "2025-11" for November 2025

**Request Example (Current Month):**

```typescript
GET /api/creator/earnings-summary
Headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'Content-Type': 'application/json'
}
```

**Request Example (Specific Month):**

```typescript
GET /api/creator/earnings-summary?month=2025-10
Headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'Content-Type': 'application/json'
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "month": "2025-11",
  "period": {
    "start_date": "2025-11-01T00:00:00.000Z",
    "end_date": "2025-12-01T00:00:00.000Z"
  },
  "tips": {
    "amount": "150.50",
    "count": 15,
    "currency": "USD"
  },
  "streams": {
    "count": 1250,
    "top_tracks": [
      {
        "id": "uuid-1",
        "title": "Amazing Track",
        "plays": 500,
        "likes": 89
      },
      {
        "id": "uuid-2",
        "title": "Another Hit",
        "plays": 450,
        "likes": 76
      }
    ]
  },
  "followers": {
    "new_count": 45,
    "total_count": 320
  },
  "engagement": {
    "likes": 89,
    "comments": 34,
    "shares": 12
  }
}
```

**Response Fields:**
- `success` (boolean) - Operation success status
- `month` (string) - Month queried in YYYY-MM format
- `period` (object) - Date range for the query
  - `start_date` (string) - ISO 8601 start date
  - `end_date` (string) - ISO 8601 end date
- `tips` (object) - Tip earnings data
  - `amount` (string) - Total tip earnings after platform fees (decimal format)
  - `count` (integer) - Number of tips received
  - `currency` (string) - Currency code (USD)
- `streams` (object) - Streaming data
  - `count` (integer) - Total plays/streams in the period
  - `top_tracks` (array) - Top 5 tracks by play count
    - `id` (string) - Track UUID
    - `title` (string) - Track title
    - `plays` (integer) - Number of plays
    - `likes` (integer) - Number of likes
- `followers` (object) - Follower data
  - `new_count` (integer) - New followers gained in the period
  - `total_count` (integer) - Total followers (current)
- `engagement` (object) - Engagement metrics
  - `likes` (integer) - Total likes received in the period
  - `comments` (integer) - Total comments received in the period
  - `shares` (integer) - Total shares in the period

**Notes:**
- Tips amount is **after platform fees** (creator earnings only)
- Streams count includes all plays of tracks created in the period
- Follower total_count is current total, not period-specific
- All dates are in ISO 8601 format with UTC timezone

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid month format | Month parameter not in YYYY-MM format |
| 401 | Authentication required | No valid JWT token |
| 500 | Failed to fetch earnings summary | Database error |

---

## ERROR HANDLING

### Standard Error Response Format

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

### Common HTTP Status Codes

| Status Code | Meaning | When It Occurs |
|------------|---------|----------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid parameters or request body |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Server-side error |

### Error Handling Best Practices

```typescript
try {
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    // Handle HTTP errors
    console.error(`HTTP ${response.status}:`, data.error);
    
    switch (response.status) {
      case 401:
        // Redirect to login
        break;
      case 403:
        // Show permission denied message
        break;
      case 400:
        // Show validation error to user
        break;
      default:
        // Show generic error message
        break;
    }
    return;
  }
  
  // Handle success
  if (data.success) {
    // Process data
  }
} catch (error) {
  // Handle network errors
  console.error('Network error:', error);
}
```

---

## RATE LIMITING

### Current Limits

- **Rate Limit:** 100 requests per minute per user
- **Burst Limit:** 20 requests per second per user

### Rate Limit Headers

Response headers include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699372800
```

### Rate Limit Exceeded Response

```json
{
  "error": "Rate limit exceeded",
  "retry_after": 60
}
```

**Status Code:** 429 Too Many Requests

---

## TESTING

### Test Credentials

**Staging Environment:** https://staging.soundbridge.live

Contact the web team for test account credentials.

### Testing Checklist

- [ ] Test with valid authentication token
- [ ] Test with invalid/expired token (expect 401)
- [ ] Test with another user's ID (expect 403)
- [ ] Test with invalid parameters (expect 400)
- [ ] Test CORS preflight (OPTIONS request)
- [ ] Test rate limiting
- [ ] Test error handling
- [ ] Test with different subscription tiers

### Sample Test Data

**Free Tier User:**
- Upload limit: 3/month
- Can test quota exhaustion

**Pro Tier User:**
- Upload limit: 10/month
- Has tips and earnings data

**Enterprise Tier User:**
- Unlimited uploads
- Full feature access

---

## CODE EXAMPLES

### React Native / TypeScript

#### 1. Update Event Distance Preference

```typescript
import { supabase } from './supabaseClient';

async function updateEventDistance(userId: string, distance: number) {
  try {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }
    
    const response = await fetch(
      `https://www.soundbridge.live/api/users/${userId}/preferences`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          preferred_event_distance: distance
        })
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update preferences');
    }
    
    console.log('✅ Preferences updated:', data.preferences);
    return data.preferences;
    
  } catch (error) {
    console.error('❌ Error updating preferences:', error);
    throw error;
  }
}

// Usage
await updateEventDistance('user-uuid', 50);
```

#### 2. Check Upload Quota

```typescript
import { supabase } from './supabaseClient';

async function checkUploadQuota() {
  try {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }
    
    const response = await fetch(
      'https://www.soundbridge.live/api/upload/quota',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to check quota');
    }
    
    const { quota } = data;
    
    console.log(`📊 Upload Quota:
      Tier: ${quota.tier}
      Limit: ${quota.upload_limit}
      Used: ${quota.uploads_this_month}
      Remaining: ${quota.remaining}
      Can Upload: ${quota.can_upload}
      Resets: ${new Date(quota.reset_date).toLocaleDateString()}
    `);
    
    return quota;
    
  } catch (error) {
    console.error('❌ Error checking quota:', error);
    throw error;
  }
}

// Usage
const quota = await checkUploadQuota();

if (!quota.can_upload) {
  alert(`Upload limit reached! Resets on ${new Date(quota.reset_date).toLocaleDateString()}`);
}
```

#### 3. Get Creator Earnings Summary

```typescript
import { supabase } from './supabaseClient';

async function getEarningsSummary(month?: string) {
  try {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }
    
    const url = month 
      ? `https://www.soundbridge.live/api/creator/earnings-summary?month=${month}`
      : 'https://www.soundbridge.live/api/creator/earnings-summary';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch earnings');
    }
    
    const { tips, streams, followers, engagement } = data;
    
    console.log(`💰 Earnings Summary for ${data.month}:
      Tips: $${tips.amount} (${tips.count} tips)
      Streams: ${streams.count}
      New Followers: ${followers.new_count}
      Total Followers: ${followers.total_count}
      Engagement: ${engagement.likes} likes, ${engagement.comments} comments
    `);
    
    return data;
    
  } catch (error) {
    console.error('❌ Error fetching earnings:', error);
    throw error;
  }
}

// Usage
const currentMonth = await getEarningsSummary();
const october = await getEarningsSummary('2025-10');
```

#### 4. Complete UX Component Example

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { supabase } from './supabaseClient';

interface EarningsSummary {
  tips: { amount: string; count: number };
  streams: { count: number };
  followers: { new_count: number };
}

export function CreatorDashboard() {
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadEarnings();
  }, []);
  
  async function loadEarnings() {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(
        'https://www.soundbridge.live/api/creator/earnings-summary',
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error);
      }
      
      setEarnings(data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) {
    return <ActivityIndicator size="large" />;
  }
  
  if (error) {
    return <Text style={{ color: 'red' }}>Error: {error}</Text>;
  }
  
  if (!earnings) {
    return <Text>No earnings data available</Text>;
  }
  
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Your Earnings This Month
      </Text>
      
      <View style={{ marginBottom: 15 }}>
        <Text style={{ fontSize: 18, color: '#666' }}>Tips</Text>
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#DC2626' }}>
          ${earnings.tips.amount}
        </Text>
        <Text style={{ color: '#999' }}>
          {earnings.tips.count} tips received
        </Text>
      </View>
      
      <View style={{ marginBottom: 15 }}>
        <Text style={{ fontSize: 18, color: '#666' }}>Streams</Text>
        <Text style={{ fontSize: 32, fontWeight: 'bold' }}>
          {earnings.streams.count.toLocaleString()}
        </Text>
      </View>
      
      <View>
        <Text style={{ fontSize: 18, color: '#666' }}>New Followers</Text>
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#10B981' }}>
          +{earnings.followers.new_count}
        </Text>
      </View>
    </View>
  );
}
```

---

## SUPPORT

### Questions or Issues?

Contact the web app development team:
- **Email:** dev@soundbridge.live
- **Slack:** #web-mobile-integration
- **GitHub:** Open an issue in the soundbridge repo

### Documentation Updates

This documentation will be updated as features evolve. Check the version number at the top of this document.

**Current Version:** 1.0  
**Last Updated:** November 7, 2025

---

**Web App Development Team**

