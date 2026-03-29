/**
 * Post Notification Helpers
 *
 * Helper functions to create notifications for post-related activities
 * (reactions, comments, connection requests). Persists to `notifications` then
 * sends instant Expo push (priority high, correct channelId) — WEB_TEAM_PUSH_NOTIFICATION_INSTANT.md
 */

import { createServiceClient } from './supabase';
import {
  sendExpoPushIfAllowed,
  type PushPreferenceKind,
} from '@/src/lib/notification-push-preferences';

interface CreatePostNotificationParams {
  userId: string;
  type:
    | 'post_reaction'
    | 'post_comment'
    | 'comment_reply'
    | 'connection_request'
    | 'connection_accepted'
    | 'repost'
    | 'new_follower'
    | 'follow';
  title: string;
  message: string;
  relatedId?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  /** Actor user id for Expo `data.creatorId` (and preference checks). */
  actorUserId?: string;
  actorUsername?: string | null;
  /** Optional overrides for push only; inbox still uses title/message. */
  pushTitle?: string;
  pushBody?: string;
}

function relatedTypeForNotification(
  type: CreatePostNotificationParams['type']
): string | null {
  if (['post_reaction', 'post_comment', 'comment_reply', 'repost'].includes(type)) return 'post';
  if (type === 'new_follower' || type === 'follow') return 'user';
  if (type === 'connection_request' || type === 'connection_accepted') return 'connection';
  return null;
}

function pushKindForType(
  type: CreatePostNotificationParams['type']
): PushPreferenceKind | null {
  switch (type) {
    case 'post_reaction':
    case 'repost':
      return 'likes_on_posts';
    case 'post_comment':
    case 'comment_reply':
      return 'comments_on_posts';
    case 'new_follower':
    case 'follow':
      return 'new_followers';
    case 'connection_request':
    case 'connection_accepted':
      return 'collaboration';
    default:
      return null;
  }
}

function channelIdForType(
  type: CreatePostNotificationParams['type']
): 'social' | 'collaboration' {
  if (type === 'connection_request' || type === 'connection_accepted') return 'collaboration';
  return 'social';
}

function buildMobilePushData(
  params: CreatePostNotificationParams
): Record<string, unknown> & { type: string } {
  const m = params.metadata ?? {};
  const creatorId = params.actorUserId ?? '';
  const username = params.actorUsername ?? '';
  const postId = (m.postId ?? m.post_id) as string | undefined;

  switch (params.type) {
    case 'post_comment':
      return {
        type: 'comment',
        entityId: params.relatedId ?? '',
        entityType: 'comment',
        creatorId,
        username,
        ...(postId ? { postId } : {}),
      };
    case 'comment_reply':
      return {
        type: 'comment',
        entityId: params.relatedId ?? '',
        entityType: 'comment',
        creatorId,
        username,
        ...(postId ? { postId } : {}),
        ...(m.commentId || m.comment_id
          ? { parentCommentId: m.commentId ?? m.comment_id }
          : {}),
      };
    case 'post_reaction':
      return {
        type: 'reaction',
        entityId: params.relatedId ?? '',
        entityType: 'post',
        creatorId,
        username,
        reactionType: m.reaction_type ?? m.reactionType,
      };
    case 'new_follower':
    case 'follow':
      return {
        type: 'new_follower',
        entityId: params.relatedId ?? '',
        entityType: 'user',
        creatorId,
        username,
        followerId: m.followerId ?? params.relatedId,
      };
    case 'repost':
      return {
        type: 'repost',
        entityId: params.relatedId ?? '',
        entityType: 'post',
        creatorId,
        username,
        ...(m.repost_id ? { repostId: m.repost_id } : {}),
      };
    case 'connection_request':
      return {
        type: 'connection_request',
        entityId: params.relatedId ?? '',
        entityType: 'connection_request',
        creatorId,
        username,
        requesterId: params.actorUserId,
      };
    case 'connection_accepted':
      return {
        type: 'connection_accepted',
        entityId: params.relatedId ?? '',
        entityType: 'connection',
        creatorId,
        username,
        ...(params.actorUserId ? { userId: params.actorUserId } : {}),
      };
    default:
      return { type: params.type, creatorId, username };
  }
}

function sendInstantPush(
  supabase: ReturnType<typeof createServiceClient>,
  params: CreatePostNotificationParams
): void {
  const kind = pushKindForType(params.type);
  if (!kind) return;

  if (params.actorUserId && params.userId === params.actorUserId) return;

  const title = params.pushTitle ?? params.title;
  const body = params.pushBody ?? params.message;
  const data = buildMobilePushData(params);
  const channelId = channelIdForType(params.type);

  void sendExpoPushIfAllowed(supabase, params.userId, kind, {
    title,
    body,
    data,
    channelId,
    priority: 'high',
  }).catch((err) => {
    console.error('[createPostNotification] instant push:', err);
  });
}

/**
 * Persist to `notifications` (mobile in-app inbox + web bell) and best-effort `notification_logs`.
 * Then sends Expo push immediately (non-blocking) when preferences allow.
 */
export async function createPostNotification(params: CreatePostNotificationParams) {
  try {
    const supabase = createServiceClient();
    const dataPayload: Record<string, unknown> = {
      ...(params.metadata ?? {}),
      action_url: params.actionUrl ?? null,
      notification_type: params.type,
    };

    const { data: inboxRow, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        body: params.message,
        related_id: params.relatedId ?? null,
        related_type: relatedTypeForNotification(params.type),
        action_url: params.actionUrl ?? null,
        metadata: params.metadata ?? null,
        data: dataPayload,
        read: false,
      })
      .select()
      .single();

    if (notifError) {
      console.error('[createPostNotification] notifications insert:', notifError);
      return { success: false, error: notifError.message };
    }

    const { error: logError } = await supabase.from('notification_logs').insert({
      user_id: params.userId,
      notification_type: params.type,
      title: params.title,
      message: params.message,
      related_id: params.relatedId || null,
      action_url: params.actionUrl || null,
      metadata: params.metadata || null,
      sent_at: new Date().toISOString(),
    });

    if (logError) {
      console.warn('[createPostNotification] notification_logs (non-fatal):', logError.message);
    }

    sendInstantPush(supabase, params);

    return { success: true, data: inboxRow };
  } catch (error: any) {
    console.error('❌ Unexpected error creating notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * New follower — same row shape as push (`new_follower`) for mobile inbox.
 */
export async function notifyNewFollower(
  followedUserId: string,
  followerId: string,
  followerDisplayName: string,
  followerUsername: string | null,
  opts?: { pushTitle?: string; pushBody?: string }
) {
  const atLabel = followerUsername ? `@${followerUsername}` : followerDisplayName;
  return createPostNotification({
    userId: followedUserId,
    type: 'new_follower',
    title: 'New follower',
    message: `${atLabel} started following you`,
    relatedId: followerId,
    actionUrl: `/user/${followerId}`,
    actorUserId: followerId,
    actorUsername: followerUsername,
    pushTitle: opts?.pushTitle,
    pushBody: opts?.pushBody,
    metadata: {
      followerId,
      type: 'new_follower',
    },
  });
}

export async function notifyPostReaction(
  postAuthorId: string,
  reactorName: string,
  postId: string,
  reactionType: string,
  opts: {
    actorUserId: string;
    actorUsername?: string | null;
    pushTitle?: string;
    pushBody?: string;
  }
) {
  const reactionEmoji: Record<string, string> = {
    support: '👍',
    love: '❤️',
    fire: '🔥',
    congrats: '🎉',
  };

  return createPostNotification({
    userId: postAuthorId,
    type: 'post_reaction',
    title: 'New Reaction',
    message: `${reactorName} reacted ${reactionEmoji[reactionType] || '👍'} to your post`,
    relatedId: postId,
    actionUrl: `/posts/${postId}`,
    actorUserId: opts.actorUserId,
    actorUsername: opts.actorUsername ?? null,
    pushTitle: opts.pushTitle,
    pushBody: opts.pushBody,
    metadata: {
      post_id: postId,
      postId,
      reaction_type: reactionType,
      type: 'reaction',
    },
  });
}

/**
 * Notify post author when someone comments on their post
 */
export async function notifyPostComment(
  postAuthorId: string,
  commenterName: string,
  postId: string,
  commentId: string,
  opts: {
    actorUserId: string;
    actorUsername?: string | null;
    pushTitle?: string;
    pushBody?: string;
  }
) {
  return createPostNotification({
    userId: postAuthorId,
    type: 'post_comment',
    title: 'New Comment',
    message: `${commenterName} commented on your post`,
    relatedId: commentId,
    actionUrl: `/posts/${postId}`,
    actorUserId: opts.actorUserId,
    actorUsername: opts.actorUsername ?? null,
    pushTitle: opts.pushTitle,
    pushBody: opts.pushBody,
    metadata: {
      post_id: postId,
      postId,
      comment_id: commentId,
      commentId,
      type: 'comment',
    },
  });
}

/**
 * Notify comment author when someone replies to their comment
 */
export async function notifyCommentReply(
  commentAuthorId: string,
  replierName: string,
  postId: string,
  commentId: string,
  replyId: string,
  opts: {
    actorUserId: string;
    actorUsername?: string | null;
    pushTitle?: string;
    pushBody?: string;
  }
) {
  return createPostNotification({
    userId: commentAuthorId,
    type: 'comment_reply',
    title: 'New Reply',
    message: `${replierName} replied to your comment`,
    relatedId: replyId,
    actionUrl: `/posts/${postId}`,
    actorUserId: opts.actorUserId,
    actorUsername: opts.actorUsername ?? null,
    pushTitle: opts.pushTitle,
    pushBody: opts.pushBody,
    metadata: {
      post_id: postId,
      postId,
      comment_id: commentId,
      commentId,
      reply_id: replyId,
      replyId,
      type: 'comment',
    },
  });
}

/**
 * Notify recipient when they receive a connection request
 */
export async function notifyConnectionRequest(
  recipientId: string,
  requesterName: string,
  requestId: string,
  requesterUserId: string,
  requesterUsername?: string | null,
  opts?: { pushTitle?: string; pushBody?: string }
) {
  return createPostNotification({
    userId: recipientId,
    type: 'connection_request',
    title: 'New Connection Request',
    message: `${requesterName} wants to connect with you`,
    relatedId: requestId,
    actionUrl: '/network',
    actorUserId: requesterUserId,
    actorUsername: requesterUsername ?? null,
    pushTitle: opts?.pushTitle,
    pushBody: opts?.pushBody,
    metadata: {
      request_id: requestId,
    },
  });
}

/**
 * Notify requester when their connection request is accepted
 */
export async function notifyConnectionAccepted(
  requesterId: string,
  accepterName: string,
  connectionId: string,
  accepterUserId: string,
  accepterUsername?: string | null,
  opts?: { pushTitle?: string; pushBody?: string }
) {
  return createPostNotification({
    userId: requesterId,
    type: 'connection_accepted',
    title: 'Connection Accepted',
    message: `${accepterName} accepted your connection request`,
    relatedId: connectionId,
    actionUrl: '/network',
    actorUserId: accepterUserId,
    actorUsername: accepterUsername ?? null,
    pushTitle: opts?.pushTitle,
    pushBody: opts?.pushBody,
    metadata: {
      connection_id: connectionId,
    },
  });
}

/**
 * Notify post author when someone reposts their post
 */
export async function notifyPostRepost(
  postAuthorId: string,
  reposterName: string,
  postId: string,
  repostId: string,
  opts: {
    actorUserId: string;
    actorUsername?: string | null;
    pushTitle?: string;
    pushBody?: string;
  }
) {
  return createPostNotification({
    userId: postAuthorId,
    type: 'repost',
    title: 'New Repost',
    message: `${reposterName} reposted your post`,
    relatedId: postId,
    actionUrl: `/post/${postId}`,
    actorUserId: opts.actorUserId,
    actorUsername: opts.actorUsername ?? null,
    pushTitle: opts.pushTitle,
    pushBody: opts.pushBody,
    metadata: {
      post_id: postId,
      repost_id: repostId,
    },
  });
}
