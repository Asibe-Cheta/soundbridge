import { displayNameFromEmail } from '@/src/lib/emails/waitlist-launch-email';
import type { WaitlistRecipientRow } from '@/src/lib/waitlist-broadcast-recipients';

/** Documented variables for admin UI and custom HTML emails */
export const WAITLIST_EMAIL_VARIABLES: ReadonlyArray<{ key: string; description: string }> = [
  { key: '{{name}}', description: 'Friendly name derived from email (e.g. jane.doe → Jane Doe)' },
  { key: '{{first_name}}', description: 'First word of {{name}}' },
  { key: '{{email}}', description: 'Recipient address (HTML-escaped in body)' },
  { key: '{{role}}', description: 'Waitlist role if captured' },
  { key: '{{city}}', description: 'City if captured' },
  { key: '{{state}}', description: 'State/region if captured' },
  { key: '{{country}}', description: 'Country if captured' },
  { key: '{{referral_source}}', description: 'Referral source if captured' },
  { key: '{{site_url}}', description: 'Public site base URL (no trailing slash)' },
  { key: '{{logo_url}}', description: 'Absolute URL to SoundBridge logo SVG' },
  {
    key: '{{unsubscribe_href}}',
    description: 'Use inside href="..." on your own <a> tag (mailto to contact@)',
  },
  {
    key: '{{unsubscribe_link}}',
    description: 'Prebuilt Unsubscribe <a> (HTML snippet)',
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
  return `mailto:contact@soundbridge.live?subject=${encodeURIComponent('Unsubscribe — SoundBridge waitlist')}&body=${encodeURIComponent(`Please remove this email from the waitlist: ${recipientEmail}`)}`;
}

/**
 * Replace waitlist template variables. Use in subject and HTML body.
 * Unknown {{tokens}} are left unchanged.
 */
export function substituteWaitlistPlaceholders(
  template: string,
  row: WaitlistRecipientRow,
  siteBaseUrl: string
): string {
  const base = siteBaseUrl.replace(/\/$/, '');
  const name = displayNameFromEmail(row.email);
  const firstName = name.split(/\s+/)[0] || name;
  const unsubMailto = buildUnsubscribeMailto(row.email);
  const unsubHref = unsubMailto.replace(/&/g, '&amp;');
  const logoUrl = `${base}/images/logo-trans-lockup.svg`;

  const map: Record<string, string> = {
    '{{unsubscribe_link}}': `<a href="${unsubHref}" style="color:#A3A3A3;text-decoration:underline;">Unsubscribe</a>`,
    '{{unsubscribe_href}}': unsubHref,
    '{{referral_source}}': escapeHtml(row.referral_source || ''),
    '{{country}}': escapeHtml(row.country || ''),
    '{{state}}': escapeHtml(row.state || ''),
    '{{first_name}}': escapeHtml(firstName),
    '{{city}}': escapeHtml(row.city || ''),
    '{{role}}': escapeHtml(row.role || ''),
    '{{logo_url}}': escapeHtml(logoUrl),
    '{{site_url}}': escapeHtml(base),
    '{{email}}': escapeHtml(row.email),
    '{{name}}': escapeHtml(name),
  };

  let out = template;
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    out = out.split(key).join(map[key]);
  }
  return out;
}
