# Block & Report Feature - Mobile Implementation Documentation, 28 November, 2025

## Table of Contents
1. [Overview](#overview)
2. [Block Feature](#block-feature)
3. [Report Feature](#report-feature)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [UI/UX Guidelines](#uiux-guidelines)
7. [Implementation Steps](#implementation-steps)
8. [Edge Cases & Considerations](#edge-cases--considerations)
9. [Testing Guidelines](#testing-guidelines)
10. [Error Handling](#error-handling)

---

## Overview

This documentation covers two related features: **Block** and **Report**. Both features help users maintain a safe and positive experience on the platform.

### Block Feature

The block feature allows users to block other users to prevent interaction and hide content. When User A blocks User B:
- User A will not see User B's posts, content, or profile
- User B will not see User A's posts, content, or profile
- Neither user can message each other
- Blocking is bidirectional (if A blocks B, both are blocked from each other)
- Users can unblock at any time

### Report Feature

The report feature allows users to report inappropriate content or behavior to administrators. Reports are reviewed by admins who can take action such as removing content or banning users.

### Key Features

**Block:**
- ✅ Block/Unblock users
- ✅ Optional reason for blocking (stored for user reference only)
- ✅ Automatic content filtering (posts, feeds, search results)
- ✅ Block status checking
- ✅ List of blocked users
- ✅ Bidirectional blocking

**Report:**
- ✅ Report posts, comments, tracks, profiles, and playlists
- ✅ Multiple report types (spam, harassment, copyright, etc.)
- ✅ Optional detailed description
- ✅ Anonymous reporting support
- ✅ Reports appear in admin dashboard for review

---

## Database Schema

### Table: `blocked_users`

```sql
CREATE TABLE blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT, -- Optional reason for blocking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);
```

### Indexes
- `idx_blocked_users_blocker` on `blocker_id`
- `idx_blocked_users_blocked` on `blocked_id`
- `idx_blocked_users_created_at` on `created_at DESC`

### Helper Function

```sql
-- Check if two users have a block relationship
CREATE OR REPLACE FUNCTION is_user_blocked(user_a_id UUID, user_b_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocked_users
        WHERE (blocker_id = user_a_id AND blocked_id = user_b_id)
           OR (blocker_id = user_b_id AND blocked_id = user_a_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## API Endpoints

### Base URL
All endpoints use: `https://www.soundbridge.live/api/users/block`

### Authentication
All endpoints require authentication. Include the user's session token in the request headers:
```
Authorization: Bearer <token>
```
Or use cookie-based authentication if available.

---

### 1. Block a User

**Endpoint:** `POST /api/users/block`

**Request Body:**
```json
{
  "blockedUserId": "uuid-of-user-to-block",
  "reason": "Optional reason for blocking (max 500 characters)"
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
    "reason": "Optional reason",
    "created_at": "2025-11-27T15:00:00Z"
  }
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | `Authentication required` | User not logged in |
| 400 | `You cannot block yourself` | Attempting to block own account |
| 400 | `Invalid request data` | Missing or invalid `blockedUserId` |
| 404 | `User not found` | Target user doesn't exist |
| 409 | `User is already blocked` | User is already in blocked list |
| 500 | `Failed to block user` | Server error |

**Example Request:**
```typescript
const response = await fetch('https://www.soundbridge.live/api/users/block', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    blockedUserId: '123e4567-e89b-12d3-a456-426614174000',
    reason: 'Inappropriate behavior'
  })
});

const data = await response.json();
```

---

### 2. Unblock a User

**Endpoint:** `DELETE /api/users/block?userId=<userId>`

**Query Parameters:**
- `userId` (required): UUID of the user to unblock

**Success Response (200):**
```json
{
  "success": true,
  "message": "You have unblocked John Doe"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | `Authentication required` | User not logged in |
| 400 | `User ID is required` | Missing `userId` parameter |
| 404 | `User is not blocked` | User is not in blocked list |
| 500 | `Failed to unblock user` | Server error |

**Example Request:**
```typescript
const userId = '123e4567-e89b-12d3-a456-426614174000';
const response = await fetch(
  `https://www.soundbridge.live/api/users/block?userId=${userId}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${userToken}`
    }
  }
);

const data = await response.json();
```

---

### 3. Check Block Status

**Endpoint:** `GET /api/users/block?checkUserId=<userId>`

**Query Parameters:**
- `checkUserId` (required): UUID of the user to check

**Success Response (200):**
```json
{
  "success": true,
  "isBlocked": true,
  "isBlockedBy": false,
  "isBlocking": true,
  "block": {
    "id": "block-uuid",
    "reason": "Optional reason",
    "created_at": "2025-11-27T15:00:00Z"
  }
}
```

**Response Fields:**
- `isBlocked`: `true` if there's any block relationship (bidirectional)
- `isBlockedBy`: `true` if the checked user has blocked the current user
- `isBlocking`: `true` if the current user has blocked the checked user
- `block`: Block record details (null if not blocked)

**Example Request:**
```typescript
const userId = '123e4567-e89b-12d3-a456-426614174000';
const response = await fetch(
  `https://www.soundbridge.live/api/users/block?checkUserId=${userId}`,
  {
    headers: {
      'Authorization': `Bearer ${userToken}`
    }
  }
);

const data = await response.json();
if (data.success && data.isBlocked) {
  // User is blocked
}
```

---

### 4. List Blocked Users

**Endpoint:** `GET /api/users/block?list=blocked`

**Query Parameters:**
- `list` (optional): 
  - `blocked` (default): Users I've blocked
  - `blockers`: Users who have blocked me

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "block-uuid",
      "reason": "Optional reason",
      "created_at": "2025-11-27T15:00:00Z",
      "blocked": {
        "id": "user-uuid",
        "display_name": "John Doe",
        "username": "johndoe",
        "avatar_url": "https://..."
      }
    }
  ],
  "count": 5
}
```

**Example Request:**
```typescript
// Get users I've blocked
const response = await fetch(
  'https://www.soundbridge.live/api/users/block?list=blocked',
  {
    headers: {
      'Authorization': `Bearer ${userToken}`
    }
  }
);

const data = await response.json();
const blockedUsers = data.data || [];
```

---

## UI/UX Guidelines

### 1. Block Button Placement

**Profile Pages:**
- Show "Block" button when viewing another user's profile
- Replace "Edit Profile" button with "Block" when viewing others
- Show "Unblock" button if user is already blocked
- Position: Top right of profile header, next to other action buttons

**Post Cards/Feed:**
- Add "Block User" option in the "More" menu (three dots)
- Add "Report" option in the "More" menu (three dots)
- Show in context menu when long-pressing a post
- Use shield icon (🛡️) for block, flag icon (🚩) for report

**User Lists:**
- Add block option in user detail views
- Show in swipe actions (if applicable)

### 2. Block Modal/Confirmation

**Required Elements:**
- Clear title: "Block User" or "Unblock User"
- User's name/avatar for context
- Explanation of what happens when blocking:
  - "You won't see their posts or content"
  - "They won't be able to message you"
  - "They won't be able to see your posts"
  - "You can unblock them anytime"
- Optional reason field (textarea, max 500 characters)
- Character counter for reason field
- Cancel and Confirm buttons
- Loading state during API call

**Visual Design:**
- Use warning colors (red/orange) for block action
- Use neutral colors for unblock action
- Show user avatar and name prominently
- Make it clear this action is reversible

### 3. Report Modal/Confirmation

**Required Elements:**
- Clear title: "Report [Content Type]"
- Content preview (post text, track title, profile name, etc.)
- Report type selection (radio buttons or dropdown):
  - Spam or misleading content
  - Inappropriate or offensive content
  - Harassment or bullying
  - Fake or misleading information
  - Copyright infringement
  - Other violation
- Description field (required if "Other" is selected, optional otherwise)
- Character counter for description (max 1000 characters)
- Explanation of what happens:
  - "Your report will be reviewed by our moderation team"
  - "We'll take appropriate action if a violation is found"
  - "You may not receive a direct response"
- Cancel and Submit buttons
- Loading state during API call
- Success confirmation after submission

**Visual Design:**
- Use warning/alert colors (red/orange) for report action
- Show content being reported prominently
- Make report types easy to select
- Clear visual hierarchy

### 3. Block Status Indicators

**When User is Blocked:**
- Hide their posts from feeds
- Show "This user is blocked" message if trying to view their profile
- Hide them from search results
- Disable messaging (show "User is blocked" message)
- Show "Unblock" button instead of "Block"

**Blocked Users List:**
- Create a settings page: "Settings > Privacy > Blocked Users"
- Show list of blocked users with:
  - Avatar
  - Display name
  - Username
  - Block date
  - Unblock button
- Allow searching/filtering blocked users
- Show empty state: "You haven't blocked anyone"

### 5. Content Filtering

**Feeds:**
- Automatically filter out posts from blocked users
- No need to show "This post is hidden" messages
- Filter should be seamless and invisible

**Search:**
- Hide blocked users from search results
- Hide their content from search

**Notifications:**
- Don't show notifications from blocked users
- Filter blocked users from notification lists

---

## Implementation Steps

### Step 1: Create Block Service/Repository

```typescript
// BlockService.ts
class BlockService {
  private baseUrl = 'https://www.soundbridge.live/api/users/block';
  
  async blockUser(userId: string, reason?: string): Promise<BlockResponse> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getToken()}`
      },
      body: JSON.stringify({
        blockedUserId: userId,
        reason: reason || undefined
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to block user');
    }
    
    return await response.json();
  }
  
  async unblockUser(userId: string): Promise<UnblockResponse> {
    const response = await fetch(`${this.baseUrl}?userId=${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${await this.getToken()}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to unblock user');
    }
    
    return await response.json();
  }
  
  async checkBlockStatus(userId: string): Promise<BlockStatus> {
    const response = await fetch(`${this.baseUrl}?checkUserId=${userId}`, {
      headers: {
        'Authorization': `Bearer ${await this.getToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to check block status');
    }
    
    return await response.json();
  }
  
  async getBlockedUsers(): Promise<BlockedUser[]> {
    const response = await fetch(`${this.baseUrl}?list=blocked`, {
      headers: {
        'Authorization': `Bearer ${await this.getToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch blocked users');
    }
    
    const data = await response.json();
    return data.data || [];
  }
  
  private async getToken(): Promise<string> {
    // Implement your token retrieval logic
    return await AsyncStorage.getItem('auth_token') || '';
  }
}
```

### Step 2: Create Block Modal Component

```typescript
// BlockUserModal.tsx
interface BlockUserModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userAvatar?: string;
  isCurrentlyBlocked: boolean;
  onBlocked?: () => void;
  onUnblocked?: () => void;
}

export const BlockUserModal: React.FC<BlockUserModalProps> = ({
  visible,
  onClose,
  userId,
  userName,
  userAvatar,
  isCurrentlyBlocked,
  onBlocked,
  onUnblocked
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blockService = new BlockService();
  
  const handleBlock = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await blockService.blockUser(userId, reason.trim() || undefined);
      onBlocked?.();
      onClose();
      setReason('');
      // Show success message
      Alert.alert('Success', `You have blocked ${userName}`);
    } catch (err: any) {
      setError(err.message || 'Failed to block user');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUnblock = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await blockService.unblockUser(userId);
      onUnblocked?.();
      onClose();
      // Show success message
      Alert.alert('Success', `You have unblocked ${userName}`);
    } catch (err: any) {
      setError(err.message || 'Failed to unblock user');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal visible={visible} onRequestClose={onClose} transparent>
      {/* Modal implementation */}
    </Modal>
  );
};
```

### Step 5: Integrate Report in Post/Comment Cards

```typescript
// PostCard.tsx
const [showReportModal, setShowReportModal] = useState(false);

const handleReport = () => {
  setShowReportModal(true);
};

<ReportContentModal
  visible={showReportModal}
  onClose={() => setShowReportModal(false)}
  contentType="post"
  contentId={post.id}
  contentTitle={post.content || 'Post'}
  onReported={() => {
    // Optionally refresh feed or show success message
  }}
/>
```

### Step 6: Integrate Block Check in User Profile

```typescript
// UserProfileScreen.tsx
const [isBlocked, setIsBlocked] = useState(false);
const [isCheckingBlock, setIsCheckingBlock] = useState(false);

useEffect(() => {
  if (userId && userId !== currentUserId) {
    checkBlockStatus();
  }
}, [userId]);

const checkBlockStatus = async () => {
  setIsCheckingBlock(true);
  try {
    const status = await blockService.checkBlockStatus(userId);
    setIsBlocked(status.isBlocked || status.isBlockedBy);
  } catch (err) {
    console.error('Failed to check block status:', err);
  } finally {
    setIsCheckingBlock(false);
  }
};
```

### Step 7: Filter Blocked Users from Feeds

```typescript
// FeedService.ts
async getFeed(): Promise<Post[]> {
  // First, get blocked users
  const blockedUsers = await blockService.getBlockedUsers();
  const blockedUserIds = new Set(blockedUsers.map(u => u.blocked.id));
  
  // Fetch feed
  const feed = await fetch('/api/posts/feed');
  const posts = feed.data.posts || [];
  
  // Filter out posts from blocked users
  return posts.filter(post => !blockedUserIds.has(post.user_id));
}
```

### Step 8: Create Blocked Users Settings Screen

```typescript
// BlockedUsersScreen.tsx
const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadBlockedUsers();
}, []);

const loadBlockedUsers = async () => {
  setLoading(true);
  try {
    const users = await blockService.getBlockedUsers();
    setBlockedUsers(users);
  } catch (err) {
    Alert.alert('Error', 'Failed to load blocked users');
  } finally {
    setLoading(false);
  }
};

const handleUnblock = async (userId: string) => {
  try {
    await blockService.unblockUser(userId);
    // Refresh list
    await loadBlockedUsers();
    Alert.alert('Success', 'User unblocked');
  } catch (err) {
    Alert.alert('Error', 'Failed to unblock user');
  }
};
```

---

## Edge Cases & Considerations

### 1. Self-Blocking Prevention
- **Issue:** User tries to block themselves
- **Solution:** API returns 400 error, show friendly message: "You cannot block yourself"

### 2. Already Blocked
- **Issue:** User tries to block someone already blocked
- **Solution:** API returns 409 error, show message: "User is already blocked"

### 3. Blocking While Messaging
- **Issue:** User blocks someone they're currently messaging
- **Solution:** 
  - Close the conversation immediately
  - Show message: "You have blocked this user. The conversation has been closed."
  - Hide conversation from message list

### 4. Blocking Connection/Follow
- **Issue:** What happens to connections/follows when blocking?
- **Solution:** 
  - Keep the connection/follow status (don't auto-unfollow)
  - But hide all content and prevent interaction
  - Consider: Should we auto-remove connections? (Discuss with product team)

### 5. Block Status Caching
- **Issue:** Checking block status for every user in a list is expensive
- **Solution:**
  - Cache block status in local state
  - Refresh cache when blocking/unblocking
  - Consider using a Set/Map for O(1) lookups

### 6. Network Errors
- **Issue:** Network fails during block/unblock
- **Solution:**
  - Show retry option
  - Don't update UI until API confirms success
  - Queue action for retry if offline

### 7. Race Conditions
- **Issue:** Multiple rapid block/unblock actions
- **Solution:**
  - Disable buttons during API call
  - Use loading states
  - Debounce rapid clicks

### 8. Blocked User Views Your Profile
- **Issue:** What should blocked user see?
- **Solution:**
  - Show minimal profile info (name, avatar)
  - Hide posts, content, stats
  - Show message: "This user has blocked you"

---

## Testing Guidelines

### Unit Tests

```typescript
describe('BlockService', () => {
  it('should block a user successfully', async () => {
    const service = new BlockService();
    const result = await service.blockUser('user-id', 'reason');
    expect(result.success).toBe(true);
  });
  
  it('should prevent self-blocking', async () => {
    const service = new BlockService();
    await expect(service.blockUser('current-user-id')).rejects.toThrow();
  });
  
  it('should check block status correctly', async () => {
    const service = new BlockService();
    const status = await service.checkBlockStatus('user-id');
    expect(status).toHaveProperty('isBlocked');
  });
});
```

### Integration Tests

1. **Block Flow:**
   - User A blocks User B
   - Verify User B's posts disappear from User A's feed
   - Verify User A cannot message User B
   - Verify User B cannot see User A's posts

2. **Unblock Flow:**
   - User A unblocks User B
   - Verify User B's posts reappear in User A's feed
   - Verify messaging is re-enabled

3. **Bidirectional Blocking:**
   - User A blocks User B
   - Verify User B also cannot see User A's content
   - Verify both users are blocked from each other

4. **Edge Cases:**
   - Block yourself (should fail)
   - Block already blocked user (should fail gracefully)
   - Block non-existent user (should fail)
   - Network failure during block (should handle gracefully)

### Manual Testing Checklist

- [ ] Block user from profile page
- [ ] Block user from post card menu
- [ ] Unblock user from profile page
- [ ] Unblock user from blocked users list
- [ ] Check block status on profile load
- [ ] Verify blocked users' posts are filtered from feed
- [ ] Verify blocked users don't appear in search
- [ ] Verify messaging is disabled with blocked users
- [ ] Test with network offline/online
- [ ] Test rapid block/unblock actions
- [ ] Verify block reason is saved and displayed
- [ ] Test bidirectional blocking behavior

---

## Error Handling

### Common Errors and User Messages

| Error Code | Error Message | User-Friendly Message |
|------------|---------------|----------------------|
| 401 | `Authentication required` | "Please log in to block users" |
| 400 | `You cannot block yourself` | "You cannot block yourself" |
| 400 | `Invalid request data` | "Invalid request. Please try again." |
| 404 | `User not found` | "User not found" |
| 404 | `User is not blocked` | "This user is not blocked" |
| 409 | `User is already blocked` | "This user is already blocked" |
| 500 | `Failed to block user` | "Something went wrong. Please try again." |

### Error Handling Pattern

```typescript
try {
  await blockService.blockUser(userId, reason);
  // Success handling
} catch (error: any) {
  let message = 'Something went wrong. Please try again.';
  
  if (error.message.includes('cannot block yourself')) {
    message = 'You cannot block yourself';
  } else if (error.message.includes('already blocked')) {
    message = 'This user is already blocked';
  } else if (error.message.includes('not found')) {
    message = 'User not found';
  }
  
  Alert.alert('Error', message);
}
```

---

## Additional Notes

### Performance Considerations

1. **Batch Block Checks:** When loading a list of users, consider batching block status checks
2. **Caching:** Cache block status locally to avoid repeated API calls
3. **Lazy Loading:** Only check block status when needed (e.g., when viewing profile)

### Privacy Considerations

1. **Block Reason:** Stored for user reference only, not visible to blocked user
2. **Block Visibility:** Blocked users don't know they're blocked (no notification)
3. **Data Retention:** Consider data retention policies for block records

### Future Enhancements

1. **Temporary Blocks:** Block for a specific duration
2. **Block Categories:** Different types of blocks (spam, harassment, etc.)
3. **Block Analytics:** Track blocking patterns for moderation
4. **Auto-Unblock:** Option to auto-unblock after X days

---

## Support & Questions

For questions or issues with the block or report feature implementation:
- **Block API:** `/api/users/block`
- **Report API:** `/api/reports/content`
- **Database Schemas:**
  - Block: `database/user_blocks_schema.sql`
  - Reports: `database/content_reports_migration_add_post_support.sql`
- **Admin Dashboard:** `/admin/dashboard` (Content Review tab)
- Contact web team for API clarifications

## Related Documentation

- **Admin Content Review Guide:** See `ADMIN_CONTENT_REVIEW_GUIDE.md` for information on how admins review and process reports
- **Report Testing Guide:** See `REPORTING_FEATURE_TESTING_GUIDE.md` for detailed testing instructions

---

**Last Updated:** November 28, 2025  
**Version:** 2.0.0 (Added Report Feature)

