'use client';

import React from 'react';
import { PostCard } from '@/src/components/posts/PostCard';
import { EventPostCard } from '@/src/components/feed/EventPostCard';
import { EventsStrip } from '@/src/components/feed/EventsStrip';
import { FeedCaughtUpMarker } from '@/src/components/feed/FeedCaughtUpMarker';
import type { FeedEventRecord } from '@/src/lib/event-feed';
import type { Post } from '@/src/lib/types/post';

export type FeedListItem =
  | { kind: 'post'; post: Post }
  | { kind: 'events_strip'; key: string }
  | { kind: 'caught_up_marker' };

type FeedPostListProps = {
  items: FeedListItem[];
  stripEvents: FeedEventRecord[];
  onPostUpdate?: () => void;
  onCaughtUpScrolledPast?: () => void;
  bookmarksMap: Map<string, boolean>;
};

function isEventPost(post: Post): post is Post & { event: NonNullable<Post['event']> } {
  return post.post_type === 'event' && Boolean(post.event_id) && Boolean(post.event);
}

export function buildFeedListItems(
  newPosts: Post[],
  olderPosts: Post[],
  showEventsStrip: boolean,
): FeedListItem[] {
  const result: FeedListItem[] = [];
  let postIndex = 0;

  const appendPosts = (bucket: Post[]) => {
    for (const post of bucket) {
      result.push({ kind: 'post', post });
      postIndex += 1;
      if (showEventsStrip && postIndex % 8 === 0) {
        result.push({ kind: 'events_strip', key: `strip-after-${post.id}` });
      }
    }
  };

  appendPosts(newPosts);
  result.push({ kind: 'caught_up_marker' });
  appendPosts(olderPosts);

  return result;
}

export function FeedPostList({
  items,
  stripEvents,
  onPostUpdate,
  onCaughtUpScrolledPast,
  bookmarksMap,
}: FeedPostListProps) {
  return (
    <div className="space-y-4">
      {items.map((item) => {
        if (item.kind === 'caught_up_marker') {
          return (
            <FeedCaughtUpMarker
              key="caught-up-marker"
              onScrolledPast={() => onCaughtUpScrolledPast?.()}
            />
          );
        }

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
