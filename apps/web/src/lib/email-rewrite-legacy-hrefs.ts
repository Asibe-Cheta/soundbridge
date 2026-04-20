import { IOS_APP_STORE_URL } from '@/src/lib/app-store-url';

/**
 * Admin pasted templates often used non-existent web paths (/auth/sign-up, /auth/signup).
 * Rewrite those href targets to the App Store listing so "Create your account" CTAs work.
 */
export function rewriteLegacyAuthSignupHrefsInHtml(html: string): string {
  const u = IOS_APP_STORE_URL;
  return html
    .replace(/href\s*=\s*"([^"]*\/auth\/sign-up\/?)"/gi, `href="${u}"`)
    .replace(/href\s*=\s*"([^"]*\/auth\/signup\/?)"/gi, `href="${u}"`)
    .replace(/href\s*=\s*'([^']*\/auth\/sign-up\/?)'/gi, `href='${u}'`)
    .replace(/href\s*=\s*'([^']*\/auth\/signup\/?)'/gi, `href='${u}'`);
}
