'use client';

import React from 'react';

import { PostCard } from '@/src/components/posts/PostCard';
import { EventPostBody } from '@/src/components/feed/EventPostBody';
import type { FeedEvent, Post } from '@/src/lib/types/post';

type EventPostCardProps = {
  post: Post;
  event: FeedEvent;
  onUpdate?: () => void;
  initialBookmarkStatus?: boolean;
};

export function EventPostCard({
  post,
  event,
  onUpdate,
  initialBookmarkStatus = false,
}: EventPostCardProps) {
  return (
    <PostCard
      post={post}
      onUpdate={onUpdate}
      initialBookmarkStatus={initialBookmarkStatus}
      hideDefaultHeader
      outerClassName="bg-white/5 backdrop-blur-lg border border-white/10 mb-4 rounded-none overflow-hidden p-0 md:p-0 hover:border-white/20 transition-all"
      bodyRenderer={() => (
        <EventPostBody event={event} author={post.author} description={post.content} />
      )}
    />
  );
}
