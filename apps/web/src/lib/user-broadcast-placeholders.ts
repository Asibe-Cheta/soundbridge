import { displayNameFromEmail } from '@/src/lib/emails/waitlist-launch-email';
import type { UserBroadcastRecipientRow } from '@/src/lib/user-broadcast-recipients';

export const USER_BROADCAST_EMAIL_VARIABLES: ReadonlyArray<{ key: string; description: string }> = [
  { key: '{{name}}', description: 'Profile display name, or a friendly name from email if empty' },
  { key: '{{first_name}}', description: 'First word of {{name}}' },
  { key: '{{email}}', description: 'Recipient address (HTML-escaped)' },
  { key: '{{username}}', description: 'Profile @username if set' },
  { key: '{{site_url}}', description: 'Public site base URL' },
  {
    key: '{{signup_url}}',
    description: 'Web account signup URL (/signup on the public site)',
  },
  { key: '{{logo_url}}', description: 'Absolute URL to SoundBridge logo' },
  {
    key: '{{unsubscribe_href}}',
    description: 'mailto link for marketing opt-out (use in href)',
  },
  {
    key: '{{unsubscribe_link}}',
    description: 'Prebuilt Unsubscribe <a> snippet',
  },
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildUnsubscribeMailto(recipientEmail: string): string {
  return `mailto:contact@soundbridge.live?subject=${encodeURIComponent('Unsubscribe — SoundBridge updates')}&body=${encodeURIComponent(`Please stop marketing emails to: ${recipientEmail}`)}`;
}

export function substituteUserBroadcastPlaceholders(
  template: string,
  row: UserBroadcastRecipientRow,
  siteBaseUrl: string
): string {
  const base = siteBaseUrl.replace(/\/$/, '');
  const nameFromProfile = row.display_name?.trim();
  const name =
    nameFromProfile ||
    displayNameFromEmail(row.email) ||
    row.email.split('@')[0] ||
    'there';
  const firstName = name.split(/\s+/)[0] || name;
  const unsubMailto = buildUnsubscribeMailto(row.email);
  const unsubHref = unsubMailto.replace(/&/g, '&amp;');
  const logoUrl = `${base}/images/logo-trans-lockup.svg`;
  const signupUrl = `${base}/signup`;

  const map: Record<string, string> = {
    '{{unsubscribe_link}}': `<a href="${unsubHref}" style="color:#A3A3A3;text-decoration:underline;">Unsubscribe</a>`,
    '{{unsubscribe_href}}': unsubHref,
    '{{logo_url}}': escapeHtml(logoUrl),
    '{{site_url}}': escapeHtml(base),
    '{{signup_url}}': escapeHtml(signupUrl),
    '{{email}}': escapeHtml(row.email),
    '{{username}}': escapeHtml(row.username || ''),
    '{{first_name}}': escapeHtml(firstName),
    '{{name}}': escapeHtml(name),
  };

  let out = template;
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    out = out.split(key).join(map[key]);
  }
  return out;
}
