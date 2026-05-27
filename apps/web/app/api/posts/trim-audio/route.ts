import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import ffmpegStatic from 'ffmpeg-static';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

const execFileAsync = promisify(execFile);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

const AUDIO_BUCKET = 'audio-tracks';
const OUTPUT_PREFIX = 'post-clips';
const MAX_INPUT_DURATION_SECONDS = 10 * 60;
const MAX_CLIP_SECONDS = 60;
const MAX_INPUT_BYTES = 150 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['mp3', 'm4a', 'aac', 'wav']);

type TrimAudioBody = {
  file_url?: unknown;
  start_seconds?: unknown;
  end_seconds?: unknown;
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status, headers: corsHeaders });
}

function getFfmpegPath(): string {
  return process.env.FFMPEG_PATH?.trim() || ffmpegStatic || 'ffmpeg';
}

function assertFiniteSeconds(value: unknown, field: string): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new HttpError(400, `${field} must be a valid number`);
  }
  return numberValue;
}

function parseAudioInputUrl(fileUrl: string): { extension: string } {
  let url: URL;
  try {
    url = new URL(fileUrl);
  } catch {
    throw new HttpError(400, 'file_url must be a valid URL');
  }

  // 1) Supabase public storage shape:
  //    https://<project>.supabase.co/storage/v1/object/public/audio-tracks/<path>
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new HttpError(503, 'Supabase URL is not configured');
  }

  const expectedSupabaseHost = new URL(supabaseUrl).hostname;
  if (url.hostname === expectedSupabaseHost) {
    const publicObjectPrefix = `/storage/v1/object/public/${AUDIO_BUCKET}/`;
    if (!url.pathname.startsWith(publicObjectPrefix)) {
      throw new HttpError(400, `file_url must be a public ${AUDIO_BUCKET} storage URL`);
    }

    const objectPath = decodeURIComponent(url.pathname.slice(publicObjectPrefix.length));
    if (!objectPath || objectPath.includes('..')) {
      throw new HttpError(400, 'file_url object path is invalid');
    }

    const extension = objectPath.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new HttpError(400, 'Supported input formats are MP3, M4A, AAC, and WAV');
    }
    return { extension };
  }

  // 2) Cloudflare R2 public development URL:
  //    https://pub-<hash>.r2.dev/audio/<userId>/<file>.<ext>
  //    https://pub-<hash>.r2.dev/migrated/supabase-audio-tracks/<uuid>/<file>.<ext>
  const r2PublicUrl = process.env.R2_PUBLIC_URL?.trim();
  if (r2PublicUrl) {
    const expectedR2Host = new URL(r2PublicUrl).hostname;
    if (url.hostname === expectedR2Host) {
      const p = url.pathname;
      const allowedPrefixes = ['/audio/', '/migrated/'];
      const matchesPrefix = allowedPrefixes.some((prefix) => p.startsWith(prefix));
      if (!matchesPrefix) {
        throw new HttpError(400, 'file_url must be a valid public R2 audio-tracks URL');
      }
      if (p.includes('..')) {
        throw new HttpError(400, 'file_url object path is invalid');
      }

      const extension = p.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        throw new HttpError(400, 'Supported input formats are MP3, M4A, AAC, and WAV');
      }
      return { extension };
    }
  }

  throw new HttpError(
    400,
    'file_url must be a public audio-tracks URL from Supabase or R2',
  );
}

async function downloadToBuffer(fileUrl: string): Promise<Buffer> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new HttpError(400, `Could not download audio file (${response.status})`);
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_INPUT_BYTES) {
    throw new HttpError(400, 'Audio file is too large to trim');
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length > MAX_INPUT_BYTES) {
    throw new HttpError(400, 'Audio file is too large to trim');
  }

  return buffer;
}

function parseFfmpegDuration(stderr: string): number | null {
  const match = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  return hours * 3600 + minutes * 60 + seconds;
}

async function getAudioDurationSeconds(ffmpegPath: string, inputPath: string): Promise<number> {
  try {
    await execFileAsync(ffmpegPath, ['-hide_banner', '-i', inputPath], { timeout: 20_000 });
  } catch (error: any) {
    const stderr = String(error?.stderr || '');
    const duration = parseFfmpegDuration(stderr);
    if (duration != null) return duration;

    if (error?.code === 'ENOENT') {
      throw new HttpError(503, 'FFmpeg is not available in this server environment');
    }
    throw new HttpError(400, 'Could not read audio duration');
  }

  throw new HttpError(400, 'Could not read audio duration');
}

async function trimAudio({
  ffmpegPath,
  inputPath,
  outputPath,
  startSeconds,
  clipSeconds,
}: {
  ffmpegPath: string;
  inputPath: string;
  outputPath: string;
  startSeconds: number;
  clipSeconds: number;
}) {
  try {
    await execFileAsync(
      ffmpegPath,
      [
        '-hide_banner',
        '-y',
        '-ss',
        String(startSeconds),
        '-i',
        inputPath,
        '-t',
        String(clipSeconds),
        '-vn',
        '-acodec',
        'libmp3lame',
        '-ar',
        '44100',
        '-ac',
        '2',
        '-b:a',
        '192k',
        outputPath,
      ],
      { timeout: 60_000 }
    );
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      throw new HttpError(503, 'FFmpeg is not available in this server environment');
    }
    console.error('[trim-audio] ffmpeg failed:', error?.stderr || error);
    throw new HttpError(500, 'Failed to trim audio');
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  let inputPath: string | null = null;
  let outputPath: string | null = null;

  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return jsonError('Authentication required', 401);
    }

    const body = (await request.json().catch(() => null)) as TrimAudioBody | null;
    if (!body || typeof body.file_url !== 'string') {
      return jsonError('file_url is required', 400);
    }

    const fileUrl = body.file_url.trim();
    const startSeconds = assertFiniteSeconds(body.start_seconds, 'start_seconds');
    const endSeconds = assertFiniteSeconds(body.end_seconds, 'end_seconds');
    const clipSeconds = endSeconds - startSeconds;

    if (startSeconds < 0 || endSeconds <= startSeconds) {
      return jsonError('end_seconds must be greater than start_seconds', 400);
    }
    if (clipSeconds > MAX_CLIP_SECONDS) {
      return jsonError('Clip length must be 60 seconds or less', 400);
    }

    const { extension } = parseAudioInputUrl(fileUrl);
    const inputBuffer = await downloadToBuffer(fileUrl);

    const workDir = path.join(os.tmpdir(), `soundbridge-trim-${randomUUID()}`);
    await mkdir(workDir, { recursive: true });
    inputPath = path.join(workDir, `input.${extension}`);
    outputPath = path.join(workDir, 'output.mp3');
    await writeFile(inputPath, inputBuffer);

    const ffmpegPath = getFfmpegPath();
    const inputDuration = await getAudioDurationSeconds(ffmpegPath, inputPath);
    if (inputDuration > MAX_INPUT_DURATION_SECONDS) {
      return jsonError('Input audio must be 10 minutes or less', 400);
    }
    if (endSeconds > inputDuration + 0.5) {
      return jsonError('end_seconds cannot exceed the input audio duration', 400);
    }

    await trimAudio({ ffmpegPath, inputPath, outputPath, startSeconds, clipSeconds });
    const trimmedBuffer = await readFile(outputPath);

    const outputObjectPath = `${OUTPUT_PREFIX}/${user.id}/${Date.now()}_${randomUUID()}_trimmed.mp3`;
    const service = createServiceClient();
    const { error: uploadError } = await service.storage
      .from(AUDIO_BUCKET)
      .upload(outputObjectPath, trimmedBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('[trim-audio] storage upload failed:', uploadError);
      return jsonError('Failed to upload trimmed audio', 500);
    }

    const { data: publicUrlData } = service.storage.from(AUDIO_BUCKET).getPublicUrl(outputObjectPath);

    return NextResponse.json(
      {
        success: true,
        data: {
          file_url: publicUrlData.publicUrl,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error.message, error.status);
    }

    console.error('[trim-audio] unexpected error:', error);
    return jsonError('Internal server error', 500);
  } finally {
    const tempDir = inputPath ? path.dirname(inputPath) : outputPath ? path.dirname(outputPath) : null;
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
