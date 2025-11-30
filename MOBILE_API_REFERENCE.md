# Mobile Team - Block & Report API Reference

**Date:** November 2025  
**Version:** 1.0  
**Base URL:** `https://www.soundbridge.live`

---

## Table of Contents

1. [Report Content API](#1-report-content-api)
2. [Block User API](#2-block-user-api)
3. [Authentication](#3-authentication)
4. [Error Handling](#4-error-handling)
5. [Working Examples](#5-working-examples)
6. [Test Cases](#6-test-cases)

---

## 1. Report Content API

### Endpoint
```
POST /api/reports/content
```

### Field Names
**✅ Use camelCase (NOT snake_case):**
- `contentType` (NOT `content_type`)
- `contentId` (NOT `content_id`)
- `reportType` (NOT `report_type`)
- `contentTitle` (optional)
- `contentUrl` (optional)
- `reason` (REQUIRED - minimum 10 characters)
- `description` (optional)
- `evidenceUrls` (optional array)
- `additionalInfo` (optional)
- `reporterName` (optional)
- `reporterEmail` (optional)
- `copyrightedWorkTitle` (optional)
- `copyrightedWorkOwner` (optional)
- `copyrightEvidence` (optional)

### Content Type Values
**✅ Accepted values (case-sensitive):**
- `"post"`
- `"comment"`
- `"track"`
- `"profile"`
- `"playlist"`

### Report Type Values
**✅ Accepted values (case-sensitive):**
- `"copyright_infringement"`
- `"spam"`
- `"inappropriate_content"`
- `"harassment"`
- `"fake_content"`
- `"unauthorized_use"`
- `"other"`

**⚠️ Note:** The mobile team was using `"inappropriate"` but the API expects `"inappropriate_content"`. Similarly, `"fake"` should be `"fake_content"`.

### Required vs Optional Fields

| Field | Required | Notes |
|-------|----------|-------|
| `contentType` | ✅ Yes | Must be one of the accepted values |
| `contentId` | ✅ Yes | Must be a valid UUID |
| `reportType` | ✅ Yes | Must be one of the accepted values |
| `reason` | ✅ Yes | Minimum 10 characters |
| `description` | ❌ No | Can be omitted entirely or sent as `null` |
| All other fields | ❌ No | Can be omitted entirely |

### Request Example

```json
{
  "contentType": "post",
  "contentId": "123e4567-e89b-12d3-a456-426614174000",
  "reportType": "spam",
  "reason": "This post contains spam content",
  "description": "Additional details about the spam"
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Report submitted successfully",
  "reportId": "report-uuid",
  "status": "pending",
  "estimatedReviewTime": "72 hours",
  "referenceNumber": "RPT-12345678"
}
```

### Error Response Format

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Invalid request data",
  "details": [
    {
      "path": ["reason"],
      "message": "Reason must be at least 10 characters"
    }
  ]
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Content not found"
}
```

**500 Server Error:**
```json
{
  "success": false,
  "error": "Failed to create content report",
  "details": "Database constraint violation"
}
```

---

## 2. Block User API

### 2.1 Block a User

**Endpoint:** `POST /api/users/block`

**Field Names:**
- ✅ `blockedUserId` (camelCase, NOT `blocked_user_id`)
- ✅ `reason` (optional)

**Request Body:**
```json
{
  "blockedUserId": "123e4567-e89b-12d3-a456-426614174000",
  "reason": "Inappropriate behavior"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "You have blocked John Doe",
  "data": {
    "id": "block-uuid",
    "blocker_id": "current-user-uuid",
    "blocked_id": "blocked-user-uuid",
    "reason": "Inappropriate behavior",
    "created_at": "2025-11-27T15:00:00Z"
  }
}
```

**Error Responses:**

| Status | Error Message | Description |
|--------|---------------|-------------|
| 400 | `"You cannot block yourself"` | User tried to block themselves |
| 400 | `"Invalid request data"` | Missing or invalid `blockedUserId` (must be UUID) |
| 401 | `"Authentication required"` | Missing or invalid auth token |
| 404 | `"User not found"` | `blockedUserId` doesn't exist |
| 409 | `"User is already blocked"` | User is already in blocked list |
| 500 | `"Failed to block user"` | Server error |

---

### 2.2 Unblock a User

**Endpoint:** `DELETE /api/users/block?userId=<userId>`

**Query Parameter:**
- ✅ `userId` (camelCase, NOT `user_id`)

**Example:**
```
DELETE /api/users/block?userId=123e4567-e89b-12d3-a456-426614174000
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "You have unblocked John Doe"
}
```

**Error Responses:**

| Status | Error Message | Description |
|--------|---------------|-------------|
| 400 | `"User ID is required"` | Missing `userId` query parameter |
| 401 | `"Authentication required"` | Missing or invalid auth token |
| 404 | `"User is not blocked"` | User is not in blocked list |
| 500 | `"Failed to unblock user"` | Server error |

---

### 2.3 Check Block Status

**Endpoint:** `GET /api/users/block?checkUserId=<userId>`

**Query Parameter:**
- ✅ `checkUserId` (camelCase, NOT `check_user_id`)

**Example:**
```
GET /api/users/block?checkUserId=123e4567-e89b-12d3-a456-426614174000
```

**Success Response (200):**
```json
{
  "success": true,
  "isBlocked": true,
  "isBlockedBy": false,
  "isBlocking": true,
  "block": {
    "id": "block-uuid",
    "reason": "Inappropriate behavior",
    "created_at": "2025-11-27T15:00:00Z"
  }
}
```

**Response Fields:**
- `isBlocked`: `true` if there's any block relationship (either direction)
- `isBlockedBy`: `true` if the checked user has blocked the current user
- `isBlocking`: `true` if the current user has blocked the checked user
- `block`: Block record if exists, `null` otherwise

---

### 2.4 List Blocked Users

**Endpoint:** `GET /api/users/block?list=<type>`

**Query Parameter:**
- ✅ `list` - Accepted values: `"blocked"` (default) or `"blockers"`

**Examples:**
```
GET /api/users/block?list=blocked    # Users I've blocked
GET /api/users/block?list=blockers   # Users who blocked me
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "block-uuid",
      "reason": "Inappropriate behavior",
      "created_at": "2025-11-27T15:00:00Z",
      "blocked": {
        "id": "user-uuid",
        "display_name": "John Doe",
        "username": "johndoe",
        "avatar_url": "https://..."
      }
    }
  ]
}
```

---

## 3. Authentication

### Method
**✅ Use Bearer Token in Authorization header:**

```
Authorization: Bearer <token>
```

**Token Source:**
- Get from Supabase session: `session.access_token`
- Token must be valid and not expired

### Headers Required

```http
Authorization: Bearer <token>
Content-Type: application/json
```

### Cookie Authentication
The API also supports cookie-based authentication, but for mobile apps, **Bearer token is recommended**.

---

## 4. Error Handling

### Error Response Structure

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message here",
  "details": [...]  // Optional, only for validation errors
}
```

### Common Error Codes

| Status Code | Common Errors | How to Handle |
|-------------|---------------|---------------|
| 400 | `"Invalid request data"` | Check `details` array for validation errors |
| 400 | `"You cannot block yourself"` | Show user-friendly message |
| 401 | `"Authentication required"` | Re-authenticate user |
| 404 | `"Content not found"` | Content may have been deleted |
| 404 | `"User not found"` | User may have been deleted |
| 409 | `"User is already blocked"` | Update UI to show "Unblock" option |
| 500 | `"Internal server error"` | Log error, show generic message to user |

### Extracting Error Messages

```typescript
try {
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    // Primary error message
    const errorMessage = data.error || 'An error occurred';
    
    // Validation details (if available)
    if (data.details && Array.isArray(data.details)) {
      const validationErrors = data.details.map((d: any) => d.message).join(', ');
      console.error('Validation errors:', validationErrors);
    }
    
    throw new Error(errorMessage);
  }
  
  return data;
} catch (error) {
  console.error('API Error:', error);
  throw error;
}
```

---

## 5. Working Examples

### 5.1 Report a Post (Minimal)

```typescript
POST /api/reports/content
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "contentType": "post",
  "contentId": "123e4567-e89b-12d3-a456-426614174000",
  "reportType": "spam",
  "reason": "This post contains spam content"
}
```

### 5.2 Report a Post (Full)

```typescript
POST /api/reports/content
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "contentType": "post",
  "contentId": "123e4567-e89b-12d3-a456-426614174000",
  "reportType": "inappropriate_content",
  "reason": "This post contains inappropriate content",
  "description": "The post contains explicit language and offensive material",
  "contentTitle": "Post Title",
  "contentUrl": "https://www.soundbridge.live/posts/123",
  "additionalInfo": "Reported by user after viewing"
}
```

### 5.3 Report Copyright Infringement

```typescript
POST /api/reports/content
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "contentType": "track",
  "contentId": "123e4567-e89b-12d3-a456-426614174000",
  "reportType": "copyright_infringement",
  "reason": "This track infringes on my copyrighted work",
  "copyrightedWorkTitle": "My Original Song",
  "copyrightedWorkOwner": "John Doe",
  "copyrightEvidence": "I am the original copyright holder"
}
```

### 5.4 Block a User

```typescript
POST /api/users/block
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "blockedUserId": "123e4567-e89b-12d3-a456-426614174000",
  "reason": "Inappropriate behavior"
}
```

### 5.5 Block a User (No Reason)

```typescript
POST /api/users/block
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "blockedUserId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### 5.6 Unblock a User

```typescript
DELETE /api/users/block?userId=123e4567-e89b-12d3-a456-426614174000
Headers:
  Authorization: Bearer <token>
```

### 5.7 Check Block Status

```typescript
GET /api/users/block?checkUserId=123e4567-e89b-12d3-a456-426614174000
Headers:
  Authorization: Bearer <token>
```

### 5.8 List Blocked Users

```typescript
GET /api/users/block?list=blocked
Headers:
  Authorization: Bearer <token>
```

---

## 6. Test Cases

### Report API Test Cases

| Test Case | Request | Expected Result |
|-----------|---------|------------------|
| ✅ Report post with all fields | Full request with all optional fields | 200 Success |
| ✅ Report post minimal | Only required fields | 200 Success |
| ✅ Report without description | Omit `description` field | 200 Success |
| ✅ Report with empty description | `"description": ""` | 200 Success (empty string allowed) |
| ❌ Invalid contentType | `"contentType": "invalid"` | 400 with validation error |
| ❌ Invalid reportType | `"reportType": "invalid"` | 400 with validation error |
| ❌ Missing reason | Omit `reason` field | 400 with validation error |
| ❌ Short reason | `"reason": "spam"` (less than 10 chars) | 400 with validation error |
| ❌ Invalid contentId | `"contentId": "not-uuid"` | 400 with validation error |
| ❌ Non-existent content | Valid UUID but content doesn't exist | 404 Not Found |

### Block API Test Cases

| Test Case | Request | Expected Result |
|-----------|---------|------------------|
| ✅ Block user with reason | `{ "blockedUserId": "...", "reason": "..." }` | 200 Success |
| ✅ Block user without reason | `{ "blockedUserId": "..." }` | 200 Success |
| ✅ Block user omit reason field | `{ "blockedUserId": "..." }` (no reason key) | 200 Success |
| ❌ Block yourself | `{ "blockedUserId": "<current-user-id>" }` | 400 "You cannot block yourself" |
| ❌ Block already blocked | Block same user twice | 409 "User is already blocked" |
| ❌ Invalid blockedUserId | `{ "blockedUserId": "not-uuid" }` | 400 Validation error |
| ❌ Non-existent user | Valid UUID but user doesn't exist | 404 "User not found" |
| ✅ Unblock user | `DELETE /api/users/block?userId=...` | 200 Success |
| ❌ Unblock not blocked | Unblock user not in list | 404 "User is not blocked" |
| ✅ Check block status | `GET /api/users/block?checkUserId=...` | 200 with status |
| ✅ List blocked users | `GET /api/users/block?list=blocked` | 200 with array |
| ✅ List blockers | `GET /api/users/block?list=blockers` | 200 with array |

---

## 7. Common Issues & Solutions

### Issue 1: 400 Bad Request - Field Name Mismatch

**Problem:** Using snake_case instead of camelCase

**❌ Wrong:**
```json
{
  "content_type": "post",
  "content_id": "...",
  "report_type": "spam"
}
```

**✅ Correct:**
```json
{
  "contentType": "post",
  "contentId": "...",
  "reportType": "spam"
}
```

### Issue 2: 400 Bad Request - Invalid reportType Value

**Problem:** Using shortened values instead of full enum values

**❌ Wrong:**
```json
{
  "reportType": "inappropriate"  // Missing "_content"
}
```

**✅ Correct:**
```json
{
  "reportType": "inappropriate_content"
}
```

### Issue 3: 400 Bad Request - Reason Too Short

**Problem:** Reason field less than 10 characters

**❌ Wrong:**
```json
{
  "reason": "spam"  // Only 4 characters
}
```

**✅ Correct:**
```json
{
  "reason": "This post contains spam content"  // 10+ characters
}
```

### Issue 4: 400 Bad Request - Missing Required Field

**Problem:** Not sending `reason` field

**❌ Wrong:**
```json
{
  "contentType": "post",
  "contentId": "...",
  "reportType": "spam"
  // Missing "reason"
}
```

**✅ Correct:**
```json
{
  "contentType": "post",
  "contentId": "...",
  "reportType": "spam",
  "reason": "This post contains spam content"
}
```

---

## 8. Rate Limiting & Performance

- **Rate Limiting:** Currently no rate limits implemented
- **Response Times:** Typically < 500ms for most requests
- **Idempotency:** 
  - **Reports:** Same report can be submitted multiple times (each creates a new report)
  - **Blocks:** Blocking the same user twice returns 409 (already blocked)

---

## 9. Summary Checklist

Before implementing, ensure:

- ✅ Use **camelCase** for all field names
- ✅ Use exact enum values for `contentType` and `reportType`
- ✅ Include `reason` field (minimum 10 characters) for reports
- ✅ Use `Authorization: Bearer <token>` header
- ✅ Handle error responses: `{ success: false, error: "...", details: [...] }`
- ✅ Use `userId` (not `user_id`) for DELETE query parameter
- ✅ Use `checkUserId` (not `check_user_id`) for GET query parameter
- ✅ Use `list=blocked` or `list=blockers` for listing

---

## 10. Support

If you encounter issues not covered in this document:

1. Check the error response `details` array for validation errors
2. Verify field names are camelCase
3. Verify enum values match exactly (case-sensitive)
4. Ensure `reason` field is at least 10 characters for reports
5. Check that authentication token is valid

**Contact:** Web App Team

---

**Last Updated:** November 2025

