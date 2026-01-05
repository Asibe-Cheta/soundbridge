/**
 * POST /api/upload/fingerprint
 * 
 * Fingerprint audio file via ACRCloud and return identification results
 * This endpoint is called automatically during upload to check if the audio
 * matches known released tracks.
 * 
 * NOTE: Vercel has a 10MB payload limit. For files > 10MB, use audioFileUrl
 * parameter instead of sending the file directly (upload to Supabase Storage first).
 */

import { NextRequest, NextResponse } from 'next/server';

// Vercel function configuration
export const maxDuration = 60; // 60 seconds for audio processing
export const dynamic = 'force-dynamic';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { identifyAudio } from '@/src/lib/acrcloud-api';
import { matchArtistNames } from '@/src/lib/artist-name-matcher';
import { verifyISRC } from '@/src/lib/musicbrainz-api';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

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

        // Note: For direct multipart uploads, Vercel has a 4.5MB payload limit
        // Files > 4.5MB should use audioFileUrl instead (storage-first approach)
        // For files that do make it through (< 4.5MB), we'll process them normally
        // Files > 10MB (if they somehow get through) will be sampled below

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
        const fileSize = audioFile.size;
        const MAX_DIRECT_SIZE = 10 * 1024 * 1024; // 10 MB - Vercel infrastructure limit
        
        console.log('📥 ACRCloud fingerprinting: Processing audio file', {
          fileName: audioFile.name,
          fileSize: fileSize,
          fileSizeMB: (fileSize / (1024 * 1024)).toFixed(2),
          fileType: audioFile.type,
          needsSampling: fileSize > MAX_DIRECT_SIZE
        });
        
        if (fileSize > MAX_DIRECT_SIZE) {
          // Large file: Extract 30-second audio sample using ffmpeg
          console.log('📦 ACRCloud fingerprinting: Large file detected, extracting 30-second audio sample', {
            originalSize: fileSize,
            originalSizeMB: (fileSize / (1024 * 1024)).toFixed(2)
          });
          
          try {
            audioBuffer = await extractAudioSample(audioFile, 30);
            console.log('✅ ACRCloud fingerprinting: Audio sample extracted successfully', {
              originalSize: fileSize,
              sampleSize: audioBuffer.length,
              sampleSizeMB: (audioBuffer.length / (1024 * 1024)).toFixed(2),
              note: 'ACRCloud only needs 10-15 seconds to fingerprint'
            });
          } catch (samplingError: any) {
            console.error('❌ ACRCloud fingerprinting: Audio sampling failed, falling back to simple slice', {
              error: samplingError.message,
              errorType: samplingError.constructor.name
            });
            
            // Fallback: Use first 2MB if ffmpeg fails (not ideal but better than nothing)
            const arrayBuffer = await audioFile.arrayBuffer();
            const fullBuffer = Buffer.from(arrayBuffer);
            const sampleSize = Math.min(2 * 1024 * 1024, fullBuffer.length);
            audioBuffer = fullBuffer.slice(0, sampleSize);
            
            console.warn('⚠️ ACRCloud fingerprinting: Using fallback slice method (may not work for all formats)', {
              sampleSize: audioBuffer.length,
              sampleSizeMB: (audioBuffer.length / (1024 * 1024)).toFixed(2)
            });
          }
        } else {
          // Small file: Use entire file
          const arrayBuffer = await audioFile.arrayBuffer();
          audioBuffer = Buffer.from(arrayBuffer);
          console.log('✅ ACRCloud fingerprinting: File converted to buffer (full file)', {
            bufferSize: audioBuffer.length,
            sizeMB: (audioBuffer.length / (1024 * 1024)).toFixed(2)
          });
        }
      } else if (fileData) {
        // File data is provided (base64 or buffer)
        if (typeof fileData === 'string') {
          // Base64 encoded
          const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
          
          // Validate base64 data
          if (!base64Data || base64Data.length === 0) {
            throw new Error('Empty base64 data');
          }
          
          // Note: Base64 encoding adds ~33% overhead
          // For large files, use audioFileUrl instead (storage-first approach)
          // Base64 is deprecated - kept for backward compatibility only
          
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
        // Fetch from URL (RECOMMENDED for files > 4.5MB to bypass Vercel payload limits)
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
        const fetchedBuffer = Buffer.from(arrayBuffer);
        const fetchedSize = fetchedBuffer.length;
        const MAX_ACRCLOUD_SIZE = 10 * 1024 * 1024; // 10 MB - ACRCloud processing limit
        
        console.log('✅ ACRCloud fingerprinting: Audio fetched from URL', {
          bufferSize: fetchedSize,
          sizeMB: (fetchedSize / (1024 * 1024)).toFixed(2),
          needsSampling: fetchedSize > MAX_ACRCLOUD_SIZE
        });
        
        // If fetched file is > 10MB, extract 30-second sample for ACRCloud
        if (fetchedSize > MAX_ACRCLOUD_SIZE) {
          console.log('📦 ACRCloud fingerprinting: Large file fetched from URL, extracting 30-second audio sample', {
            originalSize: fetchedSize,
            originalSizeMB: (fetchedSize / (1024 * 1024)).toFixed(2)
          });
          
          try {
            // Use extractAudioSampleFromBuffer for URL-fetched files
            audioBuffer = await extractAudioSampleFromBuffer(fetchedBuffer, 30);
            console.log('✅ ACRCloud fingerprinting: Audio sample extracted successfully', {
              originalSize: fetchedSize,
              sampleSize: audioBuffer.length,
              sampleSizeMB: (audioBuffer.length / (1024 * 1024)).toFixed(2),
              note: 'ACRCloud only needs 10-15 seconds to fingerprint'
            });
          } catch (samplingError: any) {
            console.error('❌ ACRCloud fingerprinting: Audio sampling failed, falling back to simple slice', {
              error: samplingError.message,
              errorType: samplingError.constructor.name
            });
            
            // Fallback: Use first 2MB if ffmpeg fails (not ideal but better than nothing)
            const sampleSize = Math.min(2 * 1024 * 1024, fetchedBuffer.length);
            audioBuffer = fetchedBuffer.slice(0, sampleSize);
            
            console.warn('⚠️ ACRCloud fingerprinting: Using fallback slice method (may not work for all formats)', {
              sampleSize: audioBuffer.length,
              sampleSizeMB: (audioBuffer.length / (1024 * 1024)).toFixed(2)
            });
          }
        } else {
          // Small file: Use entire buffer
          audioBuffer = fetchedBuffer;
          console.log('✅ ACRCloud fingerprinting: Using full file buffer (no sampling needed)', {
            bufferSize: audioBuffer.length,
            sizeMB: (audioBuffer.length / (1024 * 1024)).toFixed(2)
          });
        }
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

/**
 * Extract audio sample from Buffer using ffmpeg
 * Extracts the first N seconds of audio for ACRCloud fingerprinting
 * Used for URL-fetched files (which are already Buffers)
 * 
 * @param buffer - Audio file buffer
 * @param durationSeconds - Sample duration in seconds (default: 30)
 * @param filename - Optional filename for temp file (default: 'audio.mp3')
 * @returns Buffer containing audio sample
 */
async function extractAudioSampleFromBuffer(
  buffer: Buffer,
  durationSeconds: number = 30,
  filename: string = 'audio.mp3'
): Promise<Buffer> {
  // Check if ffmpeg is available
  let ffmpeg: any;
  try {
    ffmpeg = require('fluent-ffmpeg');
  } catch (error) {
    throw new Error('ffmpeg not available. Please install fluent-ffmpeg: npm install fluent-ffmpeg');
  }

  const tempInputPath = join(tmpdir(), `acrcloud_upload_${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
  const tempOutputPath = join(tmpdir(), `acrcloud_sample_${Date.now()}.mp3`);

  try {
    // Save buffer to temp location
    await writeFile(tempInputPath, buffer);

    console.log('🎬 Extracting audio sample using ffmpeg...', {
      inputPath: tempInputPath,
      outputPath: tempOutputPath,
      durationSeconds,
      inputSize: buffer.length
    });

    // Extract sample using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempInputPath)
        .setStartTime(0) // Start from beginning
        .duration(durationSeconds) // Extract X seconds
        .audioCodec('libmp3lame') // MP3 codec
        .audioBitrate('128k') // 128kbps (ACRCloud doesn't need high quality)
        .outputOptions('-y') // Overwrite output file
        .output(tempOutputPath)
        .on('start', (commandLine: string) => {
          console.log('🎬 ffmpeg command:', commandLine);
        })
        .on('end', () => {
          console.log('✅ Audio sample extraction complete');
          resolve();
        })
        .on('error', (err: any) => {
          console.error('❌ ffmpeg error:', err);
          reject(new Error(`Audio sampling failed: ${err.message || 'Unknown error'}`));
        })
        .on('stderr', (stderrLine: string) => {
          // Log ffmpeg stderr for debugging (non-fatal warnings)
          if (stderrLine.includes('error') || stderrLine.includes('Error')) {
            console.warn('⚠️ ffmpeg stderr:', stderrLine);
          }
        })
        .run();
    });

    // Read the sample
    const sampleBuffer = await readFile(tempOutputPath);

    // Cleanup temp files
    await unlink(tempInputPath).catch((err) => {
      console.warn('⚠️ Failed to cleanup temp input file:', err);
    });
    await unlink(tempOutputPath).catch((err) => {
      console.warn('⚠️ Failed to cleanup temp output file:', err);
    });

    return sampleBuffer;

  } catch (error: any) {
    // Cleanup on error
    await unlink(tempInputPath).catch(() => {});
    await unlink(tempOutputPath).catch(() => {});

    throw error;
  }
}

/**
 * Extract audio sample from uploaded file using ffmpeg
 * Extracts the first N seconds of audio for ACRCloud fingerprinting
 * 
 * @param file - Uploaded audio file
 * @param durationSeconds - Sample duration in seconds (default: 30)
 * @returns Buffer containing audio sample
 */
async function extractAudioSample(
  file: File,
  durationSeconds: number = 30
): Promise<Buffer> {
  // Check if ffmpeg is available
  let ffmpeg: any;
  try {
    ffmpeg = require('fluent-ffmpeg');
  } catch (error) {
    throw new Error('ffmpeg not available. Please install fluent-ffmpeg: npm install fluent-ffmpeg');
  }

  const tempInputPath = join(tmpdir(), `acrcloud_upload_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
  const tempOutputPath = join(tmpdir(), `acrcloud_sample_${Date.now()}.mp3`);

  try {
    // Save uploaded file to temp location
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(tempInputPath, buffer);

    console.log('🎬 Extracting audio sample using ffmpeg...', {
      inputPath: tempInputPath,
      outputPath: tempOutputPath,
      durationSeconds
    });

    // Extract sample using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempInputPath)
        .setStartTime(0) // Start from beginning
        .duration(durationSeconds) // Extract X seconds
        .audioCodec('libmp3lame') // MP3 codec
        .audioBitrate('128k') // 128kbps (ACRCloud doesn't need high quality)
        .outputOptions('-y') // Overwrite output file
        .output(tempOutputPath)
        .on('start', (commandLine: string) => {
          console.log('🎬 ffmpeg command:', commandLine);
        })
        .on('end', () => {
          console.log('✅ Audio sample extraction complete');
          resolve();
        })
        .on('error', (err: any) => {
          console.error('❌ ffmpeg error:', err);
          reject(new Error(`Audio sampling failed: ${err.message || 'Unknown error'}`));
        })
        .on('stderr', (stderrLine: string) => {
          // Log ffmpeg stderr for debugging (non-fatal warnings)
          if (stderrLine.includes('error') || stderrLine.includes('Error')) {
            console.warn('⚠️ ffmpeg stderr:', stderrLine);
          }
        })
        .run();
    });

    // Read the sample
    const sampleBuffer = await readFile(tempOutputPath);

    // Cleanup temp files
    await unlink(tempInputPath).catch((err) => {
      console.warn('⚠️ Failed to cleanup temp input file:', err);
    });
    await unlink(tempOutputPath).catch((err) => {
      console.warn('⚠️ Failed to cleanup temp output file:', err);
    });

    return sampleBuffer;

  } catch (error: any) {
    // Cleanup on error
    await unlink(tempInputPath).catch(() => {});
    await unlink(tempOutputPath).catch(() => {});

    throw error;
  }
}

