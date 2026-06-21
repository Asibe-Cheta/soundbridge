import type { SupabaseClient } from '@supabase/supabase-js';
import {
  sendCreatorTrackLiveEmail,
  sendPartnerDistributionEmail,
  sendCreatorDistributionRejectedEmail as sendCreatorRejectedEmail,
} from '@/src/lib/distribution-emails';
import {
  createDistributionAudioSignedUrl,
  createDistributionCoverSignedUrl,
} from '@/src/lib/distribution-signed-urls';
import { DISTRIBUTION_FEE_GBP } from '@/src/lib/distribution-config';

export async function sendPartnerDistributionEmailForRequest(
  service: SupabaseClient,
  requestId: string,
  reviewedBy?: string,
): Promise<boolean> {
  const { data: row, error } = await service
    .from('distribution_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (error || !row) {
    console.error('[distribution-email] request not found:', requestId, error?.message);
    return false;
  }

  if (row.partner_email_status === 'sent' || row.email_sent_to_partner) {
    return true;
  }

  if (row.partner_email_status === 'rejected') {
    console.error('[distribution-email] request rejected, not sending:', requestId);
    return false;
  }

  const { data: track } = await service
    .from('audio_tracks')
    .select('file_url, cover_art_url')
    .eq('id', row.track_id)
    .maybeSingle();

  const coverSource =
    (row.distribution_cover_art_url as string | null) ||
    (track?.cover_art_url as string | null) ||
    null;

  const [audioDownloadUrl, coverDownloadUrl] = await Promise.all([
    createDistributionAudioSignedUrl((track?.file_url as string | null) ?? null),
    createDistributionCoverSignedUrl(coverSource),
  ]);

  const sent = await sendPartnerDistributionEmail({
    requestId: row.id as string,
    trackTitle: String(row.track_title),
    artistName: String(row.artist_name),
    featuredArtists: (row.featured_artists as string | null) ?? null,
    genre: (row.genre as string | null) ?? null,
    isrcCode: (row.isrc_code as string | null) ?? null,
    explicitContent: Boolean(row.explicit_content),
    requestedReleaseDate: String(row.requested_release_date),
    creatorEmail: String(row.creator_email),
    creatorId: String(row.creator_id),
    amountPaid: Number(row.amount_paid) || DISTRIBUTION_FEE_GBP,
    audioDownloadUrl,
    coverDownloadUrl,
  });

  if (sent) {
    const now = new Date().toISOString();
    await service
      .from('distribution_requests')
      .update({
        email_sent_to_partner: true,
        email_sent_at: now,
        partner_email_status: 'sent',
        reviewed_at: now,
        ...(reviewedBy ? { reviewed_by: reviewedBy } : {}),
      })
      .eq('id', requestId);
  }

  return sent;
}

export async function sendCreatorDistributionRejectedEmailForRequest(
  service: SupabaseClient,
  requestId: string,
  reason: string,
): Promise<boolean> {
  const { data: row, error } = await service
    .from('distribution_requests')
    .select('id, track_title, creator_email, creator_id')
    .eq('id', requestId)
    .maybeSingle();

  if (error || !row) {
    console.error('[distribution-email] reject request not found:', requestId, error?.message);
    return false;
  }

  const { data: profile } = await service
    .from('profiles')
    .select('display_name, username')
    .eq('id', row.creator_id)
    .maybeSingle();

  const creatorName =
    (profile?.display_name as string | null)?.trim() ||
    (profile?.username as string | null)?.trim() ||
    'Creator';

  return sendCreatorRejectedEmail(
    String(row.creator_email),
    creatorName,
    String(row.track_title),
    reason,
  );
}

export async function sendCreatorLiveEmailForRequest(
  service: SupabaseClient,
  requestId: string,
): Promise<boolean> {
  const { data: row, error } = await service
    .from('distribution_requests')
    .select('id, track_title, creator_email, creator_id, creator_live_email_sent')
    .eq('id', requestId)
    .maybeSingle();

  if (error || !row) {
    console.error('[distribution-email] live request not found:', requestId, error?.message);
    return false;
  }

  if (row.creator_live_email_sent) {
    return true;
  }

  const { data: profile } = await service
    .from('profiles')
    .select('display_name, username')
    .eq('id', row.creator_id)
    .maybeSingle();

  const creatorName =
    (profile?.display_name as string | null)?.trim() ||
    (profile?.username as string | null)?.trim() ||
    'Creator';

  const sent = await sendCreatorTrackLiveEmail(
    String(row.creator_email),
    creatorName,
    String(row.track_title),
  );

  if (sent) {
    await service
      .from('distribution_requests')
      .update({
        creator_live_email_sent: true,
        creator_live_email_sent_at: new Date().toISOString(),
      })
      .eq('id', requestId);
  }

  return sent;
}
