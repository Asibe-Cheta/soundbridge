# SoundBridge API Endpoints Documentation

**Date:** December 16, 2025
**Total Endpoints:** 299 API routes
**Status:** ⚠️ Many should be migrated to direct Supabase queries

---

## 🎯 Migration Priority

### **HIGH PRIORITY - Migrate to Direct Queries**
These slow down the app and should use direct Supabase queries instead:

- ❌ `/api/posts/*` - Post operations (reading posts)
- ❌ `/api/users/*` - User profile data
- ❌ `/api/analytics/*` - Analytics data
- ❌ `/api/connections/*` - Connection requests/suggestions
- ❌ `/api/tracks/*` - Audio track listings

### **KEEP AS API ROUTES - Server-Side Required**
These need server-side processing and should remain as API routes:

- ✅ `/api/auth/*` - Authentication (needs server secrets)
- ✅ `/api/upload/*` - File uploads (needs server processing)
- ✅ `/api/admin/*` - Admin operations (needs server validation)
- ✅ `/api/webhooks/*` - External webhooks (needs server)
- ✅ `/api/payment/*` - Payment processing (needs server secrets)

---

## 📂 API Route Categories

### **1. Authentication & Authorization** (`/api/auth/*`)
**Count:** ~15 endpoints
**Keep as API routes:** ✅ YES (requires server secrets)

- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh auth token
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset confirmation
- `GET /api/auth/session` - Get current session
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/resend-verification` - Resend verification email

**Why keep:** Requires server-side secrets, session management, security

---

### **2. User Management** (`/api/users/*`)
**Count:** ~25 endpoints
**Migrate:** ⚠️ PARTIAL (read operations → direct queries)

#### **Keep as API Routes:**
- `PUT /api/users/[userId]` - Update user profile (needs validation)
- `DELETE /api/users/[userId]` - Delete user account (needs cleanup)
- `POST /api/users/[userId]/block` - Block user (needs server logic)
- `POST /api/users/[userId]/report` - Report user (needs server processing)

#### **Migrate to Direct Queries:**
- `GET /api/users/[userId]` - Get user profile → Use `dataService.getProfile()`
- `GET /api/users/[userId]/stats` - Get user stats → Use `dataService.getProfileWithStats()`
- `GET /api/users/[userId]/tracks` - Get user tracks → Direct Supabase query
- `GET /api/users/[userId]/followers` - Get followers → Direct Supabase query
- `GET /api/users/[userId]/following` - Get following → Direct Supabase query

**Migration example:**
```typescript
// BEFORE (SLOW - 2000ms+)
const response = await fetch(`/api/users/${userId}`)
const data = await response.json()

// AFTER (FAST - 500ms)
import { dataService } from '@/src/lib/data-service'
const { data } = await dataService.getProfile(userId)
```

---

### **3. Posts & Feed** (`/api/posts/*`)
**Count:** ~20 endpoints
**Migrate:** ⚠️ PARTIAL (read operations → direct queries)

#### **Keep as API Routes:**
- `POST /api/posts` - Create post (needs validation, media processing)
- `PUT /api/posts/[postId]` - Update post (needs validation)
- `DELETE /api/posts/[postId]` - Delete post (needs cleanup)
- `POST /api/posts/[postId]/report` - Report post (needs server processing)

#### **Migrate to Direct Queries:**
- `GET /api/posts` - Get feed posts → Use `dataService.getFeedPosts()`
- `GET /api/posts/[postId]` - Get single post → Direct Supabase query
- `GET /api/posts/user/[userId]` - Get user posts → Direct Supabase query
- `GET /api/posts/[postId]/likes` - Get post likes → Direct Supabase query
- `GET /api/posts/[postId]/comments` - Get comments → Direct Supabase query

**Already migrated:**
✅ Feed posts → `dataService.getFeedPosts()` in `apps/web/app/feed/page.tsx`

---

### **4. Audio Tracks** (`/api/tracks/*`)
**Count:** ~30 endpoints
**Migrate:** ⚠️ PARTIAL

#### **Keep as API Routes:**
- `POST /api/tracks/upload` - Upload track (needs file processing)
- `PUT /api/tracks/[trackId]` - Update track metadata (needs validation)
- `DELETE /api/tracks/[trackId]` - Delete track (needs file cleanup)
- `POST /api/tracks/[trackId]/process` - Process audio (needs server)

#### **Migrate to Direct Queries:**
- `GET /api/tracks` - List tracks → Direct Supabase query
- `GET /api/tracks/[trackId]` - Get track details → Direct Supabase query
- `GET /api/tracks/[trackId]/stats` - Get track stats → Direct Supabase query
- `POST /api/tracks/[trackId]/play` - Increment play count → Direct Supabase RPC
- `GET /api/tracks/search` - Search tracks → Direct Supabase query

---

### **5. Connections & Network** (`/api/connections/*`)
**Count:** ~15 endpoints
**Migrate:** ⚠️ PARTIAL

#### **Keep as API Routes:**
- `POST /api/connections/request` - Send connection request (needs validation)
- `POST /api/connections/[requestId]/accept` - Accept request (needs updates)
- `POST /api/connections/[requestId]/reject` - Reject request (needs updates)
- `DELETE /api/connections/[connectionId]` - Remove connection (needs cleanup)

#### **Migrate to Direct Queries:**
- `GET /api/connections/requests` → Use `dataService.getConnectionRequests()`
- `GET /api/connections/suggestions` → Use `dataService.getConnectionSuggestions()`
- `GET /api/connections` → Use `dataService.getConnections()`

**Already migrated:**
✅ Connection requests → `dataService.getConnectionRequests()`
✅ Connection suggestions → `dataService.getConnectionSuggestions()`
✅ Connections list → `dataService.getConnections()`

---

### **6. Analytics** (`/api/analytics/*`)
**Count:** ~10 endpoints
**Migrate:** ✅ ALL (to client-side calculation)

#### **Migrate All to Client-Side:**
- `GET /api/analytics/profile` → Use `dataService.getProfileWithStats()`
- `GET /api/analytics/tracks` → Calculate from track data
- `GET /api/analytics/engagement` → Calculate from interactions
- `GET /api/analytics/audience` → Query followers/following directly

**Migration approach:**
```typescript
// BEFORE (SLOW - 10+ seconds)
const analytics = await fetch('/api/analytics/profile')

// AFTER (FAST - 500ms)
const { data } = await dataService.getProfileWithStats(userId)
// Client-side calculation takes <10ms
const totalPlays = data.tracks.reduce((sum, t) => sum + t.play_count, 0)
```

**Already migrated:**
✅ Profile analytics → `dataService.getProfileWithStats()` in `apps/web/app/profile/page.tsx`

---

### **7. Admin Operations** (`/api/admin/*`)
**Count:** ~40 endpoints
**Keep:** ✅ ALL (requires server-side validation)

- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/users` - User management
- `POST /api/admin/users/[userId]/suspend` - Suspend user
- `GET /api/admin/content-moderation` - Moderation queue
- `POST /api/admin/content/[contentId]/approve` - Approve content
- `GET /api/admin/analytics` - Platform analytics
- `POST /api/admin/settings` - Update platform settings

**Why keep:** Requires admin role validation, server-side security

---

### **8. File Uploads** (`/api/upload/*`)
**Count:** ~10 endpoints
**Keep:** ✅ ALL (requires server processing)

- `POST /api/upload/avatar` - Upload profile picture
- `POST /api/upload/cover` - Upload cover image
- `POST /api/upload/track` - Upload audio file
- `POST /api/upload/video` - Upload video file
- `DELETE /api/upload/[fileId]` - Delete uploaded file

**Why keep:** Requires file processing, storage management, virus scanning

---

### **9. Payments & Subscriptions** (`/api/payment/*`, `/api/subscriptions/*`)
**Count:** ~20 endpoints
**Keep:** ✅ ALL (requires server secrets)

- `POST /api/payment/create-intent` - Create payment intent
- `POST /api/payment/confirm` - Confirm payment
- `GET /api/subscriptions` - List subscriptions
- `POST /api/subscriptions/create` - Create subscription
- `POST /api/subscriptions/cancel` - Cancel subscription
- `POST /api/webhooks/stripe` - Stripe webhook

**Why keep:** Requires Stripe secret keys, webhook validation

---

### **10. Search & Discovery** (`/api/search/*`)
**Count:** ~8 endpoints
**Migrate:** ⚠️ SOME

#### **Migrate to Direct Queries:**
- `GET /api/search/users` - Search users → Direct Supabase full-text search
- `GET /api/search/tracks` - Search tracks → Direct Supabase full-text search
- `GET /api/search/posts` - Search posts → Direct Supabase full-text search

#### **Keep as API Routes:**
- `GET /api/search/advanced` - Advanced search (complex logic)
- `POST /api/search/index` - Update search index (server-side)

---

### **11. Notifications** (`/api/notifications/*`)
**Count:** ~12 endpoints
**Migrate:** ⚠️ PARTIAL

#### **Migrate to Direct Queries:**
- `GET /api/notifications` - List notifications → Direct Supabase query
- `GET /api/notifications/unread-count` - Count unread → Direct Supabase count

#### **Keep as API Routes:**
- `POST /api/notifications/send` - Send notification (needs server)
- `POST /api/notifications/[notificationId]/mark-read` - Mark as read (simple update, could be direct)

---

### **12. Messaging** (`/api/messages/*`)
**Count:** ~15 endpoints
**Keep:** ✅ MOST (real-time features)

- `GET /api/messages/conversations` - List conversations
- `GET /api/messages/[conversationId]` - Get messages
- `POST /api/messages/send` - Send message (needs validation)
- `POST /api/messages/[messageId]/read` - Mark as read

**Note:** Consider migrating to Supabase Realtime instead

---

### **13. Events** (`/api/events/*`)
**Count:** ~18 endpoints
**Migrate:** ⚠️ PARTIAL

#### **Migrate to Direct Queries:**
- `GET /api/events` - List events → Direct Supabase query
- `GET /api/events/[eventId]` - Get event details → Direct Supabase query
- `GET /api/events/[eventId]/attendees` - Get attendees → Direct Supabase query

#### **Keep as API Routes:**
- `POST /api/events` - Create event (needs validation)
- `POST /api/events/[eventId]/register` - Register for event (needs logic)
- `DELETE /api/events/[eventId]` - Delete event (needs cleanup)

---

### **14. Abuse & Moderation** (`/api/abuse/*`)
**Count:** ~12 endpoints
**Keep:** ✅ ALL (requires server-side processing)

- `POST /api/abuse/detect` - Detect abusive content
- `POST /api/abuse/report` - Report abuse
- `GET /api/abuse/admin/dashboard` - Moderation dashboard
- `POST /api/abuse/admin/actions` - Take moderation action

**Why keep:** Requires ML processing, admin validation

---

### **15. Copyright & DMCA** (`/api/copyright/*`)
**Count:** ~8 endpoints
**Keep:** ✅ ALL (legal requirements)

- `POST /api/copyright/claim` - File copyright claim
- `POST /api/copyright/counter-claim` - File counter-claim
- `GET /api/copyright/statistics` - Copyright statistics
- `POST /api/admin/copyright/review` - Review copyright claim

**Why keep:** Legal compliance, server-side validation

---

### **16. Webhooks** (`/api/webhooks/*`)
**Count:** ~10 endpoints
**Keep:** ✅ ALL (external integrations)

- `POST /api/webhooks/stripe` - Stripe payment webhook
- `POST /api/webhooks/revenuecat` - RevenueCat subscription webhook
- `POST /api/webhooks/sendgrid` - Email delivery webhook
- `POST /api/webhooks/twilio` - SMS webhook

**Why keep:** External services, signature validation

---

### **17. Playlists** (`/api/playlists/*`)
**Count:** ~12 endpoints
**Migrate:** ⚠️ PARTIAL

#### **Migrate to Direct Queries:**
- `GET /api/playlists` - List playlists → Direct Supabase query
- `GET /api/playlists/[playlistId]` - Get playlist → Direct Supabase query
- `GET /api/playlists/[playlistId]/tracks` - Get tracks → Direct Supabase query

#### **Keep as API Routes:**
- `POST /api/playlists` - Create playlist (needs validation)
- `POST /api/playlists/[playlistId]/tracks` - Add track (needs validation)
- `DELETE /api/playlists/[playlistId]` - Delete playlist (needs cleanup)

---

### **18. Opportunities** (`/api/opportunities/*`)
**Count:** ~8 endpoints
**Migrate:** ⚠️ PARTIAL

#### **Migrate to Direct Queries:**
- `GET /api/opportunities` → Use `dataService.getOpportunities()`
- `GET /api/opportunities/[opportunityId]` → Direct Supabase query

#### **Keep as API Routes:**
- `POST /api/opportunities` - Create opportunity (needs validation)
- `DELETE /api/opportunities/[opportunityId]` - Delete opportunity

**Already migrated:**
✅ Opportunities list → `dataService.getOpportunities()` in feed sidebar

---

## 📊 Migration Summary

| Category | Total | Keep as API | Migrate to Direct | Already Migrated |
|----------|-------|-------------|-------------------|------------------|
| Auth | 15 | 15 | 0 | - |
| Users | 25 | 5 | 20 | 5 ✅ |
| Posts | 20 | 4 | 16 | 1 ✅ |
| Tracks | 30 | 5 | 25 | 0 |
| Connections | 15 | 4 | 11 | 3 ✅ |
| Analytics | 10 | 0 | 10 | 1 ✅ |
| Admin | 40 | 40 | 0 | - |
| Uploads | 10 | 10 | 0 | - |
| Payments | 20 | 20 | 0 | - |
| Search | 8 | 2 | 6 | 0 |
| Notifications | 12 | 2 | 10 | 0 |
| Messages | 15 | 15 | 0 | - |
| Events | 18 | 3 | 15 | 0 |
| Abuse | 12 | 12 | 0 | - |
| Copyright | 8 | 8 | 0 | - |
| Webhooks | 10 | 10 | 0 | - |
| Playlists | 12 | 3 | 9 | 0 |
| Opportunities | 8 | 2 | 6 | 1 ✅ |
| **TOTAL** | **288** | **160** | **128** | **11** |

**Progress:** 11/128 migrations complete (8.6%)

---

## 🎯 Next Migration Priorities

### **Phase 1: Quick Wins (Already Done)** ✅
- ✅ Feed posts
- ✅ Connection requests
- ✅ Connection suggestions
- ✅ Opportunities
- ✅ Profile analytics

### **Phase 2: High Impact (Next)**
1. **User Posts** (`GET /api/posts/user/[userId]`)
   - Currently used in Profile Activity section
   - Causing loading spinner issue
   - Migration: Direct Supabase query

2. **Track Listings** (`GET /api/tracks`, `GET /api/tracks/[trackId]`)
   - Used throughout app
   - High traffic endpoints
   - Migration: Direct Supabase query

3. **Search** (`GET /api/search/*`)
   - User-facing feature
   - Can use Supabase full-text search
   - Migration: Direct Supabase query with `.textSearch()`

### **Phase 3: Medium Impact**
4. **Notifications** (read operations)
5. **Events** (read operations)
6. **Playlists** (read operations)

### **Phase 4: Low Priority**
7. **Messages** (consider Supabase Realtime instead)
8. Remaining read operations

---

## 🔧 Migration Pattern

### **For All READ Operations:**

```typescript
// ❌ OLD (Slow API Route)
const response = await fetch('/api/posts')
const data = await response.json()

// ✅ NEW (Direct Supabase Query)
import { createClient } from '@/src/lib/supabase/client'

const supabase = createClient()
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .order('created_at', { ascending: false })
```

### **For WRITE Operations:**

**Keep as API routes if:**
- Needs validation logic
- Needs to update multiple tables
- Needs file processing
- Needs server secrets
- Needs admin role verification

**Can migrate if:**
- Simple insert/update/delete
- Client has all required data
- RLS policies handle security
- No complex business logic

---

## 🚨 DO NOT Migrate

### **Never migrate these:**
- Authentication endpoints (need server secrets)
- Payment processing (need Stripe secret key)
- File uploads (need server processing)
- Admin operations (need server-side role verification)
- Webhooks (need signature validation)
- Copyright/DMCA (legal compliance)

---

## 📝 Documentation Standard

### **For Each API Endpoint Document:**

```markdown
### `GET /api/endpoint/path`

**Purpose:** Brief description

**Request:**
- Method: GET/POST/PUT/DELETE
- Headers: Authorization, Content-Type
- Body: { field: type }
- Query params: ?param=value

**Response:**
- Success (200): { data: any }
- Error (400): { error: string }

**Migration Status:**
- ⚠️ Should migrate to direct Supabase query
- ✅ Keep as API route (reason)
- ✅ Already migrated (link to code)

**Example:**
```typescript
// Code example
```
```

---

## ✅ Completed Migrations

### **1. Feed Posts**
- **File:** `apps/web/app/feed/page.tsx`
- **Old:** `GET /api/posts`
- **New:** `dataService.getFeedPosts()`
- **Performance:** 30s+ → 1-2s (96% faster)

### **2. Connection Requests**
- **File:** `apps/web/app/network/page.tsx`
- **Old:** `GET /api/connections/requests`
- **New:** `dataService.getConnectionRequests()`
- **Performance:** 10s+ → 0.5-2s (90% faster)

### **3. Connection Suggestions**
- **File:** `apps/web/app/network/page.tsx`
- **Old:** `GET /api/connections/suggestions`
- **New:** `dataService.getConnectionSuggestions()`
- **Performance:** 10s+ → 0.5-2s (90% faster)

### **4. Opportunities**
- **File:** `apps/web/src/components/feed/FeedRightSidebar.tsx`
- **Old:** `GET /api/opportunities`
- **New:** `dataService.getOpportunities()`
- **Performance:** 10s+ → 0.5-2s (90% faster)

### **5. Profile Analytics**
- **File:** `apps/web/app/profile/page.tsx`
- **Old:** `GET /api/analytics/profile`
- **New:** `dataService.getProfileWithStats()` (mobile approach)
- **Performance:** 10s+ → 0.5-1.5s (95% faster)

---

## 🎓 Lessons Learned

### **When to Use API Routes:**
1. Server-side secrets required
2. Complex business logic
3. Multiple table updates
4. File processing
5. External service integration
6. Admin role verification

### **When to Use Direct Queries:**
1. Simple data fetching (SELECT)
2. RLS policies handle security
3. Client has all required data
4. Performance is critical
5. Real-time updates needed

### **Performance Guidelines:**
- API Route overhead: ~500-1000ms
- Direct query: ~100-500ms
- Client-side calculation: <10ms
- For read operations: Direct queries usually win
- For writes with logic: API routes make sense

---

*Document created to track all API endpoints and migration status.*
*Last updated: December 16, 2025*
