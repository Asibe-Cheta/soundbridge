/**
 * Artist Name Matching Utility
 * 
 * Provides fuzzy matching logic to compare artist names from different sources
 * (ACRCloud, MusicBrainz, user input) with variations and common patterns
 */

export interface ArtistMatchResult {
  match: boolean;
  confidence: number; // 0.0 - 1.0
  normalizedArtist1: string;
  normalizedArtist2: string;
}

/**
 * Normalize artist name for comparison
 * - Lowercase
 * - Remove special characters
 * - Remove common prefixes (The, A, An)
 * - Remove featuring/feat/ft information
 * - Trim whitespace
 */
export function normalizeArtistName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  let normalized = name
    .toLowerCase()
    .trim();

  // Remove common prefixes
  normalized = normalized.replace(/^(the|a|an)\s+/i, '');

  // Remove featuring/feat/ft information (everything after ft, feat, featuring, etc.)
  normalized = normalized.replace(/\s*(ft\.?|feat\.?|featuring|feat|&|x|×)\s+.*$/i, '');

  // Remove special characters (keep alphanumeric and spaces)
  normalized = normalized.replace(/[^a-z0-9\s]/g, '');

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity percentage between two strings using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) {
    return 1.0;
  }

  if (str1.length === 0 || str2.length === 0) {
    return 0.0;
  }

  const maxLength = Math.max(str1.length, str2.length);
  const distance = levenshteinDistance(str1, str2);
  const similarity = 1 - (distance / maxLength);

  return Math.max(0, similarity);
}

/**
 * Match two artist names with fuzzy matching
 * 
 * @param artist1 - First artist name (e.g., from user input)
 * @param artist2 - Second artist name (e.g., from ACRCloud)
 * @param threshold - Minimum similarity threshold (default: 0.85 = 85%)
 * @returns Match result with confidence score
 */
export function matchArtistNames(
  artist1: string,
  artist2: string,
  threshold: number = 0.85
): ArtistMatchResult {
  if (!artist1 || !artist2) {
    return {
      match: false,
      confidence: 0,
      normalizedArtist1: artist1 || '',
      normalizedArtist2: artist2 || ''
    };
  }

  const normalized1 = normalizeArtistName(artist1);
  const normalized2 = normalizeArtistName(artist2);

  // Exact match after normalization
  if (normalized1 === normalized2) {
    return {
      match: true,
      confidence: 1.0,
      normalizedArtist1: normalized1,
      normalizedArtist2: normalized2
    };
  }

  // Calculate similarity
  const similarity = calculateSimilarity(normalized1, normalized2);

  // Check if one name contains the other (for cases like "Artist Name" vs "Artist Name Band")
  const containsMatch = normalized1.includes(normalized2) || normalized2.includes(normalized1);
  if (containsMatch && Math.min(normalized1.length, normalized2.length) / Math.max(normalized1.length, normalized2.length) >= 0.7) {
    return {
      match: true,
      confidence: 0.9,
      normalizedArtist1: normalized1,
      normalizedArtist2: normalized2
    };
  }

  return {
    match: similarity >= threshold,
    confidence: similarity,
    normalizedArtist1: normalized1,
    normalizedArtist2: normalized2
  };
}

/**
 * Match artist name against multiple artist names (e.g., from ACRCloud with multiple artists)
 * 
 * @param userArtist - User's artist name
 * @param detectedArtists - Array of detected artist names
 * @param threshold - Minimum similarity threshold (default: 0.85)
 * @returns Best match result
 */
export function matchArtistNameAgainstList(
  userArtist: string,
  detectedArtists: string[],
  threshold: number = 0.85
): ArtistMatchResult {
  if (!detectedArtists || detectedArtists.length === 0) {
    return {
      match: false,
      confidence: 0,
      normalizedArtist1: normalizeArtistName(userArtist),
      normalizedArtist2: ''
    };
  }

  let bestMatch: ArtistMatchResult = {
    match: false,
    confidence: 0,
    normalizedArtist1: normalizeArtistName(userArtist),
    normalizedArtist2: ''
  };

  for (const detectedArtist of detectedArtists) {
    const result = matchArtistNames(userArtist, detectedArtist, threshold);
    if (result.confidence > bestMatch.confidence) {
      bestMatch = result;
    }
  }

  return bestMatch;
}

