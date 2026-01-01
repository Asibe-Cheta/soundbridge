/**
 * Utility functions for detecting and parsing URLs in text
 */

/**
 * URL regex pattern that matches:
 * - http:// and https:// URLs
 * - www. URLs (without protocol)
 * - URLs with various TLDs
 */
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}[^\s]*)/gi;

/**
 * Check if a string contains URLs
 */
export function hasUrls(text: string): boolean {
  if (!text) return false;
  return URL_REGEX.test(text);
}

/**
 * Extract all URLs from text
 */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(URL_REGEX) || [];
  return matches.map(url => {
    // Add protocol if missing (for www. URLs)
    if (url.startsWith('www.')) {
      return `https://${url}`;
    }
    return url;
  });
}

/**
 * Parse text and return segments with URL information
 */
export interface TextSegment {
  text: string;
  isUrl: boolean;
  url?: string;
}

export function parseTextWithUrls(text: string): TextSegment[] {
  if (!text) return [];

  const segments: TextSegment[] = [];
  let lastIndex = 0;
  const matches = Array.from(text.matchAll(URL_REGEX));

  for (const match of matches) {
    const matchIndex = match.index!;
    const matchText = match[0];

    // Add text before the URL
    if (matchIndex > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, matchIndex),
        isUrl: false,
      });
    }

    // Add the URL
    const url = matchText.startsWith('www.') ? `https://${matchText}` : matchText;
    segments.push({
      text: matchText,
      isUrl: true,
      url: url,
    });

    lastIndex = matchIndex + matchText.length;
  }

  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      isUrl: false,
    });
  }

  // If no URLs found, return the whole text as a single segment
  if (segments.length === 0) {
    segments.push({
      text: text,
      isUrl: false,
    });
  }

  return segments;
}

/**
 * Validate if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url.startsWith('www.') ? `https://${url}` : url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Format URL for display (truncate if too long)
 */
export function formatUrlForDisplay(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) return url;
  
  // Remove protocol for display
  const withoutProtocol = url.replace(/^https?:\/\//, '');
  if (withoutProtocol.length <= maxLength) return withoutProtocol;
  
  return withoutProtocol.substring(0, maxLength - 3) + '...';
}

