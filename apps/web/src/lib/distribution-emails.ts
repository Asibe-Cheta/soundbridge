import { SendGridService } from '@/src/lib/sendgrid-service';
import {
  MBG_PARTNER_EMAIL,
  SOUNDBRIDGE_DISTRIBUTION_FROM_EMAIL,
} from '@/src/lib/distribution-config';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type PartnerDistributionEmailParams = {
  requestId: string;
  trackTitle: string;
  artistName: string;
  featuredArtists: string | null;
  genre: string | null;
  isrcCode: string | null;
  explicitContent: boolean;
  requestedReleaseDate: string;
  creatorEmail: string;
  creatorId: string;
  amountPaid: number;
  audioDownloadUrl: string | null;
  coverDownloadUrl: string | null;
};

export async function sendPartnerDistributionEmail(
  params: PartnerDistributionEmailParams,
): Promise<boolean> {
  const featured = params.featuredArtists?.trim() || 'Not Applicable';
  const genre = params.genre?.trim() || 'Not specified';
  const isrc = params.isrcCode?.trim() || 'Not assigned';
  const explicit = params.explicitContent ? 'Yes' : 'No';
  const audioLink = params.audioDownloadUrl || '(Link unavailable — contact SoundBridge support)';
  const coverLink = params.coverDownloadUrl || '(Not provided)';

  const subject = `New Distribution Request from SoundBridge — ${params.trackTitle} by ${params.artistName}`;

  const html = `
<p>Hi MBG Sonics team,</p>
<p>A new distribution request has been submitted through SoundBridge.</p>
<h3>TRACK DETAILS</h3>
<ul>
  <li><strong>Track Title:</strong> ${escapeHtml(params.trackTitle)}</li>
  <li><strong>Artist Name:</strong> ${escapeHtml(params.artistName)}</li>
  <li><strong>Featured Artists:</strong> ${escapeHtml(featured)}</li>
  <li><strong>Genre:</strong> ${escapeHtml(genre)}</li>
  <li><strong>ISRC Code:</strong> ${escapeHtml(isrc)}</li>
  <li><strong>Explicit Content:</strong> ${explicit}</li>
  <li><strong>Requested Release Date:</strong> ${escapeHtml(params.requestedReleaseDate)}</li>
</ul>
<h3>CREATOR DETAILS</h3>
<ul>
  <li><strong>Creator Email:</strong> ${escapeHtml(params.creatorEmail)}</li>
  <li><strong>SoundBridge Creator ID:</strong> ${escapeHtml(params.creatorId)}</li>
</ul>
<h3>DISTRIBUTION FEE</h3>
<ul>
  <li><strong>Amount paid by creator:</strong> £${params.amountPaid.toFixed(2)}</li>
  <li><strong>SoundBridge reference:</strong> ${escapeHtml(params.requestId)}</li>
</ul>
<h3>TRACK DOWNLOAD</h3>
<p>Please download the track file using the secure link below. This link expires in 7 days:</p>
<p><a href="${escapeHtml(audioLink)}">${escapeHtml(audioLink)}</a></p>
<p><strong>Cover art download:</strong><br/>
<a href="${escapeHtml(coverLink)}">${escapeHtml(coverLink)}</a></p>
<p>Please confirm receipt of this request by replying to this email.</p>
<p>Thank you.</p>
<p>SoundBridge Live Ltd<br/>justice@soundbridge.live</p>
`.trim();

  return SendGridService.sendHtmlEmail(MBG_PARTNER_EMAIL, subject, html, {
    from: SOUNDBRIDGE_DISTRIBUTION_FROM_EMAIL,
    fromName: 'SoundBridge Distribution',
    replyTo: params.creatorEmail,
  });
}

export async function sendCreatorTrackLiveEmail(
  to: string,
  creatorName: string,
  trackTitle: string,
): Promise<boolean> {
  const subject = 'Your track is live on streaming platforms';
  const html = `
<p>Hi ${escapeHtml(creatorName)},</p>
<p>Great news. Your track <strong>${escapeHtml(trackTitle)}</strong> is now live on Spotify, Apple Music, Tidal, Amazon Music, YouTube Music and major streaming platforms worldwide.</p>
<p>Search for your track on your preferred platform to verify it is live.</p>
<p>Thank you for distributing through SoundBridge.</p>
<p>Justice Asibe<br/>Founder and CEO, SoundBridge Live Ltd</p>
`.trim();

  return SendGridService.sendHtmlEmail(to, subject, html, {
    from: SOUNDBRIDGE_DISTRIBUTION_FROM_EMAIL,
    fromName: 'SoundBridge',
  });
}

export async function sendCreatorDistributionRejectedEmail(
  to: string,
  creatorName: string,
  trackTitle: string,
  reason: string,
): Promise<boolean> {
  const subject = 'Your distribution request could not be processed';
  const html = `
<p>Hi ${escapeHtml(creatorName)},</p>
<p>Your distribution request for <strong>${escapeHtml(trackTitle)}</strong> could not be processed.</p>
<p>Your cover art did not meet platform requirements — ${escapeHtml(reason)}.</p>
<p>Please resubmit with compliant artwork. Your payment will be refunded within 5–10 business days.</p>
<p>If you have questions, reply to this email or contact support@soundbridge.live.</p>
<p>SoundBridge Live Ltd</p>
`.trim();

  return SendGridService.sendHtmlEmail(to, subject, html, {
    from: SOUNDBRIDGE_DISTRIBUTION_FROM_EMAIL,
    fromName: 'SoundBridge Distribution',
  });
}
