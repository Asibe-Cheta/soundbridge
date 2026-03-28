/**
 * Post Notification Helpers
 * 
 * Helper functions to create notifications for post-related activities
 * (reactions, comments, connection requests)
 */

import { createServiceClient } from './supabase';

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
}

function relatedTypeForNotification(
  type: CreatePostNotificationParams['type']
): string | null {
  if (['post_reaction', 'post_comment', 'comment_reply', 'repost'].includes(type)) return 'post';
  if (type === 'new_follower' || type === 'follow') return 'user';
  if (type === 'connection_request' || type === 'connection_accepted') return 'connection';
  return null;
}

/**
 * Persist to `notifications` (mobile in-app inbox + web bell) and best-effort `notification_logs`.
 * Always writes `notifications` first — mobile reads this table; previously we only wrote here when notification_logs failed.
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

    return { success: true, data: inboxRow };
  } catch (error: any) {
    console.error('❌ Unexpected error creating notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify post author when someone reacts to their post
 */
/**
 * New follower — same row shape as push (`new_follower`) for mobile inbox.
 */
export async function notifyNewFollower(
  followedUserId: string,
  followerId: string,
  followerDisplayName: string,
  followerUsername: string | null
) {
  const atLabel = followerUsername ? `@${followerUsername}` : followerDisplayName;
  return createPostNotification({
    userId: followedUserId,
    type: 'new_follower',
    title: 'New follower',
    message: `${atLabel} started following you`,
    relatedId: followerId,
    actionUrl: `/user/${followerId}`,
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
  reactionType: string
) {
  // Don't notify if user reacted to their own post
  // (This check should be done in the API endpoint before calling this)

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
  commentId: string
) {
  return createPostNotification({
    userId: postAuthorId,
    type: 'post_comment',
    title: 'New Comment',
    message: `${commenterName} commented on your post`,
    relatedId: commentId,
    actionUrl: `/posts/${postId}`,
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
  replyId: string
) {
  return createPostNotification({
    userId: commentAuthorId,
    type: 'comment_reply',
    title: 'New Reply',
    message: `${replierName} replied to your comment`,
    relatedId: replyId,
    actionUrl: `/posts/${postId}`,
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
  requestId: string
) {
  return createPostNotification({
    userId: recipientId,
    type: 'connection_request',
    title: 'New Connection Request',
    message: `${requesterName} wants to connect with you`,
    relatedId: requestId,
    actionUrl: '/network',
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
  connectionId: string
) {
  return createPostNotification({
    userId: requesterId,
    type: 'connection_accepted',
    title: 'Connection Accepted',
    message: `${accepterName} accepted your connection request`,
    relatedId: connectionId,
    actionUrl: '/network',
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
  repostId: string
) {
  // Don't notify if user reposted their own post
  // (This check should be done in the API endpoint before calling this)

  return createPostNotification({
    userId: postAuthorId,
    type: 'repost',
    title: 'New Repost',
    message: `${reposterName} reposted your post`,
    relatedId: postId,
    actionUrl: `/post/${postId}`,
    metadata: {
      post_id: postId,
      repost_id: repostId,
    },
  });
}

