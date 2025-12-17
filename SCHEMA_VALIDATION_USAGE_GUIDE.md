# Schema Validation Usage Guide

**Purpose:** Learn how to use the schema validation utilities to prevent database errors.

**What It Does:**
- Validates column names before queries run
- Provides helpful error messages
- Suggests correct column names
- Works at compile-time (TypeScript) and runtime (development)

---

## Quick Start

### **1. Import the Utilities**

```typescript
import {
  validateColumn,
  COMMON_COLUMN_SETS,
  buildQueryString,
  columnExists,
} from '@/src/lib/schema-validation';
```

### **2. Use Pre-Defined Column Sets**

Instead of typing column names manually, use the pre-defined sets:

```typescript
// ❌ BAD - Easy to make typos or use wrong columns
const { data } = await supabase
  .from('connection_requests')
  .select('id, requester_id, receiver_id, status') // receiver_id is wrong!

// ✅ GOOD - Use pre-defined column set
import { COMMON_COLUMN_SETS, buildQueryString } from '@/src/lib/schema-validation';

const columns = buildQueryString(COMMON_COLUMN_SETS.connection_requests.basic);
const { data } = await supabase
  .from('connection_requests')
  .select(columns) // id, requester_id, recipient_id, status
```

---

## Available Column Sets

### **Profiles**

```typescript
import { COMMON_COLUMN_SETS } from '@/src/lib/schema-validation';

// Basic profile info
COMMON_COLUMN_SETS.profiles.basic
// ['id', 'display_name', 'username', 'avatar_url']

// Full profile info
COMMON_COLUMN_SETS.profiles.full
// ['id', 'display_name', 'username', 'bio', 'avatar_url', 'location', 'website', 'professional_headline']

// Usage:
const columns = buildQueryString(COMMON_COLUMN_SETS.profiles.full);
const { data } = await supabase
  .from('profiles')
  .select(columns);
```

### **Audio Tracks**

```typescript
// List view (for displaying in lists)
COMMON_COLUMN_SETS.audio_tracks.list
// ['id', 'title', 'play_count', 'likes_count', 'created_at', 'cover_art_url']

// Full track details
COMMON_COLUMN_SETS.audio_tracks.full
// ['id', 'title', 'play_count', 'likes_count', 'created_at', 'cover_art_url', 'duration', 'file_url']

// Note: 'artist' is NOT included because it doesn't exist in the database!

// Usage:
const columns = buildQueryString(COMMON_COLUMN_SETS.audio_tracks.full);
const { data } = await supabase
  .from('audio_tracks')
  .select(columns);
```

### **Connection Requests**

```typescript
// Basic request info
COMMON_COLUMN_SETS.connection_requests.basic
// ['id', 'requester_id', 'recipient_id', 'status', 'created_at']
// Note: Uses 'recipient_id' not 'receiver_id'!

// Full request info (includes message)
COMMON_COLUMN_SETS.connection_requests.full
// ['id', 'requester_id', 'recipient_id', 'status', 'message', 'created_at']

// Usage:
const columns = buildQueryString(COMMON_COLUMN_SETS.connection_requests.full);
const { data } = await supabase
  .from('connection_requests')
  .select(columns);
```

### **Posts**

```typescript
// Basic post info
COMMON_COLUMN_SETS.posts.basic
// ['id', 'user_id', 'content', 'post_type', 'created_at']
// Note: Uses 'post_type' not 'tags'!

// Full post info
COMMON_COLUMN_SETS.posts.full
// ['id', 'user_id', 'content', 'visibility', 'post_type', 'event_id', 'created_at', 'updated_at']

// Usage:
const columns = buildQueryString(COMMON_COLUMN_SETS.posts.full);
const { data } = await supabase
  .from('posts')
  .select(columns)
  .eq('post_type', 'opportunity'); // Not .contains('tags', ['opportunity'])!
```

---

## Runtime Validation (Development Only)

### **Check if Column Exists**

```typescript
import { columnExists } from '@/src/lib/schema-validation';

// Returns false and logs warning
columnExists('connection_requests', 'receiver_id');
// ⚠️ Column 'receiver_id' doesn't exist on 'connection_requests'. Did you mean 'recipient_id'?

// Returns true
columnExists('connection_requests', 'recipient_id');
```

### **Get Correct Column Name**

```typescript
import { getCorrectColumnName } from '@/src/lib/schema-validation';

try {
  getCorrectColumnName('receiver_id');
} catch (error) {
  // Throws: "Column 'receiver_id' doesn't exist. Did you mean 'recipient_id'?"
}

try {
  getCorrectColumnName('artist');
} catch (error) {
  // Throws: "Column 'artist' doesn't exist in the database schema."
}
```

---

## Common Mistakes Prevention

### **Mistake 1: receiver_id vs recipient_id**

```typescript
// ❌ WRONG - Will cause database error
const { data } = await supabase
  .from('connection_requests')
  .eq('receiver_id', userId);

// ✅ CORRECT
const { data } = await supabase
  .from('connection_requests')
  .eq('recipient_id', userId);

// ✅ EVEN BETTER - Use constants
import { COLUMN_MAPPINGS } from '@/src/lib/schema-validation';

// COLUMN_MAPPINGS shows: 'receiver_id' → 'recipient_id'
```

### **Mistake 2: tags vs post_type**

```typescript
// ❌ WRONG - 'tags' column doesn't exist
const { data } = await supabase
  .from('posts')
  .contains('tags', ['opportunity']);

// ✅ CORRECT - Use 'post_type'
const { data } = await supabase
  .from('posts')
  .eq('post_type', 'opportunity');

// ✅ EVEN BETTER - Use enum values
type PostType = 'update' | 'opportunity' | 'achievement' | 'collaboration' | 'event';
const postType: PostType = 'opportunity';

const { data } = await supabase
  .from('posts')
  .eq('post_type', postType);
```

### **Mistake 3: artist column**

```typescript
// ❌ WRONG - 'artist' column doesn't exist
const { data } = await supabase
  .from('audio_tracks')
  .select('id, title, artist'); // Error!

// ✅ CORRECT - Get artist from creator profile
const { data: tracks } = await supabase
  .from('audio_tracks')
  .select('id, title, creator_id');

// Then get profile separately
const creatorIds = tracks.map(t => t.creator_id);
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, display_name')
  .in('id', creatorIds);

// Map artist name from profile
const tracksWithArtist = tracks.map(track => ({
  ...track,
  artist: profiles.find(p => p.id === track.creator_id)?.display_name || 'Unknown Artist',
}));
```

---

## Type-Safe Queries

### **Using Type Definitions**

```typescript
import type { ProfileQuery, AudioTrackQuery, PostQuery } from '@/src/lib/schema-validation';

// Get profile with type safety
async function getProfile(userId: string): Promise<ProfileQuery | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, username, bio, avatar_url, location, website, professional_headline, created_at')
    .eq('id', userId)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data as ProfileQuery; // Type-safe return
}

// Get tracks with type safety
async function getTracks(creatorId: string): Promise<AudioTrackQuery[]> {
  const { data, error } = await supabase
    .from('audio_tracks')
    .select('id, title, creator_id, play_count, likes_count, created_at, cover_art_url, duration, file_url')
    .eq('creator_id', creatorId);

  if (error) {
    console.error(error);
    return [];
  }

  return data as AudioTrackQuery[]; // Type-safe return
}
```

---

## Integration with Data Service

### **Update Existing Methods**

```typescript
// apps/web/src/lib/data-service.ts
import {
  COMMON_COLUMN_SETS,
  buildQueryString,
  columnExists,
} from './schema-validation';

class DataService {
  async getConnectionRequests(userId: string, type: 'sent' | 'received' = 'received') {
    try {
      // Use pre-defined column set
      const columns = buildQueryString(COMMON_COLUMN_SETS.connection_requests.full);

      // Correct column name
      const column = type === 'sent' ? 'requester_id' : 'recipient_id';

      // Validate in development
      if (process.env.NODE_ENV === 'development') {
        if (!columnExists('connection_requests', column)) {
          console.error(`Column ${column} doesn't exist!`);
        }
      }

      const { data: requests, error } = await this.supabase
        .from('connection_requests')
        .select(columns)
        .eq(column, userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data: requests, error: null };
    } catch (error) {
      console.error('Error fetching connection requests:', error);
      return { data: null, error };
    }
  }

  async getOpportunities(limit = 15) {
    try {
      // Use pre-defined column set
      const columns = buildQueryString(COMMON_COLUMN_SETS.posts.full);

      const { data: posts, error } = await this.supabase
        .from('posts')
        .select(columns)
        .is('deleted_at', null)
        .eq('visibility', 'public')
        .eq('post_type', 'opportunity') // Not .contains('tags', ['opportunity'])!
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { data: posts, error: null };
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      return { data: null, error };
    }
  }
}
```

---

## Enable Query Logging (Development)

For debugging, enable query validation logging:

```typescript
// apps/web/app/layout.tsx or apps/web/pages/_app.tsx
import { enableQueryLogging } from '@/src/lib/schema-validation';

if (process.env.NODE_ENV === 'development') {
  enableQueryLogging();
  // Now all queries will be validated and logged
}
```

---

## Validation in Tests

```typescript
// tests/data-service.test.ts
import { columnExists } from '@/src/lib/schema-validation';

describe('DataService', () => {
  it('should use correct column names', () => {
    // Verify correct column names are used
    expect(columnExists('connection_requests', 'recipient_id')).toBe(true);
    expect(columnExists('connection_requests', 'receiver_id')).toBe(false);

    expect(columnExists('posts', 'post_type')).toBe(true);
    expect(columnExists('posts', 'tags')).toBe(false);

    expect(columnExists('audio_tracks', 'title')).toBe(true);
    expect(columnExists('audio_tracks', 'artist')).toBe(false);
  });
});
```

---

## Best Practices

### **1. Always Use Column Sets**

```typescript
// ❌ BAD - Manual typing, prone to errors
.select('id, requester_id, receiver_id')

// ✅ GOOD - Use pre-defined column set
import { COMMON_COLUMN_SETS, buildQueryString } from '@/src/lib/schema-validation';
const columns = buildQueryString(COMMON_COLUMN_SETS.connection_requests.basic);
.select(columns)
```

### **2. Check COLUMN_MAPPINGS Before Using**

```typescript
import { COLUMN_MAPPINGS } from '@/src/lib/schema-validation';

// Before writing a query, check if column name is wrong:
console.log(COLUMN_MAPPINGS);
// {
//   'receiver_id': 'recipient_id',
//   'tags': 'post_type',
//   'artist': null,
//   'creator_id': 'user_id',
// }
```

### **3. Use TypeScript Types**

```typescript
// Import type definitions
import type { ProfileQuery, AudioTrackQuery, ConnectionRequestQuery, PostQuery } from '@/src/lib/schema-validation';

// Use them in function signatures
async function loadProfile(userId: string): Promise<ProfileQuery | null> {
  // TypeScript will ensure you select all required fields
}
```

### **4. Add Custom Column Sets**

If you need specific column combinations, add them:

```typescript
// apps/web/src/lib/schema-validation.ts
export const COMMON_COLUMN_SETS = {
  // ... existing sets

  // Add your custom set
  my_feature: {
    custom_query: ['id', 'field1', 'field2'] as const,
  },
} as const;
```

---

## Migration Checklist

To migrate existing code to use schema validation:

- [ ] Import `COMMON_COLUMN_SETS` and `buildQueryString`
- [ ] Replace manual column lists with column sets
- [ ] Replace wrong column names:
  - [ ] `receiver_id` → `recipient_id`
  - [ ] `tags` → `post_type`
  - [ ] Remove `artist` (use profile.display_name)
  - [ ] `creator_id` → `user_id` (in creator_branding)
- [ ] Add type annotations using `ProfileQuery`, `AudioTrackQuery`, etc.
- [ ] Add `columnExists` checks in development
- [ ] Enable query logging in development
- [ ] Add tests to verify column names

---

## Troubleshooting

### **"Column doesn't exist" in production**

This validation only runs in development. If you get a "column doesn't exist" error in production:

1. Check the error message for the column name
2. Look up the column in `COLUMN_MAPPINGS`
3. Fix the query to use the correct column name
4. Regenerate types: `npx supabase gen types typescript`
5. Deploy the fix

### **TypeScript errors after adding validation**

This is good! TypeScript is catching errors before runtime.

1. Read the TypeScript error message
2. Check which column name is wrong
3. Look up the correct name in `COLUMN_MAPPINGS`
4. Update your query

### **Want to add more validations**

Edit `apps/web/src/lib/schema-validation.ts`:

1. Add new column mappings to `COLUMN_MAPPINGS`
2. Add new column sets to `COMMON_COLUMN_SETS`
3. Update `columnExists` function with new checks
4. Add new type definitions

---

## Summary

**What we've prevented:**

✅ Column name errors (receiver_id, tags, artist)
✅ Typos in column names
✅ Using removed/renamed columns
✅ Incorrect query syntax

**How we did it:**

1. **Compile-time:** TypeScript types from database
2. **Development runtime:** Validation functions with helpful errors
3. **Pre-defined column sets:** Prevent manual typing errors
4. **Documentation:** `COLUMN_MAPPINGS` shows correct names

**Result:**

No more "column does not exist" errors in production! 🎉

---

*Use these utilities in all new code and gradually migrate existing code.*
*Your future self will thank you!*

**Last updated:** December 16, 2025
