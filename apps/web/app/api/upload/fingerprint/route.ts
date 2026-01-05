/**
 * POST /api/upload/fingerprint
 * 
 * Fingerprint audio file via ACRCloud and return identification results
 * This endpoint is called automatically during upload to check if the audio
 * matches known released tracks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { identifyAudio } from '@/src/lib/acrcloud-api';
import { matchArtistNames } from '@/src/lib/artist-name-matcher';
import { verifyISRC } from '@/src/lib/musicbrainz-api';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 ACRCloud fingerprinting API called');

    // Authenticate user
    const { user, error: authError } = await getSupabaseRouteClient(request, false);
    
    if (authError || !user) {
      console.error('❌ ACRCloud fingerprinting: Authentication failed', { authError: authError?.message });
      return NextResponse.json(
        {
          success: false,
          matchFound: false,
          error: 'Authentication required',
          errorCode: 'AUTH_ERROR',
          requiresManualReview: true
        },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ ACRCloud fingerprinting: User authenticated', { userId: user.id });

    // Check Content-Type to determine request format
    const contentType = request.headers.get('content-type') || '';
    const isMultipart = contentType.includes('multipart/form-data');
    
    console.log('📦 ACRCloud fingerprinting: Request format detected', {
      contentType,
      isMultipart,
      contentLength: request.headers.get('content-length')
    });

    let audioFileUrl: string | undefined;
    let artistName: string | undefined;
    let fileData: string | undefined;
    let audioFile: File | undefined;

    // Parse request based on Content-Type
    if (isMultipart) {
      // Multipart form-data (preferred - no base64 overhead)
      try {
        const formData = await request.formData();
        
        // Get audio file from form data
        audioFile = formData.get('audioFile') as File;
        if (!audioFile) {
          // Try alternative field names for backward compatibility
          audioFile = formData.get('file') as File || formData.get('audio') as File;
        }
        
        // Get artist name (optional)
        const artistNameField = formData.get('artistName');
        artistName = artistNameField ? String(artistNameField) : undefined;

        console.log('✅ ACRCloud fingerprinting: Multipart form data parsed', {
          hasAudioFile: !!audioFile,
          audioFileName: audioFile?.name,
          audioFileSize: audioFile?.size,
          audioFileType: audioFile?.type,
          hasArtistName: !!artistName
        });

        if (!audioFile) {
          return NextResponse.json(
            {
              success: false,
              matchFound: false,
              error: 'Audio file is required. Please provide "audioFile" field in form data.',
              errorCode: 'MISSING_FILE',
              requiresManualReview: true
            },
            { status: 400, headers: corsHeaders }
          );
        }

        // Validate file size (20 MB limit for raw binary)
        const maxSize = 20 * 1024 * 1024; // 20 MB
        if (audioFile.size > maxSize) {
          console.warn('⚠️ ACRCloud fingerprinting: File too large', {
            fileSize: audioFile.size,
            maxSize
          });
          return NextResponse.json(
            {
              success: false,
              matchFound: false,
              error: `Audio file too large. Maximum size is ${maxSize / 1024 / 1024}MB.`,
              errorCode: 'FILE_TOO_LARGE',
              requiresManualReview: true
            },
            { status: 400, headers: corsHeaders }
          );
        }

      } catch (formDataError: any) {
        console.error('❌ ACRCloud fingerprinting: Failed to parse form data', {
          error: formDataError.message,
          errorType: formDataError.constructor.name
        });
        return NextResponse.json(
          {
            success: false,
            matchFound: false,
            error: 'Failed to parse form data. Please ensure the request uses multipart/form-data format.',
            errorCode: 'INVALID_REQUEST',
            requiresManualReview: true
          },
          { status: 400, headers: corsHeaders }
        );
      }
    } else {
      // JSON with base64 (backward compatibility - deprecated)
      console.warn('⚠️ ACRCloud fingerprinting: Using deprecated base64 JSON format. Please migrate to multipart/form-data.');
      
      let body: any;
      try {
        body = await request.json();
        console.log('✅ ACRCloud fingerprinting: Request body parsed (base64 format)', {
          hasFileData: !!body.fileData,
          hasAudioFileUrl: !!body.audioFileUrl,
          hasArtistName: !!body.artistName,
          fileDataLength: body.fileData ? (typeof body.fileData === 'string' ? body.fileData.length : 'buffer') : 0
        });
      } catch (parseError: any) {
        console.error('❌ ACRCloud fingerprinting: Failed to parse request body', {
          error: parseError.message,
          errorType: parseError.constructor.name
        });
        return NextResponse.json(
          {
            success: false,
            matchFound: false,
            error: 'Invalid request body. Please use multipart/form-data format or ensure the audio file is properly encoded.',
            errorCode: 'INVALID_REQUEST',
            requiresManualReview: true
          },
          { status: 400, headers: corsHeaders }
        );
      }

      audioFileUrl = body.audioFileUrl;
      artistName = body.artistName;
      fileData = body.fileData;
    }

    // Validate that we have a file source
    if (!audioFile && !audioFileUrl && !fileData) {
      console.error('❌ ACRCloud fingerprinting: No file data, URL, or file provided');
      return NextResponse.json(
        {
          success: false,
          matchFound: false,
          error: 'Audio file is required. Please provide "audioFile" in form data, or "fileData"/"audioFileUrl" in JSON.',
          errorCode: 'MISSING_FILE',
          requiresManualReview: true
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get audio buffer with error handling
    let audioBuffer: Buffer;
    
    try {
      if (audioFile) {
        // Multipart form-data: Convert File to Buffer
        console.log('📥 ACRCloud fingerprinting: Converting File to Buffer', {
          fileName: audioFile.name,
          fileSize: audioFile.size,
          fileType: audioFile.type
        });
        
        const arrayBuffer = await audioFile.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuffer);
        
        console.log('✅ ACRCloud fingerprinting: File converted to buffer', {
          bufferSize: audioBuffer.length,
          sizeMB: (audioBuffer.length / (1024 * 1024)).toFixed(2)
        });
      } else if (fileData) {
        // File data is provided (base64 or buffer)
        if (typeof fileData === 'string') {
          // Base64 encoded
          const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
          
          // Validate base64 data
          if (!base64Data || base64Data.length === 0) {
            throw new Error('Empty base64 data');
          }
          
          // Check size (base64 is ~33% larger than binary, so 13.9MB file = ~18.6MB base64)
          // Limit to 20MB base64 to be safe
          if (base64Data.length > 20 * 1024 * 1024) {
            console.warn('⚠️ ACRCloud fingerprinting: File too large for base64', {
              base64Size: base64Data.length,
              maxSize: 20 * 1024 * 1024
            });
            return NextResponse.json(
              {
                success: false,
                matchFound: false,
                error: 'Audio file too large for fingerprinting. Maximum size is 10MB.',
                errorCode: 'FILE_TOO_LARGE',
                requiresManualReview: true
              },
              { status: 400, headers: corsHeaders }
            );
          }
          
          audioBuffer = Buffer.from(base64Data, 'base64');
          console.log('✅ ACRCloud fingerprinting: Base64 decoded', {
            originalSize: base64Data.length,
            decodedSize: audioBuffer.length
          });
        } else {
          // Assume it's already a buffer (in JSON, this would be an array)
          audioBuffer = Buffer.from(fileData);
          console.log('✅ ACRCloud fingerprinting: Buffer created from array', {
            bufferSize: audioBuffer.length
          });
        }
      } else if (audioFileUrl) {
        // Fetch from URL
        console.log('📥 ACRCloud fingerprinting: Fetching audio from URL', { url: audioFileUrl });
        const response = await fetch(audioFileUrl);
        if (!response.ok) {
          console.error('❌ ACRCloud fingerprinting: Failed to fetch audio from URL', {
            status: response.status,
            statusText: response.statusText
          });
          return NextResponse.json(
            {
              success: false,
              matchFound: false,
              error: `Failed to fetch audio file from URL: ${response.statusText}`,
              errorCode: 'FETCH_ERROR',
              requiresManualReview: true
            },
            { status: 400, headers: corsHeaders }
          );
        }
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuffer);
        console.log('✅ ACRCloud fingerprinting: Audio fetched from URL', {
          bufferSize: audioBuffer.length
        });
      } else {
        // This should never happen due to check above, but just in case
        throw new Error('No file data or URL provided');
      }

      // Validate buffer
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Invalid audio buffer: empty or null');
      }

      console.log('✅ ACRCloud fingerprinting: Audio buffer ready', {
        size: audioBuffer.length,
        sizeMB: (audioBuffer.length / (1024 * 1024)).toFixed(2)
      });
    } catch (bufferError: any) {
      console.error('❌ ACRCloud fingerprinting: Failed to process audio file', {
        error: bufferError.message,
        errorType: bufferError.constructor.name
      });
      return NextResponse.json(
        {
          success: false,
          matchFound: false,
          error: `Failed to process audio file: ${bufferError.message}`,
          errorCode: 'FILE_PROCESSING_ERROR',
          requiresManualReview: true
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Perform ACRCloud identification
    console.log('🎵 Calling ACRCloud identifyAudio...', {
      bufferSize: audioBuffer.length,
      artistName: artistName || 'not provided'
    });
    
    let acrResult;
    try {
      acrResult = await identifyAudio(audioBuffer);
      console.log('✅ ACRCloud identifyAudio completed', {
        success: acrResult.success,
        matchFound: acrResult.matchFound,
        error: acrResult.error
      });
    } catch (acrError: any) {
      console.error('❌ ACRCloud identifyAudio threw exception', {
        error: acrError.message,
        stack: acrError.stack
      });
      return NextResponse.json(
        {
          success: false,
          matchFound: false,
          error: `ACRCloud identification failed: ${acrError.message}`,
          errorCode: 'API_ERROR',
          requiresManualReview: true
        },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!acrResult.success) {
      // ACRCloud API error or timeout
      console.warn('⚠️ ACRCloud identification failed', {
        error: acrResult.error,
        errorCode: acrResult.errorCode
      });
      return NextResponse.json(
        {
          success: false,
          matchFound: false,
          error: acrResult.error || 'ACRCloud identification failed',
          errorCode: acrResult.errorCode || 'API_ERROR',
          requiresManualReview: true
        },
        { status: 200, headers: corsHeaders } // Return 200 so client can handle gracefully
      );
    }

    if (!acrResult.matchFound) {
      // No match found - appears to be unreleased/original
      return NextResponse.json(
        {
          success: true,
          matchFound: false,
          requiresISRC: false,
          isUnreleased: true
        },
        { headers: corsHeaders }
      );
    }

    // Match found - extract metadata
    const detectedArtist = acrResult.detectedArtist || '';
    const detectedTitle = acrResult.detectedTitle || '';
    const detectedISRC = acrResult.detectedISRC;
    const detectedAlbum = acrResult.detectedAlbum;
    const detectedLabel = acrResult.detectedLabel;

    // If user provided artist name, perform fuzzy matching
    let artistMatch: { match: boolean; confidence: number } | null = null;
    if (artistName && detectedArtist) {
      const matchResult = matchArtistNames(artistName, detectedArtist, 0.85);
      artistMatch = {
        match: matchResult.match,
        confidence: matchResult.confidence
      };
    }

    // Prepare response
    const responseData: any = {
      success: true,
      matchFound: true,
      requiresISRC: true,
      detectedArtist,
      detectedTitle,
      detectedISRC,
      detectedAlbum,
      detectedLabel,
      artistMatch,
      artistMatchConfidence: artistMatch?.confidence || null
    };

    // If ISRC was detected, verify it (optional - user can also provide their own)
    if (detectedISRC) {
      try {
        const isrcVerification = await verifyISRC(detectedISRC, 5000);
        if (isrcVerification.verified) {
          responseData.detectedISRCVerified = true;
          responseData.detectedISRCRecording = isrcVerification.recording;
        }
      } catch (error) {
        console.error('Error verifying detected ISRC:', error);
        // Don't fail the request if ISRC verification fails
      }
    }

    console.log('✅ ACRCloud identification complete:', {
      matchFound: true,
      detectedArtist,
      detectedTitle,
      artistMatch: artistMatch?.match
    });

    return NextResponse.json(responseData, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ ACRCloud fingerprinting: Unhandled exception', {
      error: error.message,
      errorType: error.constructor.name,
      stack: error.stack
    });
    
    // Always return a valid JSON response, never empty
    return NextResponse.json(
      {
        success: false,
        matchFound: false,
        error: error.message || 'Failed to fingerprint audio. Please try again.',
        errorCode: 'INTERNAL_ERROR',
        requiresManualReview: true
      },
      { 
        status: 500, 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

