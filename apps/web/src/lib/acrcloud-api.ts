/**
 * ACRCloud API Client
 * 
 * Handles audio fingerprinting and identification via ACRCloud API
 * Documentation: https://www.acrcloud.com/docs/acrcloud/metadata-api/audio-identification/
 * 
 * NOTE: This module is server-side only (uses Node.js crypto)
 */

import * as crypto from 'crypto';

const ACRCLOUD_ACCESS_KEY = process.env.ACRCLOUD_ACCESS_KEY || '';
const ACRCLOUD_ACCESS_SECRET = process.env.ACRCLOUD_ACCESS_SECRET || '';
const ACRCLOUD_HOST = process.env.ACRCLOUD_HOST || 'identify-us-west-2.acrcloud.com';
const ACRCLOUD_TIMEOUT = parseInt(process.env.ACRCLOUD_TIMEOUT || '10000', 10);
const ACRCLOUD_ENABLED = process.env.ACRCLOUD_ENABLED !== 'false';

export interface ACRCloudMusic {
  title: string;
  artists?: Array<{ name: string }>;
  album?: { name: string };
  external_ids?: {
    isrc?: string;
  };
  label?: string;
}

export interface ACRCloudMetadata {
  music?: ACRCloudMusic[];
}

export interface ACRCloudResponse {
  status: {
    code: number;
    msg: string;
  };
  metadata?: ACRCloudMetadata;
}

export interface ACRCloudIdentificationResult {
  success: boolean;
  matchFound: boolean;
  detectedArtist?: string;
  detectedTitle?: string;
  detectedISRC?: string;
  detectedAlbum?: string;
  detectedLabel?: string;
  error?: string;
  errorCode?: 'API_ERROR' | 'TIMEOUT' | 'QUOTA_EXCEEDED' | 'NO_MATCH' | 'INVALID_FILE';
  rawResponse?: ACRCloudResponse;
}

/**
 * Generate ACRCloud signature for API authentication
 */
function generateSignature(
  method: string,
  uri: string,
  accessKey: string,
  dataType: string,
  signatureVersion: string,
  timestamp: number,
  accessSecret: string
): string {
  const stringToSign = `${method}\n${uri}\n${accessKey}\n${dataType}\n${signatureVersion}\n${timestamp}`;
  return crypto.createHmac('sha1', accessSecret).update(stringToSign).digest('base64');
}

/**
 * Identify audio file via ACRCloud API
 * 
 * @param audioBuffer - Audio file buffer (Buffer in Node.js)
 * @param timeout - Request timeout in milliseconds (default: 10000)
 * @returns Identification result with detected metadata if match found
 */
export async function identifyAudio(
  audioBuffer: Buffer,
  timeout: number = ACRCLOUD_TIMEOUT
): Promise<ACRCloudIdentificationResult> {
  // Check if ACRCloud is enabled
  if (!ACRCLOUD_ENABLED) {
    return {
      success: false,
      matchFound: false,
      error: 'ACRCloud service is disabled',
      errorCode: 'API_ERROR'
    };
  }

  // Check credentials
  if (!ACRCLOUD_ACCESS_KEY || !ACRCLOUD_ACCESS_SECRET) {
    console.error('❌ ACRCloud credentials not configured');
    return {
      success: false,
      matchFound: false,
      error: 'ACRCloud service not configured',
      errorCode: 'API_ERROR'
    };
  }

  try {
    // Check file size (ACRCloud recommends at least 1 second of audio, max 10MB)
    if (!audioBuffer || audioBuffer.length === 0) {
      return {
        success: false,
        matchFound: false,
        error: 'Invalid audio file',
        errorCode: 'INVALID_FILE'
      };
    }

    if (audioBuffer.length > 10 * 1024 * 1024) {
      return {
        success: false,
        matchFound: false,
        error: 'Audio file too large (max 10MB)',
        errorCode: 'INVALID_FILE'
      };
    }

    // Prepare form data using FormData (Node.js 18+ has built-in FormData)
    // Next.js server routes run on Node.js 18+, so FormData should be available globally
    let formData: FormData;
    try {
      formData = new FormData();
      
      // Create a Blob for the audio buffer
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      formData.append('sample', blob, 'audio.mp3');
      formData.append('sample_bytes', audioBuffer.length.toString());
      formData.append('access_key', ACRCLOUD_ACCESS_KEY);
      formData.append('data_type', 'audio');
      formData.append('signature_version', '1');

      const timestamp = Math.floor(Date.now() / 1000);
      formData.append('timestamp', timestamp.toString());

      const uri = '/v1/identify';
      const signature = generateSignature(
        'POST',
        uri,
        ACRCLOUD_ACCESS_KEY,
        'audio',
        '1',
        timestamp,
        ACRCLOUD_ACCESS_SECRET
      );
      formData.append('signature', signature);

      console.log('✅ ACRCloud: FormData prepared', {
        hasSample: true,
        sampleBytes: audioBuffer.length,
        accessKey: ACRCLOUD_ACCESS_KEY ? 'present' : 'missing',
        timestamp
      });
    } catch (formDataError: any) {
      console.error('❌ ACRCloud: Failed to create FormData', {
        error: formDataError.message,
        errorType: formDataError.constructor.name
      });
      throw new Error(`Failed to prepare request: ${formDataError.message}`);
    }

    // Make API request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const url = `https://${ACRCLOUD_HOST}/v1/identify`;
    
    console.log('🌐 ACRCloud: Making API request', {
      url,
      timeout: timeout,
      bufferSize: audioBuffer.length
    });
    
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal
        // Note: Don't set Content-Type header - fetch will set it automatically with boundary for FormData
      });
      console.log('✅ ACRCloud: API request completed', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error('❌ ACRCloud: Fetch request failed', {
        error: fetchError.message,
        errorType: fetchError.constructor.name,
        name: fetchError.name
      });
      
      if (fetchError.name === 'AbortError') {
        return {
          success: false,
          matchFound: false,
          error: 'ACRCloud request timeout. Please try again.',
          errorCode: 'TIMEOUT'
        };
      }
      
      throw fetchError;
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429 || response.status === 403) {
        console.error('❌ ACRCloud API: Quota exceeded', { status: response.status });
        return {
          success: false,
          matchFound: false,
          error: 'ACRCloud quota exceeded. Please try again later.',
          errorCode: 'QUOTA_EXCEEDED'
        };
      }

      let errorText = '';
      try {
        errorText = await response.text();
        console.error('❌ ACRCloud API error:', response.status, errorText);
      } catch (textError) {
        console.error('❌ ACRCloud API: Failed to read error response', textError);
        errorText = response.statusText || 'Unknown error';
      }
      
      return {
        success: false,
        matchFound: false,
        error: `ACRCloud API error: ${response.status} ${response.statusText}`,
        errorCode: 'API_ERROR'
      };
    }

    // Parse JSON response with error handling
    let data: ACRCloudResponse;
    try {
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        console.error('❌ ACRCloud API: Empty response body');
        return {
          success: false,
          matchFound: false,
          error: 'ACRCloud API returned empty response',
          errorCode: 'API_ERROR'
        };
      }
      
      data = JSON.parse(responseText);
      console.log('✅ ACRCloud API: Response parsed', {
        statusCode: data.status?.code,
        hasMetadata: !!data.metadata,
        hasMusic: !!data.metadata?.music
      });
    } catch (parseError: any) {
      console.error('❌ ACRCloud API: Failed to parse JSON response', {
        error: parseError.message,
        responseStatus: response.status
      });
      return {
        success: false,
        matchFound: false,
        error: 'ACRCloud API returned invalid response',
        errorCode: 'API_ERROR'
      };
    }

    // Check status code
    if (data.status.code !== 0) {
      if (data.status.code === 3001 || data.status.code === 3003) {
        // No match found
        return {
          success: true,
          matchFound: false,
          rawResponse: data
        };
      }

      return {
        success: false,
        matchFound: false,
        error: data.status.msg || 'ACRCloud identification failed',
        errorCode: 'API_ERROR',
        rawResponse: data
      };
    }

    // Extract music metadata
    const music = data.metadata?.music?.[0];
    if (!music) {
      return {
        success: true,
        matchFound: false,
        rawResponse: data
      };
    }

    const detectedArtist = music.artists?.[0]?.name || '';
    const detectedTitle = music.title || '';
    const detectedISRC = music.external_ids?.isrc;
    const detectedAlbum = music.album?.name;
    const detectedLabel = music.label;

    return {
      success: true,
      matchFound: true,
      detectedArtist,
      detectedTitle,
      detectedISRC,
      detectedAlbum,
      detectedLabel,
      rawResponse: data
    };

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        matchFound: false,
        error: 'ACRCloud request timeout. Please try again.',
        errorCode: 'TIMEOUT'
      };
    }

    console.error('❌ ACRCloud identification error:', error);
    return {
      success: false,
      matchFound: false,
      error: error.message || 'Failed to identify audio. Please try again.',
      errorCode: 'API_ERROR'
    };
  }
}

/**
 * Identify audio from URL (alternative method if file is already uploaded)
 * Note: ACRCloud primarily works with file uploads, but this can be used for URLs
 */
export async function identifyAudioFromUrl(
  audioUrl: string,
  timeout: number = ACRCLOUD_TIMEOUT
): Promise<ACRCloudIdentificationResult> {
  try {
    // Fetch audio file from URL
    const response = await fetch(audioUrl);
    if (!response.ok) {
      return {
        success: false,
        matchFound: false,
        error: 'Failed to fetch audio file',
        errorCode: 'INVALID_FILE'
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return identifyAudio(buffer, timeout);
  } catch (error: any) {
    return {
      success: false,
      matchFound: false,
      error: error.message || 'Failed to identify audio from URL',
      errorCode: 'API_ERROR'
    };
  }
}

