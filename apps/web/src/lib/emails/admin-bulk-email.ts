/**
 * Admin bulk email — branded wrapper (logo + permanent founder footer).
 * Body is plain text with optional placeholders; converted to HTML paragraphs.
 */

import { displayNameFromEmail } from '@/src/lib/emails/waitlist-launch-email';

export const ADMIN_BULK_EMAIL_VARIABLES: ReadonlyArray<{ key: string; description: string }> = [
  { key: '{{first_name}}', description: 'First name derived from the recipient email address' },
  { key: '{{name}}', description: 'Friendly full name derived from the email address' },
  { key: '{{email}}', description: 'Recipient email (HTML-escaped)' },
  { key: '{{referral_link}}', description: 'Partner referral link when the recipient has a partners row' },
  { key: '{{username}}', description: 'Profile @username when the account exists' },
  { key: '{{site_url}}', description: 'Public site base URL' },
];

export interface AdminBulkEmailRecipient {
  email: string;
  first_name: string;
  name: string;
  username: string;
  referral_link: string;
  user_id?: string;
}

const FOUNDER_FOOTER = {
  name: 'Justice Asibe',
  title: 'Founder and CEO, SoundBridge Live Ltd',
  email: 'justice@soundbridge.live',
  site: 'soundbridge.live',
  siteUrl: 'https://soundbridge.live',
  linkedin: 'linkedin.com/in/justiceasibe',
  linkedinUrl: 'https://linkedin.com/in/justiceasibe',
} as const;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** First name taken only from the email address (not profile display name). */
export function firstNameFromEmailAddress(email: string): string {
  const friendly = displayNameFromEmail(email);
  return friendly.split(/\s+/)[0]?.trim() || friendly || 'there';
}

export function friendlyNameFromEmailAddress(email: string): string {
  return displayNameFromEmail(email) || email.split('@')[0] || 'there';
}

export function parseRecipientEmails(raw: string): string[] {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of raw.split(/[\n,;]+/)) {
    const email = line.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export function substituteAdminBulkEmailPlaceholders(
  template: string,
  row: AdminBulkEmailRecipient,
  siteBaseUrl: string
): string {
  const base = siteBaseUrl.replace(/\/$/, '');
  const map: Record<string, string> = {
    '{{referral_link}}': row.referral_link
      ? `<a href="${escapeHtml(row.referral_link)}" style="color:#F87171;text-decoration:underline;word-break:break-all;">${escapeHtml(row.referral_link)}</a>`
      : '',
    '{{site_url}}': escapeHtml(base),
    '{{email}}': escapeHtml(row.email),
    '{{username}}': escapeHtml(row.username || ''),
    '{{first_name}}': escapeHtml(row.first_name),
    '{{name}}': escapeHtml(row.name),
    '[Referral Link]': row.referral_link
      ? `<a href="${escapeHtml(row.referral_link)}" style="color:#F87171;text-decoration:underline;word-break:break-all;">${escapeHtml(row.referral_link)}</a>`
      : '[Referral Link]',
    '[First Name]': escapeHtml(row.first_name),
  };

  let out = template;
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    out = out.split(key).join(map[key]);
  }
  return out;
}

function plainTextToHtmlParagraphs(text: string): string {
  const blocks = text.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) return '';
  return blocks
    .map(
      (block) =>
        `<p style="margin:0 0 16px;color:#E5E5E5;font-size:16px;line-height:1.65;">${escapeHtml(block).replace(/\n/g, '<br/>')}</p>`
    )
    .join('');
}

export function wrapAdminBulkEmailHtml(bodyContent: string, siteBaseUrl: string): string {
  const base = siteBaseUrl.replace(/\/$/, '');
  const logoUrl = `${base}/images/logos/logo-trans-lockup.png`;
  const bodyHtml = plainTextToHtmlParagraphs(bodyContent);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>SoundBridge</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0A;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0A0A0A;">
  <tr>
    <td align="center" style="padding:28px 16px 32px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr>
          <td align="center" style="padding-bottom:28px;">
            <img src="${escapeHtml(logoUrl)}" alt="SoundBridge" width="220" style="display:block;max-width:220px;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;" />
          </td>
        </tr>
        <tr>
          <td style="color:#FFFFFF;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding-top:28px;color:#D4D4D4;font-size:16px;line-height:1.6;">
            <p style="margin:0 0 4px;color:#FFFFFF;font-weight:600;">${FOUNDER_FOOTER.name}</p>
            <p style="margin:0 0 12px;color:#A3A3A3;font-size:15px;">${FOUNDER_FOOTER.title}</p>
            <p style="margin:0 0 4px;"><a href="mailto:${FOUNDER_FOOTER.email}" style="color:#F87171;text-decoration:none;">${FOUNDER_FOOTER.email}</a></p>
            <p style="margin:0 0 4px;"><a href="${FOUNDER_FOOTER.siteUrl}" style="color:#A3A3A3;text-decoration:underline;">${FOUNDER_FOOTER.site}</a></p>
            <p style="margin:0;"><a href="${FOUNDER_FOOTER.linkedinUrl}" style="color:#A3A3A3;text-decoration:underline;">${FOUNDER_FOOTER.linkedin}</a></p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:32px;border-top:1px solid #262626;">
            <p style="margin:0;font-size:12px;line-height:1.5;color:#737373;text-align:center;">
              <a href="${escapeHtml(base)}" style="color:#A3A3A3;text-decoration:underline;">soundbridge.live</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function buildAdminBulkEmailForRecipient(
  subjectTemplate: string,
  bodyTemplate: string,
  row: AdminBulkEmailRecipient,
  siteBaseUrl: string
): { subject: string; html: string } {
  const subject = substituteAdminBulkEmailPlaceholders(subjectTemplate, row, siteBaseUrl);
  const bodyResolved = substituteAdminBulkEmailPlaceholders(bodyTemplate, row, siteBaseUrl);
  const html = wrapAdminBulkEmailHtml(bodyResolved, siteBaseUrl);
  return { subject, html };
}

/** Starter template for partner welcome emails (body only — footer is automatic). */
export const PARTNER_WELCOME_EMAIL_SUBJECT =
  'Welcome to SoundBridge — Your Premium Access is Live 🎉';

export const PARTNER_WELCOME_EMAIL_BODY = `Hi {{first_name}},

Welcome to SoundBridge. We are genuinely thrilled to have you here.

Your Premium access has been activated and you now have full access to everything the platform offers. We built SoundBridge for creators like you and we cannot wait to see what you do with it.

Here is your unique referral link:

{{referral_link}}

Every time someone joins SoundBridge through your link and subscribes to a paid plan you automatically earn 10% commission with no extra effort on your end. Share it with your fans, post it in your bio, put it everywhere.

To help you hit the ground running we have attached two short demo videos:

Demo Video 1 — How to get your fans onto SoundBridge and have them support you directly. This walks you through sharing your fan page link, using your referral link and converting your existing audience into active supporters on the platform.

Demo Video 2 — How to set up and get the most out of SoundBridge. This covers completing your profile, setting up your Service Provider Dashboard so you can be discovered and booked, using the Request Room to earn directly from your fans at live performances, and much more.

Please take some time to watch both videos and then start inviting your fans. We will be following up personally to make sure you are getting the most out of the platform and to support you every step of the way.

This is just the beginning. Let us grow together.`;
