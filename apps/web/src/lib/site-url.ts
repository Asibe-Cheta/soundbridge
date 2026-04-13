/**
 * Single canonical public origin for sitemap, OG URLs, redirects, and metadata.
 * Set NEXT_PUBLIC_SITE_URL in Vercel (recommended: https://www.soundbridge.live).
 */
const DEFAULT_ORIGIN = 'https://www.soundbridge.live';

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      const u = new URL(raw);
      return `${u.protocol}//${u.host}`;
    } catch {
      /* ignore invalid */
    }
  }
  return DEFAULT_ORIGIN;
}

export function getSiteHostname(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw).hostname.toLowerCase();
    } catch {
      /* ignore invalid */
    }
  }
  return 'www.soundbridge.live';
}

/** Apex or www production host — used to avoid redirecting preview / localhost. */
export function isSoundBridgeProductionHost(hostHeader: string | null | undefined): boolean {
  const h = hostHeader?.split(':')[0]?.toLowerCase();
  return h === 'soundbridge.live' || h === 'www.soundbridge.live';
}
