/**
 * Push notifications scoped to community_memberships (not follows).
 */

import { createServiceClient } from '@/src/lib/supabase';
import { sendExpoPush } from '@/src/lib/push-notifications';

async function getCommunityMemberIds(creatorId: string): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('community_memberships')
    .select('user_id')
    .eq('creator_id', creatorId);

  if (error) {
    console.error('[community-notifications] member lookup failed:', error.message);
    return [];
  }

  return (data ?? []).map((row) => String(row.user_id)).filter(Boolean);
}

type CommunityPushParams = {
  creatorId: string;
  title: string;
  body: string;
  notificationType: 'creator_post' | 'creator_goal';
  relatedId?: string;
  actionUrl?: string;
};

async function notifyCommunityMembers(params: CommunityPushParams): Promise<number> {
  const memberIds = await getCommunityMemberIds(params.creatorId);
  if (memberIds.length === 0) return 0;

  const supabase = createServiceClient();
  const { data: creator } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', params.creatorId)
    .maybeSingle();

  const creatorName = creator?.display_name || creator?.username || 'A creator';
  let sent = 0;

  for (const userId of memberIds) {
    if (userId === params.creatorId) continue;

    const pushData: Record<string, unknown> = {
      type: params.notificationType,
      creatorId: params.creatorId,
      username: creator?.username ?? '',
      ...(params.relatedId ? { postId: params.relatedId, entityId: params.relatedId } : {}),
    };

    const { error: insertErr } = await supabase.from('notifications').insert({
      user_id: userId,
      type: params.notificationType,
      title: params.title,
      body: params.body,
      related_id: params.relatedId ?? null,
      related_type: params.relatedId ? 'post' : null,
      action_url: params.actionUrl ?? null,
      metadata: { creatorId: params.creatorId, creatorName },
      data: pushData,
      read: false,
    });

    if (insertErr) {
      console.error('[community-notifications] insert failed:', insertErr.message);
      continue;
    }

    const ok = await sendExpoPush(supabase, userId, {
      title: params.title,
      body: params.body,
      data: pushData,
      channelId: 'social',
      priority: 'high',
    });

    if (ok) sent += 1;
  }

  return sent;
}

/** Community announcement posts (is_community_update = true). */
export async function notifyCommunityMembersOfPost(
  creatorId: string,
  postId: string,
  preview: string,
): Promise<number> {
  const supabase = createServiceClient();
  const { data: creator } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', creatorId)
    .maybeSingle();

  const name = creator?.display_name || creator?.username || 'A creator';
  const snippet = preview.trim().slice(0, 120) || 'New community update';

  return notifyCommunityMembers({
    creatorId,
    title: `${name} shared a community update`,
    body: snippet,
    notificationType: 'creator_post',
    relatedId: postId,
    actionUrl: `/post/${postId}`,
  });
}

/** Creator goal launches — community members only. Call when goals ship on web/mobile. */
export async function notifyCommunityMembersOfGoalLaunch(
  creatorId: string,
  goalTitle: string,
  goalId?: string,
): Promise<number> {
  const supabase = createServiceClient();
  const { data: creator } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', creatorId)
    .maybeSingle();

  const name = creator?.display_name || creator?.username || 'A creator';

  return notifyCommunityMembers({
    creatorId,
    title: `${name} launched a new goal`,
    body: goalTitle.trim() || 'Check out their latest community goal.',
    notificationType: 'creator_goal',
    relatedId: goalId,
  });
}
