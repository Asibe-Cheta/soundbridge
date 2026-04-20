/**
 * Recommended HTML for admin → Custom HTML email (waitlist send-custom).
 * Uses {{app_store_url}} for the main CTA (iOS); web signup is {{signup_url}} if needed.
 */
export const WAITLIST_CUSTOM_LIVE_HTML_EXAMPLE = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0B1020;color:#E5E7EB;font-family:Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#111827;border:1px solid #1F2937;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px 28px;">
                <p style="margin:0 0 10px 0;font-size:14px;color:#9CA3AF;">SoundBridge</p>
                <h1 style="margin:0 0 14px 0;font-size:28px;line-height:1.2;color:#FFFFFF;">You're in, {{first_name}} 🎉</h1>
                <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#D1D5DB;">
                  Thanks for joining the waitlist — SoundBridge is now live.
                </p>
                <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#D1D5DB;">
                  Upload music, podcasts, and mixtapes for free, promote your events to the right audience automatically at no cost, find gigs, get tipped by listeners, and stand a chance to be paid for highest listens.
                </p>

                <a href="{{app_store_url}}"
                   target="_blank" rel="noopener noreferrer"
                   style="display:inline-block;padding:12px 18px;border-radius:10px;background:#EC4899;color:#FFFFFF;text-decoration:none;font-weight:600;">
                  Create your account
                </a>

                <p style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:#9CA3AF;">
                  Already joined? Just sign in with your email. Prefer the web? <a href="{{signup_url}}" style="color:#F472B6;">Sign up here</a>.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 28px 28px 28px;">
                <hr style="border:none;border-top:1px solid #1F2937;margin:0 0 14px 0;" />
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6B7280;">
                  You're receiving this because you signed up for SoundBridge updates.
                  {{unsubscribe_link}}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
