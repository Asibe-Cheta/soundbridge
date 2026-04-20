/**
 * Waitlist launch announcement — HTML for SendGrid (mobile-first, dark theme).
 * Personalize with displayName + recipientEmail (unsubscribe mailto).
 */

import { IOS_APP_STORE_URL } from '@/src/lib/app-store-url';

export function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0]?.replace(/[._+-]+/g, ' ').trim() || '';
  if (!local) return 'there';
  const words = local.split(/\s+/).filter(Boolean);
  const titled = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  return titled || 'there';
}

/** First word of friendly display name — used in subject line. */
export function firstNameFromEmailForSubject(email: string): string {
  const display = displayNameFromEmail(email);
  const raw = display.split(/\s+/)[0]?.trim() || display;
  return raw || 'there';
}

/** Per-recipient subject (mobile team: conversational vs pure announcement). */
export function buildWaitlistLaunchEmailSubject(recipientEmail: string): string {
  const first = firstNameFromEmailForSubject(recipientEmail);
  return `Hey ${first}, SoundBridge is live`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildWaitlistLaunchEmailHtml(
  displayName: string,
  recipientEmail: string,
  siteBaseUrl: string
): string {
  const name = escapeHtml(displayName);
  const baseNoSlash = siteBaseUrl.replace(/\/$/, '');
  const logoUrl = `${baseNoSlash}/images/logo-trans-lockup.svg`;
  const unsubMailto = `mailto:contact@soundbridge.live?subject=${encodeURIComponent('Unsubscribe — SoundBridge waitlist')}&body=${encodeURIComponent(`Please remove this email from the waitlist: ${recipientEmail}`)}`;
  const unsubHref = unsubMailto.replace(/&/g, '&amp;');

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
            <img src="${escapeHtml(logoUrl)}" alt="SoundBridge" width="200" height="auto" style="display:block;max-width:220px;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;" />
          </td>
        </tr>
        <tr>
          <td style="color:#FFFFFF;font-size:17px;line-height:1.55;">
            <p style="margin:0 0 20px;">Hey ${name},</p>
            <p style="margin:0 0 20px;">You've been on the waitlist for a while — thank you for that. The app is <strong>live</strong> and we wanted you to be among the first to know.</p>
            <p style="margin:0 0 20px;">We're a small team and we've been building this carefully. Sign in with the same email you used on the waitlist and you're straight in.</p>
            <p style="margin:0 0 12px;font-weight:600;">Here's what's waiting for you:</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
              <tr><td style="color:#E5E5E5;font-size:16px;line-height:1.6;padding:6px 0 6px 0;">• Upload and sell your music directly to fans</td></tr>
              <tr><td style="color:#E5E5E5;font-size:16px;line-height:1.6;padding:6px 0 6px 0;">• Creator profiles with tracks, albums, and drops</td></tr>
              <tr><td style="color:#E5E5E5;font-size:16px;line-height:1.6;padding:6px 0 6px 0;">• Live audio sessions with tipping</td></tr>
              <tr><td style="color:#E5E5E5;font-size:16px;line-height:1.6;padding:6px 0 6px 0;">• Connect and collaborate with other musicians</td></tr>
              <tr><td style="color:#E5E5E5;font-size:16px;line-height:1.6;padding:6px 0 6px 0;">• Messages, events, opportunities and more</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:8px 0 24px;">
            <a href="${escapeHtml(IOS_APP_STORE_URL)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#991B1B;color:#FFFFFF !important;text-decoration:none;font-weight:600;font-size:17px;line-height:1.2;padding:16px 36px;border-radius:10px;min-width:240px;text-align:center;border:1px solid #B91C1C;">Download on the App Store</a>
          </td>
        </tr>
        <tr>
          <td style="color:#D4D4D4;font-size:16px;line-height:1.55;">
            <p style="margin:0 0 20px;">If you have any questions just reply to this email — it reaches us directly.</p>
          </td>
        </tr>
        <tr>
          <td style="color:#A3A3A3;font-size:16px;line-height:1.55;padding-top:8px;">
            <p style="margin:0;">— Justice, SoundBridge</p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:40px;border-top:1px solid #262626;">
            <p style="margin:0;font-size:12px;line-height:1.5;color:#737373;text-align:center;">
              <a href="${unsubHref}" style="color:#A3A3A3;text-decoration:underline;">Unsubscribe</a>
              &nbsp;·&nbsp;
              <a href="${escapeHtml(baseNoSlash)}" style="color:#A3A3A3;text-decoration:underline;">soundbridge.live</a>
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
