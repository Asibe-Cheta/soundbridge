// Whisper Transcription Service for SoundBridge
// Self-hosted Whisper AI for audio transcription (£0 cost)

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

/**
 * Whisper model options (ordered by speed/accuracy tradeoff)
 * - tiny: Fastest, lowest accuracy (~1GB RAM, 32x realtime)
 * - base: Good balance (~1GB RAM, 16x realtime) ✅ RECOMMENDED
 * - small: Better accuracy (~2GB RAM, 6x realtime)
 * - medium: High accuracy (~5GB RAM, 2x realtime)
 * - large: Best accuracy (~10GB RAM, 1x realtime)
 */
export type WhisperModel = 'tiny' | 'base' | 'small' | 'medium' | 'large';

/**
 * Whisper transcription options
 */
export interface WhisperTranscriptionOptions {
  model?: WhisperModel; // Default: 'base'
  language?: string; // Auto-detect if not specified
  sampleOnly?: boolean; // Transcribe only first 2 minutes (for podcasts)
  maxDuration?: number; // Maximum duration to transcribe in seconds
  temperature?: number; // Temperature for sampling (0.0-1.0)
  suppressBlank?: boolean; // Suppress blank output
}

/**
 * Transcription result
 */
export interface TranscriptionResult {
  text: string; // Transcribed text
  language?: string; // Detected language
  duration: number; // Audio duration in seconds
  modelUsed: WhisperModel; // Model used for transcription
  processingTime: number; // Time taken to transcribe (seconds)
  isSampled: boolean; // Whether only a sample was transcribed
  confidence?: number; // Optional confidence score
}

/**
 * Check if Whisper is installed on the system
 */
export async function isWhisperInstalled(): Promise<boolean> {
  try {
    // Check if whisper command is available
    await execAsync('which whisper || where whisper');
    return true;
  } catch (error) {
    console.error('Whisper is not installed:', error);
    return false;
  }
}

/**
 * Get installation instructions for Whisper
 */
export function getWhisperInstallInstructions(): string {
  return `
To use Whisper transcription, you need to install OpenAI Whisper:

1. Install Python 3.8+ (if not already installed)
2. Install ffmpeg:
   - macOS: brew install ffmpeg
   - Ubuntu: sudo apt update && sudo apt install ffmpeg
   - Windows: Download from https://ffmpeg.org/download.html

3. Install Whisper:
   pip install -U openai-whisper

4. Test installation:
   whisper --help

For more info: https://github.com/openai/whisper

Alternative: Use Whisper.cpp for faster CPU inference:
https://github.com/ggerganov/whisper.cpp
`;
}

/**
 * Extract audio sample (first N minutes) for faster processing
 * @param inputPath - Path to full audio file
 * @param outputPath - Path for sampled audio output
 * @param durationSeconds - Duration to extract (default: 120 seconds = 2 minutes)
 */
async function extractAudioSample(
  inputPath: string,
  outputPath: string,
  durationSeconds: number = 120
): Promise<void> {
  try {
    // Use ffmpeg to extract first N seconds
    const command = `ffmpeg -i "${inputPath}" -t ${durationSeconds} -c copy "${outputPath}" -y`;
    await execAsync(command);
  } catch (error) {
    console.error('Error extracting audio sample:', error);
    throw new Error('Failed to extract audio sample');
  }
}

/**
 * Transcribe audio file using Whisper
 *
 * @param audioPath - Path to audio file (local file system path)
 * @param options - Transcription options
 * @returns Transcription result with text and metadata
 */
export async function transcribeAudio(
  audioPath: string,
  options: WhisperTranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const startTime = Date.now();

  const {
    model = 'base',
    language,
    sampleOnly = false,
    maxDuration = 120, // 2 minutes default
    temperature = 0.0,
    suppressBlank = true
  } = options;

  // Check if Whisper is installed
  const whisperInstalled = await isWhisperInstalled();
  if (!whisperInstalled) {
    throw new Error(
      `Whisper is not installed. ${getWhisperInstallInstructions()}`
    );
  }

  let tempSamplePath: string | null = null;
  let fileToTranscribe = audioPath;

  try {
    // If sampleOnly is true, extract first N minutes
    if (sampleOnly) {
      tempSamplePath = path.join(
        tmpdir(),
        `whisper-sample-${Date.now()}.${path.extname(audioPath)}`
      );

      console.log(`Extracting ${maxDuration}s sample for transcription...`);
      await extractAudioSample(audioPath, tempSamplePath, maxDuration);
      fileToTranscribe = tempSamplePath;
    }

    // Build Whisper command
    const languageFlag = language ? `--language ${language}` : '';
    const outputDir = tmpdir();
    const outputFormat = 'txt'; // Plain text output

    const command = `whisper "${fileToTranscribe}" \
      --model ${model} \
      ${languageFlag} \
      --temperature ${temperature} \
      --output_dir "${outputDir}" \
      --output_format ${outputFormat} \
      ${suppressBlank ? '--suppress_blank True' : ''}`;

    console.log(`Running Whisper transcription (model: ${model})...`);

    // Run Whisper
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    // Log Whisper output
    if (stderr) {
      console.log('Whisper stderr:', stderr);
    }

    // Read transcription result
    const baseFileName = path.basename(fileToTranscribe, path.extname(fileToTranscribe));
    const transcriptPath = path.join(outputDir, `${baseFileName}.txt`);

    let transcriptText = '';
    try {
      transcriptText = await fs.readFile(transcriptPath, 'utf-8');
      transcriptText = transcriptText.trim();

      // Clean up temporary transcript file
      await fs.unlink(transcriptPath);
    } catch (readError) {
      console.error('Error reading transcript file:', readError);
      throw new Error('Failed to read transcription output');
    }

    // Clean up temporary sample file if created
    if (tempSamplePath) {
      try {
        await fs.unlink(tempSamplePath);
      } catch (unlinkError) {
        console.warn('Could not delete temp sample file:', unlinkError);
      }
    }

    const processingTime = (Date.now() - startTime) / 1000;

    console.log(`✅ Transcription complete in ${processingTime.toFixed(1)}s`);

    return {
      text: transcriptText,
      language: language || 'auto',
      duration: sampleOnly ? maxDuration : 0, // Would need to get actual duration
      modelUsed: model,
      processingTime,
      isSampled: sampleOnly
    };

  } catch (error) {
    console.error('Whisper transcription error:', error);

    // Clean up temp files on error
    if (tempSamplePath) {
      try {
        await fs.unlink(tempSamplePath);
      } catch (unlinkError) {
        // Ignore cleanup errors
      }
    }

    throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Transcribe audio from URL (downloads to temp file first)
 *
 * @param audioUrl - URL to audio file
 * @param options - Transcription options
 * @returns Transcription result
 */
export async function transcribeAudioFromUrl(
  audioUrl: string,
  options: WhisperTranscriptionOptions = {}
): Promise<TranscriptionResult> {
  let tempFilePath: string | null = null;

  try {
    // Download audio to temporary file
    console.log('Downloading audio file for transcription...');

    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file extension from URL or content type
    const contentType = response.headers.get('content-type');
    let extension = '.mp3'; // default

    if (contentType) {
      if (contentType.includes('wav')) extension = '.wav';
      else if (contentType.includes('m4a')) extension = '.m4a';
      else if (contentType.includes('ogg')) extension = '.ogg';
      else if (contentType.includes('flac')) extension = '.flac';
    }

    // Save to temp file
    tempFilePath = path.join(tmpdir(), `whisper-download-${Date.now()}${extension}`);
    await fs.writeFile(tempFilePath, buffer);

    console.log(`Audio downloaded to: ${tempFilePath}`);

    // Transcribe
    const result = await transcribeAudio(tempFilePath, options);

    // Clean up temp file
    await fs.unlink(tempFilePath);

    return result;

  } catch (error) {
    console.error('Error transcribing audio from URL:', error);

    // Clean up temp file on error
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (unlinkError) {
        // Ignore cleanup errors
      }
    }

    throw error;
  }
}

/**
 * Get estimated transcription time
 * @param audioDuration - Duration of audio in seconds
 * @param model - Whisper model to use
 * @returns Estimated processing time in seconds
 */
export function estimateTranscriptionTime(
  audioDuration: number,
  model: WhisperModel = 'base'
): number {
  // Real-time factors (approximate, depends on hardware)
  const realtimeFactors: Record<WhisperModel, number> = {
    tiny: 32,   // 32x faster than realtime
    base: 16,   // 16x faster than realtime
    small: 6,   // 6x faster than realtime
    medium: 2,  // 2x faster than realtime
    large: 1    // 1x realtime (as fast as the audio plays)
  };

  const factor = realtimeFactors[model];
  return audioDuration / factor;
}
