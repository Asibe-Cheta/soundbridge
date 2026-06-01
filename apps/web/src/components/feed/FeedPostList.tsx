'use client';

import React, { useMemo } from 'react';

import { PostCard } from '@/src/components/posts/PostCard';
import { EventPostCard } from '@/src/components/feed/EventPostCard';
import { EventsStrip } from '@/src/components/feed/EventsStrip';
import type { FeedEventRecord } from '@/src/lib/event-feed';
import type { Post } from '@/src/lib/types/post';

type FeedItem =
  | { kind: 'post'; post: Post }
  | { kind: 'events_strip'; key: string };

type FeedPostListProps = {
  posts: Post[];
  stripEvents: FeedEventRecord[];
  showEventsStrip: boolean;
  onPostUpdate?: () => void;
  bookmarksMap: Map<string, boolean>;
};

function isEventPost(post: Post): post is Post & { event: NonNullable<Post['event']> } {
  return post.post_type === 'event' && Boolean(post.event_id) && Boolean(post.event);
}

export function FeedPostList({
  posts,
  stripEvents,
  showEventsStrip,
  onPostUpdate,
  bookmarksMap,
}: FeedPostListProps) {
  const items = useMemo(() => {
    const result: FeedItem[] = [];
    posts.forEach((post, index) => {
      result.push({ kind: 'post', post });
      if (showEventsStrip && (index + 1) % 8 === 0) {
        result.push({ kind: 'events_strip', key: `strip-after-${post.id}` });
      }
    });
    return result;
  }, [posts, showEventsStrip]);

  return (
    <div className="space-y-4">
      {items.map((item) => {
        if (item.kind === 'events_strip') {
          return <EventsStrip key={item.key} events={stripEvents} />;
        }

        const post = item.post;
        const bookmarked = bookmarksMap.get(post.id) ?? false;

        if (isEventPost(post)) {
          return (
            <EventPostCard
              key={post.id}
              post={post}
              event={post.event}
              onUpdate={onPostUpdate}
              initialBookmarkStatus={bookmarked}
            />
          );
        }

        return (
          <PostCard
            key={post.id}
            post={post}
            onUpdate={onPostUpdate}
            initialBookmarkStatus={bookmarked}
          />
        );
      })}
    </div>
  );
}
