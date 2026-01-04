/**
 * MusicBrainz API Client
 * 
 * Handles ISRC code verification via MusicBrainz API
 * Documentation: https://musicbrainz.org/doc/MusicBrainz_API
 */

const MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'SoundBridge/1.0 (contact@soundbridge.com)';

// Rate limiting: 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second in milliseconds

export interface MusicBrainzRecording {
  id: string;
  title: string;
  'artist-credit': Array<{
    name: string;
    artist?: {
      name: string;
    };
  }>;
  isrcs?: string[];
}

export interface MusicBrainzResponse {
  recordings?: MusicBrainzRecording[];
  count?: number;
  'recording-count'?: number;
}

export interface ISRCVerificationResult {
  verified: boolean;
  recording?: MusicBrainzRecording;
  error?: string;
  errorCode?: 'INVALID_FORMAT' | 'NOT_FOUND' | 'API_ERROR' | 'TIMEOUT' | 'RATE_LIMIT';
}

/**
 * Validate ISRC format: XX-XXX-YY-NNNNN (12 characters)
 * Format: Country code (2) + Registrant code (3) + Year (2) + Designation code (5)
 * 
 * Examples:
 * - GBUM71502800 (valid)
 * - USRC17607839 (valid)
 * - GB-UM7-15-02800 (valid with hyphens, will be normalized)
 */
export function validateISRCFormat(isrc: string): { valid: boolean; normalized?: string; error?: string } {
  if (!isrc || typeof isrc !== 'string') {
    return { valid: false, error: 'ISRC code is required' };
  }

  // Remove hyphens and spaces for validation
  const normalized = isrc.replace(/[-\s]/g, '').toUpperCase();

  // Must be exactly 12 characters
  if (normalized.length !== 12) {
    return {
      valid: false,
      error: 'Invalid ISRC format. Should be 12 characters (XX-XXX-YY-NNNNN)'
    };
  }

  // Must be alphanumeric (last 5 characters can be digits only)
  if (!/^[A-Z0-9]{2}[A-Z0-9]{3}[A-Z0-9]{2}[0-9]{5}$/.test(normalized)) {
    return {
      valid: false,
      error: 'Invalid ISRC format. Should be XX-XXX-YY-NNNNN (alphanumeric, last 5 digits)'
    };
  }

  return { valid: true, normalized };
}

/**
 * Wait for rate limit cooldown
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

/**
 * Verify ISRC code via MusicBrainz API
 * 
 * @param isrc - ISRC code to verify (will be normalized)
 * @param timeout - Request timeout in milliseconds (default: 10000)
 * @returns Verification result with recording data if found
 */
export async function verifyISRC(
  isrc: string,
  timeout: number = 10000
): Promise<ISRCVerificationResult> {
  // Validate format first
  const formatCheck = validateISRCFormat(isrc);
  if (!formatCheck.valid) {
    return {
      verified: false,
      error: formatCheck.error || 'Invalid ISRC format',
      errorCode: 'INVALID_FORMAT'
    };
  }

  const normalizedISRC = formatCheck.normalized!;

  // Wait for rate limit
  await waitForRateLimit();

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const url = `${MUSICBRAINZ_BASE_URL}/recording?query=isrc:${normalizedISRC}&fmt=json&limit=1`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 503 || response.status === 429) {
        return {
          verified: false,
          error: 'Too many requests. Please wait a moment and try again.',
          errorCode: 'RATE_LIMIT'
        };
      }

      return {
        verified: false,
        error: `MusicBrainz API error: ${response.status} ${response.statusText}`,
        errorCode: 'API_ERROR'
      };
    }

    const data: MusicBrainzResponse = await response.json();
    
    if (!data.recordings || data.recordings.length === 0) {
      return {
        verified: false,
        error: 'ISRC not found in MusicBrainz database. Ensure your cover is distributed first.',
        errorCode: 'NOT_FOUND'
      };
    }

    // Verify the ISRC matches (should always match, but double-check)
    const recording = data.recordings[0];
    const recordingISRCs = recording.isrcs || [];
    
    if (!recordingISRCs.some(code => code.replace(/[-\s]/g, '').toUpperCase() === normalizedISRC)) {
      // ISRC not in the recording's ISRC list (shouldn't happen, but handle it)
      return {
        verified: false,
        error: 'ISRC not found in MusicBrainz database.',
        errorCode: 'NOT_FOUND'
      };
    }

    return {
      verified: true,
      recording: recording
    };

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        verified: false,
        error: 'Verification timeout. Please try again.',
        errorCode: 'TIMEOUT'
      };
    }

    console.error('MusicBrainz API error:', error);
    return {
      verified: false,
      error: error.message || 'Failed to verify ISRC. Please try again.',
      errorCode: 'API_ERROR'
    };
  }
}

/**
 * Format artist name from MusicBrainz recording
 */
export function formatArtistName(recording: MusicBrainzRecording): string {
  if (!recording['artist-credit'] || recording['artist-credit'].length === 0) {
    return 'Unknown Artist';
  }

  return recording['artist-credit']
    .map(credit => credit.artist?.name || credit.name)
    .join(', ');
}

/**
 * Cache for successful ISRC verifications (in-memory, simple implementation)
 * In production, consider using Redis or database caching
 */
const isrcCache = new Map<string, { result: ISRCVerificationResult; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function getCachedISRC(isrc: string): ISRCVerificationResult | null {
  const normalized = validateISRCFormat(isrc);
  if (!normalized.valid || !normalized.normalized) {
    return null;
  }

  const cached = isrcCache.get(normalized.normalized);
  if (!cached) {
    return null;
  }

  // Check if cache is still valid
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    isrcCache.delete(normalized.normalized);
    return null;
  }

  return cached.result;
}

export function setCachedISRC(isrc: string, result: ISRCVerificationResult): void {
  const normalized = validateISRCFormat(isrc);
  if (!normalized.valid || !normalized.normalized) {
    return;
  }

  // Only cache successful verifications
  if (result.verified) {
    isrcCache.set(normalized.normalized, {
      result,
      timestamp: Date.now()
    });
  }
}

/**
 * Clear ISRC cache (useful for testing or manual cache invalidation)
 */
export function clearISRCCache(): void {
  isrcCache.clear();
}

