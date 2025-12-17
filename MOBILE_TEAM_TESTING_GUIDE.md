# Mobile Team - Testing Guide & FAQ

**Answers to Mobile Team Questions + Testing Utilities**

This document answers all outstanding questions and provides testing utilities for the mobile team.

---

## ✅ Answers to Your Questions

### 1. Appeal Endpoint Status

**Question:** Is `POST /api/tracks/{trackId}/appeal` implemented?

**Answer:** ✅ **YES - Just implemented!**

**Endpoint Details:**

```typescript
POST /api/tracks/{trackId}/appeal

// Request Body
{
  "appealText": string  // 20-500 characters
}

// Success Response (200)
{
  "success": true,
  "message": "Appeal submitted successfully. We will review it within 24-48 hours."
}

// Error Responses
{
  "error": "Appeal must be at least 20 characters"  // 400
  "error": "Only rejected tracks can be appealed"   // 400
  "error": "This track has already been appealed"   // 400
  "error": "You can only appeal your own tracks"    // 403
  "error": "Track not found"                        // 404
}
```

**Validation Rules:**
- Minimum length: 20 characters
- Maximum length: 500 characters
- Only rejected tracks can be appealed
- User must own the track
- Can only appeal once per track

**What Happens:**
1. Track status updated: `rejected` → `appealed`
2. Appeal text and status saved to database
3. In-app notification sent to admins
4. Confirmation notification sent to user
5. Admin will review within 24-48 hours

---

### 2. Track Visibility Rules

**Question:** Should tracks with `moderation_status = 'flagged'` be visible in public feeds?

**Answer:** ✅ **Confirmed - Here are the exact rules:**

| Status | Public Feed | User's Profile | Searchable | Notes |
|--------|-------------|----------------|------------|-------|
| `pending_check` | ✅ Visible | ✅ Visible | ✅ Yes | Just uploaded, checking soon |
| `checking` | ✅ Visible | ✅ Visible | ✅ Yes | Actively being checked |
| `clean` | ✅ Visible | ✅ Visible | ✅ Yes | Passed all checks |
| `flagged` | ❌ Hidden | ✅ Visible | ❌ No | Waiting for admin review |
| `approved` | ✅ Visible | ✅ Visible | ✅ Yes | Admin approved |
| `rejected` | ❌ Hidden | ✅ Visible | ❌ No | Admin rejected |
| `appealed` | ❌ Hidden | ✅ Visible | ❌ No | User submitted appeal |

**Query Examples:**

```typescript
// Public Feed - Only show approved content
const { data: publicTracks } = await supabase
  .from('audio_tracks')
  .select('*')
  .eq('is_public', true)
  .in('moderation_status', ['pending_check', 'checking', 'clean', 'approved'])
  .order('created_at', { ascending: false });

// User's Own Tracks - Show all with status
const { data: myTracks } = await supabase
  .from('audio_tracks')
  .select('*')
  .eq('creator_id', userId)
  .order('created_at', { ascending: false });
// Don't filter by status - show everything

// Search - Only show approved content
const { data: searchResults } = await supabase
  .from('audio_tracks')
  .select('*')
  .eq('is_public', true)
  .in('moderation_status', ['pending_check', 'checking', 'clean', 'approved'])
  .textSearch('title', searchQuery);
```

**Why `flagged` is hidden:**
- Contains potentially harmful content
- Under admin review
- Will be either approved or rejected soon
- User is notified and can see it in their profile

**Why `pending_check` and `checking` are visible:**
- Content hasn't been checked yet
- Assume innocent until proven guilty
- Checking happens within 5 minutes
- Maintains instant upload UX

---

### 3. Testing Support

**Answer:** ✅ **Here are complete testing utilities:**

#### A. Test Track with Flagged Content

**Create Test Track (Use this in Supabase SQL Editor):**

```sql
-- Insert a test track that will be flagged
INSERT INTO audio_tracks (
  id,
  creator_id,
  title,
  artist_name,
  file_url,
  moderation_status,
  moderation_flagged,
  flag_reasons,
  moderation_confidence,
  transcription,
  moderation_checked_at,
  is_public,
  created_at
) VALUES (
  gen_random_uuid(),
  'YOUR_USER_ID_HERE',  -- Replace with actual user ID
  'Test Flagged Track',
  'Test Artist',
  'https://example.com/test-audio.mp3',
  'flagged',
  true,
  ARRAY['Harassment detected', 'Spam pattern detected'],
  0.92,
  'This is a test transcription with potentially harmful content for testing purposes.',
  NOW(),
  true,
  NOW()
);
```

**After inserting, you can:**
- View it in your profile (should be visible)
- Verify it's hidden from public feed
- See the flag reasons in the UI
- Test the appeal workflow

#### B. Sample Push Notification

**Notification Payload Formats:**

**1. Track Approved:**
```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "✅ Track Approved!",
  "body": "\"Test Track Title\" is now live",
  "data": {
    "trackId": "track-uuid-here",
    "type": "moderation",
    "action": "approved"
  },
  "priority": "high",
  "channelId": "moderation"
}
```

**2. Track Rejected:**
```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "❌ Track Not Approved",
  "body": "\"Test Track Title\" was not approved. Tap to appeal.",
  "data": {
    "trackId": "track-uuid-here",
    "type": "moderation",
    "action": "rejected"
  },
  "priority": "high",
  "channelId": "moderation"
}
```

**3. Track Flagged:**
```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "⚠️ Track Under Review",
  "body": "\"Test Track Title\" is being reviewed by our team",
  "data": {
    "trackId": "track-uuid-here",
    "type": "moderation",
    "action": "flagged"
  },
  "priority": "high",
  "channelId": "moderation"
}
```

**4. Appeal Received:**
```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "📬 Appeal Received",
  "body": "We're reviewing your appeal for \"Test Track Title\"",
  "data": {
    "trackId": "track-uuid-here",
    "type": "moderation",
    "action": "appeal_received"
  },
  "priority": "default",
  "channelId": "moderation"
}
```

**5. Appeal Approved:**
```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "🎉 Appeal Approved!",
  "body": "\"Test Track Title\" has been reinstated",
  "data": {
    "trackId": "track-uuid-here",
    "type": "moderation",
    "action": "appeal_approved"
  },
  "priority": "high",
  "channelId": "moderation"
}
```

**6. Appeal Rejected:**
```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "Appeal Decision",
  "body": "Decision made on your appeal for \"Test Track Title\"",
  "data": {
    "trackId": "track-uuid-here",
    "type": "moderation",
    "action": "appeal_rejected"
  },
  "priority": "default",
  "channelId": "moderation"
}
```

#### C. Test Push Notification Script

**Send Test Notification (Node.js):**

```javascript
// test-push-notification.js
const EXPO_PUSH_TOKEN = 'ExponentPushToken[your-token-here]';
const TRACK_ID = 'test-track-uuid';

async function sendTestNotification() {
  const message = {
    to: EXPO_PUSH_TOKEN,
    sound: 'default',
    title: '✅ Track Approved!',
    body: '"Test Track" is now live',
    data: {
      trackId: TRACK_ID,
      type: 'moderation',
      action: 'approved'
    },
    priority: 'high',
    channelId: 'moderation'
  };

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message)
  });

  const result = await response.json();
  console.log('Notification sent:', result);
}

sendTestNotification();
```

**Or use cURL:**

```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[your-token-here]",
    "sound": "default",
    "title": "✅ Track Approved!",
    "body": "\"Test Track\" is now live",
    "data": {
      "trackId": "test-track-uuid",
      "type": "moderation",
      "action": "approved"
    },
    "priority": "high"
  }'
```

---

### 4. Backwards Compatibility

**Question:** What about existing tracks (uploaded before moderation system)?

**Answer:** ✅ **Handled with database migration:**

**Migration Applied:**

```sql
-- Set default values for existing tracks
UPDATE audio_tracks
SET
  moderation_status = 'clean',
  moderation_checked_at = created_at,
  moderation_flagged = false
WHERE moderation_status IS NULL;
```

**Result:**
- All existing tracks have `moderation_status = 'clean'`
- They appear in public feeds normally
- No null values to handle

**Mobile App:**
- ✅ Can safely assume `moderation_status` is never null
- ✅ No special handling needed for old tracks
- ✅ All tracks have a valid status

---

### 5. Notification Payload Format

**Question:** Can you confirm the exact push notification payload?

**Answer:** ✅ **Confirmed - Here's the complete specification:**

### Standard Payload Structure

```typescript
interface ModerationPushNotification {
  to: string;                    // Expo push token
  sound: 'default';
  title: string;                 // Notification title
  body: string;                  // Notification message
  data: {
    trackId: string;             // UUID of the track
    type: 'moderation';          // Always 'moderation' for these notifications
    action: 'approved' | 'rejected' | 'flagged' | 'appeal_received' | 'appeal_approved' | 'appeal_rejected';
  };
  priority: 'high' | 'default';  // 'high' for urgent, 'default' for info
  channelId?: 'moderation';      // Android notification channel
}
```

### All Notification Types

**1. Track Flagged (status → flagged):**
```json
{
  "title": "⚠️ Track Under Review",
  "body": "Your track \"[TITLE]\" is being reviewed by our team",
  "data": {
    "trackId": "uuid",
    "type": "moderation",
    "action": "flagged"
  },
  "priority": "high"
}
```

**2. Track Approved (status → approved):**
```json
{
  "title": "✅ Track Approved!",
  "body": "\"[TITLE]\" is now live",
  "data": {
    "trackId": "uuid",
    "type": "moderation",
    "action": "approved"
  },
  "priority": "high"
}
```

**3. Track Rejected (status → rejected):**
```json
{
  "title": "❌ Track Not Approved",
  "body": "\"[TITLE]\" was not approved. Tap to appeal.",
  "data": {
    "trackId": "uuid",
    "type": "moderation",
    "action": "rejected"
  },
  "priority": "high"
}
```

**4. Appeal Received (status → appealed):**
```json
{
  "title": "📬 Appeal Received",
  "body": "We're reviewing your appeal for \"[TITLE]\"",
  "data": {
    "trackId": "uuid",
    "type": "moderation",
    "action": "appeal_received"
  },
  "priority": "default"
}
```

**5. Appeal Approved (status → approved):**
```json
{
  "title": "🎉 Appeal Approved!",
  "body": "\"[TITLE]\" has been reinstated",
  "data": {
    "trackId": "uuid",
    "type": "moderation",
    "action": "appeal_approved"
  },
  "priority": "high"
}
```

**6. Appeal Rejected (status → rejected):**
```json
{
  "title": "Appeal Decision",
  "body": "Decision made on your appeal for \"[TITLE]\"",
  "data": {
    "trackId": "uuid",
    "type": "moderation",
    "action": "appeal_rejected"
  },
  "priority": "default"
}
```

### Handling in Mobile App

```typescript
// Listen for notifications
Notifications.addNotificationReceivedListener((notification) => {
  const { data } = notification.request.content;

  if (data.type === 'moderation') {
    console.log('Moderation notification:', data.action);

    // Optionally refresh track data
    if (data.trackId) {
      refreshTrack(data.trackId);
    }
  }
});

// Handle notification tap
Notifications.addNotificationResponseReceivedListener((response) => {
  const { data } = response.notification.request.content;

  if (data.type === 'moderation' && data.trackId) {
    // Navigate to track detail
    navigation.navigate('TrackDetail', { trackId: data.trackId });
  }
});
```

---

## 🧪 Complete Testing Checklist

### Phase 1: Basic Integration

- [ ] **Store Push Token**
  ```typescript
  const token = await Notifications.getExpoPushTokenAsync();
  await supabase.from('profiles').update({ expo_push_token: token.data });
  ```

- [ ] **Display Status Badges**
  - Upload test track
  - Verify badge shows "⏳ Pending Check"
  - Wait 5 minutes
  - Verify badge updates to "✓ Verified" or "⚠️ Under Review"

- [ ] **Filter Public Feed**
  ```typescript
  // Should only show: pending_check, checking, clean, approved
  const { data } = await supabase
    .from('audio_tracks')
    .select('*')
    .eq('is_public', true)
    .in('moderation_status', ['pending_check', 'checking', 'clean', 'approved']);
  ```

- [ ] **Show Own Tracks**
  ```typescript
  // Should show ALL tracks including flagged, rejected, appealed
  const { data } = await supabase
    .from('audio_tracks')
    .select('*')
    .eq('creator_id', userId);
  ```

### Phase 2: Notifications

- [ ] **Receive Push Notification**
  - Create flagged test track (SQL above)
  - Admin approves/rejects via dashboard
  - Verify push notification received
  - Verify notification content matches spec
  - Tap notification → navigate to track

- [ ] **In-App Notifications**
  ```typescript
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'moderation')
    .order('created_at', { ascending: false });
  ```

- [ ] **Real-Time Updates**
  ```typescript
  supabase
    .channel('notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      console.log('New notification:', payload.new);
    })
    .subscribe();
  ```

### Phase 3: Appeal Workflow

- [ ] **Submit Appeal**
  ```typescript
  const response = await fetch(`/api/tracks/${trackId}/appeal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appealText: 'I believe this was flagged by mistake because...'
    })
  });
  ```

- [ ] **Validation Tests**
  - Try appeal with < 20 characters → Should fail
  - Try appeal with > 500 characters → Should fail
  - Try appeal on non-rejected track → Should fail
  - Try appeal twice → Should fail
  - Valid appeal → Should succeed

- [ ] **Appeal Confirmation**
  - Submit appeal
  - Verify in-app notification received
  - Verify track status → `appealed`
  - Verify appeal text saved

### Phase 4: Edge Cases

- [ ] **Offline Handling**
  - Turn off internet
  - Try to submit appeal → Show offline message
  - Turn on internet
  - Retry → Should work

- [ ] **Long Track Titles**
  - Test notification with 100+ character title
  - Verify truncation if needed

- [ ] **Rapid Status Changes**
  - Upload track
  - Check status immediately
  - Check status after 1 minute
  - Check status after 5 minutes
  - Verify UI updates correctly

- [ ] **Multiple Tracks**
  - Upload 5 tracks
  - Verify each has correct status
  - Verify filtering works with multiple tracks

### Phase 5: Performance

- [ ] **Large Feed**
  - Load feed with 100+ tracks
  - Verify filtering is fast
  - Verify no duplicate tracks

- [ ] **Status Badge Performance**
  - Render list with 50+ tracks
  - Verify badges render quickly
  - Verify no layout shifts

- [ ] **Notification List**
  - Load 100+ notifications
  - Verify pagination works
  - Verify real-time updates don't cause memory leaks

---

## 🔧 Development Utilities

### Test Database Queries

```sql
-- 1. Get all tracks for a user with moderation status
SELECT
  id,
  title,
  moderation_status,
  moderation_flagged,
  flag_reasons,
  created_at
FROM audio_tracks
WHERE creator_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;

-- 2. Check notification counts
SELECT
  type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE read = false) as unread
FROM notifications
WHERE user_id = 'YOUR_USER_ID'
GROUP BY type;

-- 3. Get moderation statistics
SELECT
  moderation_status,
  COUNT(*) as count
FROM audio_tracks
WHERE creator_id = 'YOUR_USER_ID'
GROUP BY moderation_status;

-- 4. Test flagged track
SELECT *
FROM audio_tracks
WHERE moderation_flagged = true
LIMIT 1;
```

### TypeScript Type Definitions

```typescript
// Add to your types file
export type ModerationStatus =
  | 'pending_check'
  | 'checking'
  | 'clean'
  | 'flagged'
  | 'approved'
  | 'rejected'
  | 'appealed';

export interface AudioTrack {
  id: string;
  creator_id: string;
  title: string;
  artist_name: string;
  file_url: string;
  is_public: boolean;

  // Moderation fields
  moderation_status: ModerationStatus;
  moderation_flagged: boolean;
  flag_reasons: string[] | null;
  moderation_confidence: number | null;
  transcription: string | null;
  moderation_checked_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  appeal_text: string | null;
  appeal_status: 'pending' | 'approved' | 'rejected' | null;

  created_at: string;
  updated_at: string;
}

export interface ModerationNotification {
  id: string;
  user_id: string;
  type: 'moderation';
  title: string;
  message: string;
  link: string;
  read: boolean;
  created_at: string;
}

export interface ModerationPushData {
  trackId: string;
  type: 'moderation';
  action: 'approved' | 'rejected' | 'flagged' | 'appeal_received' | 'appeal_approved' | 'appeal_rejected';
}
```

---

## 📞 Contact for Testing

### Backend Testing Support

**Available for:**
- Creating test tracks
- Triggering test notifications
- Approving/rejecting test content
- Resetting test data

**Contact:**
- Slack: #moderation-testing
- Email: backend-team@soundbridge.com
- Response time: < 1 hour during business hours

### Test Environment Access

**Staging Database:**
- URL: https://staging.soundbridge.live
- Test user credentials available in 1Password

**Admin Dashboard:**
- URL: https://soundbridge.live/admin/moderation
- Test admin credentials: (contact backend team)

---

## 🎯 Success Criteria

Before marking implementation complete, verify:

### Functional Requirements
- ✅ Push tokens saved to database
- ✅ Status badges display correctly
- ✅ Public feeds filter correctly
- ✅ Own tracks show all statuses
- ✅ Push notifications received
- ✅ In-app notifications displayed
- ✅ Appeal submission works
- ✅ Navigation from notifications works

### Performance Requirements
- ✅ Feed loads in < 2 seconds
- ✅ Badge rendering doesn't cause lag
- ✅ Notification list scrolls smoothly
- ✅ Real-time updates work without crashes

### User Experience
- ✅ Status badges are clear and readable
- ✅ Notification messages are helpful
- ✅ Appeal form is easy to use
- ✅ No confusing states or errors

---

## 📋 Summary

### Questions Answered

1. ✅ **Appeal Endpoint:** Implemented at `POST /api/tracks/[trackId]/appeal`
2. ✅ **Visibility Rules:** Detailed table provided with exact filtering logic
3. ✅ **Testing Support:** SQL scripts, test notifications, and utilities provided
4. ✅ **Backwards Compatibility:** All existing tracks set to 'clean' status
5. ✅ **Notification Format:** Complete specification with all 6 types documented

### What You Have Now

- ✅ Fully functional appeal endpoint
- ✅ Complete notification payload specifications
- ✅ Test track creation scripts
- ✅ Test notification sender scripts
- ✅ Complete testing checklist
- ✅ TypeScript type definitions
- ✅ Database query examples

### Ready to Start

You have everything needed to:
1. Start Phase 1 implementation (push tokens, badges, filtering)
2. Test each feature as you build it
3. Verify end-to-end workflows
4. Submit pull requests with confidence

---

**Good luck with implementation! We're here to help if you need anything.** 🚀

---

*Mobile Team Testing Guide - December 17, 2025*
*SoundBridge Content Moderation System*
