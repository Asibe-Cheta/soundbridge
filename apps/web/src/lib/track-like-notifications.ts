/**
 * Track like → in-app notification + Expo push (mobile: type like, trackId, soundbridge://track/<id>).
 * Preference: likes_on_posts (covers reactions on posts and likes on audio_tracks).
 */

import { createServiceClient } from './supabase';
import { sendExpoPushIfAllowed } from './notification-push-preferences';

function safeUuidForRelatedEntity(id: string | null | undefined): string | null {
  if (!id || typeof id !== 'string') return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null;
}

function deriveTrackType(row: { is_mixtape?: boolean | null; genre?: string | null }): string {
  if (row.is_mixtape) return 'mixtape';
  const g = String(row.genre || '').toLowerCase();
  if (g === 'podcast') return 'podcast';
  return 'track';
}

export async function notifyTrackLiked(params: {
  trackId: string;
  likerUserId: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  const { data: track, error: trackErr } = await supabase
    .from('audio_tracks')
    .select('id, title, creator_id, genre, is_mixtape')
    .eq('id', params.trackId)
    .maybeSingle();

  if (trackErr || !track) {
    console.warn('[notifyTrackLiked] track missing', trackErr?.message);
    return { success: false, error: 'track_not_found' };
  }

  const creatorId = track.creator_id as string;
  if (!creatorId || creatorId === params.likerUserId) {
    return { success: true };
  }

  const { data: liker } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', params.likerUserId)
    .maybeSingle();

  const likerName =
    (liker?.display_name && String(liker.display_name).trim()) ||
    liker?.username ||
    'Someone';
  const trackTitle = (track.title && String(track.title).trim()) || 'Untitled';
  const trackType = deriveTrackType(track as { is_mixtape?: boolean | null; genre?: string | null });

  const titleLine = `${likerName} liked your track`;
  const bodyQuoted = `"${trackTitle}"`;

  const pushData = {
    type: 'like' as const,
    trackId: track.id as string,
    entityId: track.id as string,
    title: titleLine,
    body: bodyQuoted,
  };

  const inboxData = {
    ...pushData,
    track_type: trackType,
    likerUserId: params.likerUserId,
  };

  const actionUrl = `/track/${track.id}`;

  const { error: notifError } = await supabase.from('notifications').insert({
    user_id: creatorId,
    type: 'like',
    title: titleLine,
    body: bodyQuoted,
    related_id: track.id,
    related_type: 'track',
    action_url: actionUrl,
    metadata: {
      track_type: trackType,
      trackId: track.id,
      likerUserId: params.likerUserId,
    },
    data: inboxData,
    read: false,
  });

  if (notifError) {
    console.error('[notifyTrackLiked] notifications insert:', notifError);
    return { success: false, error: notifError.message };
  }

  const { error: logError } = await supabase.from('notification_logs').insert({
    user_id: creatorId,
    notification_type: 'like',
    title: titleLine,
    body: bodyQuoted,
    data: {
      type: 'like',
      trackId: track.id,
      entityId: track.id,
      notification_type: 'like',
      track_type: trackType,
      likerUserId: params.likerUserId,
    },
    related_entity_type: 'track',
    related_entity_id: safeUuidForRelatedEntity(track.id as string),
    sent_at: new Date().toISOString(),
  });

  if (logError) {
    console.warn('[notifyTrackLiked] notification_logs (non-fatal):', logError.message);
  }

  try {
    await sendExpoPushIfAllowed(supabase, creatorId, 'likes_on_posts', {
      title: titleLine,
      body: bodyQuoted,
      data: pushData,
      channelId: 'social',
      priority: 'high',
    });
  } catch (e) {
    console.error('[notifyTrackLiked] push:', e);
  }

  return { success: true };
}
