/**
 * External Links Validation Utility
 *
 * Validates external platform links for creator profiles
 * Blocks monetization competitors, prevents XSS, enforces platform-specific rules
 *
 * IMPORTANT FOR MOBILE TEAM:
 * - Use the same PLATFORM_METADATA constants
 * - Use the same BLOCKED_PLATFORMS list
 * - Apply the same validation rules
 * - Keep platform colors consistent for brand identity
 */

export type PlatformType = 'instagram' | 'youtube' | 'spotify' | 'apple_music' | 'soundcloud' | 'website';

/**
 * Platform metadata for UI rendering and validation
 * MOBILE TEAM: Use these exact platform names, colors, and URL patterns
 */
export const PLATFORM_METADATA = {
  instagram: {
    name: 'Instagram',
    icon: 'instagram', // Lucide icon name (web) / System icon name (mobile)
    pattern: /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/.+$/i,
    example: 'https://instagram.com/username',
    color: '#E4405F' // Instagram brand color
  },
  youtube: {
    name: 'YouTube',
    icon: 'youtube',
    pattern: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+$/i,
    example: 'https://youtube.com/@username or https://youtu.be/videoId',
    color: '#FF0000' // YouTube brand color
  },
  spotify: {
    name: 'Spotify',
    icon: 'music',
    pattern: /^https?:\/\/open\.spotify\.com\/(artist|album|track|playlist)\/.+$/i,
    example: 'https://open.spotify.com/artist/...',
    color: '#1DB954' // Spotify brand color
  },
  apple_music: {
    name: 'Apple Music',
    icon: 'music',
    pattern: /^https?:\/\/music\.apple\.com\/.+$/i,
    example: 'https://music.apple.com/us/artist/...',
    color: '#FA243C' // Apple Music brand color
  },
  soundcloud: {
    name: 'SoundCloud',
    icon: 'cloud',
    pattern: /^https?:\/\/(www\.)?soundcloud\.com\/.+$/i,
    example: 'https://soundcloud.com/username',
    color: '#FF5500' // SoundCloud brand color
  },
  website: {
    name: 'Website',
    icon: 'globe',
    pattern: /^https:\/\/.+\..+$/i, // Require HTTPS for security
    example: 'https://yourwebsite.com',
    color: '#6B7280' // Neutral gray
  }
} as const;

/**
 * Blocked platforms - competitor monetization/tipping platforms
 * MOBILE TEAM: Keep this list synchronized
 *
 * Why blocked: SoundBridge is the primary monetization hub.
 * We don't allow links to other platforms where creators can receive payments.
 */
const BLOCKED_PLATFORMS = [
  'tiktok.com',
  'patreon.com',
  'onlyfans.com',
  'twitch.tv',
  'ko-fi.com',
  'buymeacoffee.com',
  'gofundme.com',
  'kickstarter.com',
  'indiegogo.com',
  'cashapp.com',
  'venmo.com',
  'paypal.me'
];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedUrl?: string;
}

/**
 * Validates an external link URL for a given platform
 *
 * MOBILE TEAM: Apply the same validation logic
 *
 * @param platform - Platform type (instagram, youtube, etc.)
 * @param url - URL to validate
 * @returns ValidationResult with isValid, errors[], and sanitizedUrl
 */
export function validateExternalLink(
  platform: PlatformType,
  url: string
): ValidationResult {
  const errors: string[] = [];

  // 1. Basic URL validation
  let urlObj: URL;
  try {
    urlObj = new URL(url.trim());
  } catch {
    return { isValid: false, errors: ['Invalid URL format'] };
  }

  // 2. Protocol check (HTTP/HTTPS only)
  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    errors.push('URL must use HTTP or HTTPS protocol');
  }

  // 3. Enforce HTTPS for personal websites (security requirement)
  if (platform === 'website' && urlObj.protocol !== 'https:') {
    errors.push('Personal websites must use HTTPS for security');
  }

  // 4. Check blocked platforms (monetization competitors)
  const hostname = urlObj.hostname.toLowerCase();
  for (const blocked of BLOCKED_PLATFORMS) {
    if (hostname.includes(blocked)) {
      errors.push(`${blocked} is not a supported platform. SoundBridge is your primary monetization hub.`);
    }
  }

  // 5. Platform-specific validation (ensure URL matches expected format)
  const metadata = PLATFORM_METADATA[platform];
  if (!metadata.pattern.test(url)) {
    errors.push(`URL does not match expected format for ${metadata.name}. Example: ${metadata.example}`);
  }

  // 6. Length check (prevent excessively long URLs)
  if (url.length > 500) {
    errors.push('URL must be less than 500 characters');
  }

  // 7. XSS prevention - check for suspicious patterns
  const suspiciousPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /<script/i,
    /on\w+=/i // onclick=, onerror=, etc.
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      errors.push('URL contains suspicious or unsafe patterns');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedUrl: errors.length === 0 ? url.trim() : undefined
  };
}

/**
 * Checks if user can add more links
 *
 * MOBILE TEAM: Enforce same limit (maximum 2 links)
 *
 * @param currentLinkCount - Number of links user currently has
 * @returns boolean - true if can add more
 */
export function canAddMoreLinks(currentLinkCount: number): boolean {
  return currentLinkCount < 2; // Maximum 2 links per creator
}

/**
 * Gets platform display name
 * Helper for mobile team to maintain consistent naming
 */
export function getPlatformName(platform: PlatformType): string {
  return PLATFORM_METADATA[platform].name;
}

/**
 * Gets platform color
 * Helper for mobile team to maintain consistent branding
 */
export function getPlatformColor(platform: PlatformType): string {
  return PLATFORM_METADATA[platform].color;
}
