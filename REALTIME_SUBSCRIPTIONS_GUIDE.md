# Real-Time Subscriptions Guide - Professional Networking Features

**Date:** November 24, 2025  
**Purpose:** Documentation for implementing real-time subscriptions for posts, reactions, comments, and connections

---

## Overview

Supabase Real-Time allows the app to receive live updates when data changes in the database. This is essential for:
- Live reaction counts
- New comments appearing instantly
- Connection request notifications
- New posts in feed

---

## Setup Requirements

### 1. Enable Real-Time in Supabase

Real-time is enabled by default in Supabase, but you need to ensure it's enabled for the new tables:

1. Go to Supabase Dashboard → Database → Replication
2. Enable replication for:
   - `posts`
   - `post_reactions`
   - `post_comments`
   - `connection_requests`
   - `connections` (optional, for connection status updates)

### 2. RLS Policies for Real-Time

The RLS policies we created in Phase 1 already support real-time subscriptions. Users can only subscribe to data they have permission to view.

---

## Implementation Examples

### 1. Post Reactions - Real-Time Updates

```typescript
import { createBrowserClient } from '@/src/lib/supabase';

const supabase = createBrowserClient();

// Subscribe to reaction changes for a specific post
const reactionChannel = supabase
  .channel(`post_reactions:${postId}`)
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'post_reactions',
      filter: `post_id=eq.${postId}`,
    },
    (payload) => {
      console.log('Reaction changed:', payload);
      
      if (payload.eventType === 'INSERT') {
        // New reaction added
        // Update reaction counts in UI
      } else if (payload.eventType === 'UPDATE') {
        // Reaction type changed
        // Update reaction counts in UI
      } else if (payload.eventType === 'DELETE') {
        // Reaction removed
        // Update reaction counts in UI
      }
    }
  )
  .subscribe();

// Cleanup when component unmounts
// reactionChannel.unsubscribe();
```

### 2. Post Comments - Real-Time Updates

```typescript
// Subscribe to new comments on a post
const commentChannel = supabase
  .channel(`post_comments:${postId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'post_comments',
      filter: `post_id=eq.${postId}`,
    },
    (payload) => {
      console.log('New comment:', payload.new);
      // Add new comment to UI
      // Update comment count
    }
  )
  .subscribe();
```

### 3. Connection Requests - Real-Time Notifications

```typescript
// Subscribe to connection requests for current user
const connectionRequestChannel = supabase
  .channel(`connection_requests:${userId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'connection_requests',
      filter: `recipient_id=eq.${userId}`,
    },
    (payload) => {
      console.log('New connection request:', payload.new);
      // Show notification badge
      // Update connection requests list
    }
  )
  .subscribe();
```

### 4. Feed Posts - Real-Time New Posts

```typescript
// Subscribe to new posts from connections (public posts)
const feedChannel = supabase
  .channel('posts:feed')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'posts',
      filter: 'visibility=eq.public',
    },
    async (payload) => {
      const newPost = payload.new;
      
      // Check if post is from a connection or should appear in feed
      // Add to top of feed if relevant
      console.log('New post in feed:', newPost);
    }
  )
  .subscribe();
```

---

## React Hook Example

```typescript
// hooks/usePostReactions.ts
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/src/lib/supabase';

export function usePostReactions(postId: string) {
  const [reactions, setReactions] = useState({
    support: 0,
    love: 0,
    fire: 0,
    congrats: 0,
    user_reaction: null as string | null,
  });
  const supabase = createBrowserClient();

  useEffect(() => {
    // Initial load
    loadReactions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`post_reactions:${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_reactions',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          // Reload reactions when any change occurs
          loadReactions();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [postId]);

  async function loadReactions() {
    // Fetch current reactions
    const { data } = await supabase
      .from('post_reactions')
      .select('reaction_type, user_id')
      .eq('post_id', postId);

    // Calculate counts
    const counts = { support: 0, love: 0, fire: 0, congrats: 0, user_reaction: null };
    // ... update counts logic
    setReactions(counts);
  }

  return reactions;
}
```

---

## Best Practices

1. **Unsubscribe on Cleanup**: Always unsubscribe from channels when components unmount
2. **Filter Appropriately**: Use filters to only receive relevant updates
3. **Handle Connection State**: Check if Supabase is connected before subscribing
4. **Error Handling**: Handle subscription errors gracefully
5. **Rate Limiting**: Be mindful of too many subscriptions (limit to active views)

---

## Performance Considerations

- **Limit Subscriptions**: Only subscribe to data currently visible on screen
- **Batch Updates**: Debounce rapid updates to avoid UI flicker
- **Connection Pooling**: Reuse channels when possible
- **Selective Updates**: Only update the specific part of UI that changed

---

## Testing

Test real-time subscriptions by:
1. Opening the app in two browser windows
2. Performing an action in one window (e.g., react to a post)
3. Verifying the update appears instantly in the other window

---

**Note:** Real-time subscriptions work automatically once enabled in Supabase. The examples above show how to implement them in your frontend code.

