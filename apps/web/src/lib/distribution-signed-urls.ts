import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createServiceClient } from '@/src/lib/supabase';
import { r2Client, r2Config } from '@/src/lib/r2-client';
import { DISTRIBUTION_SIGNED_URL_EXPIRY_SECONDS } from '@/src/lib/distribution-config';

function r2ObjectKeyFromUrl(fileUrl: string): string | null {
  const base = r2Config.publicBaseUrl.replace(/\/$/, '');
  const normalized = fileUrl.split('?')[0];
  if (!normalized.startsWith(base)) return null;
  const key = normalized.slice(base.length).replace(/^\/+/, '');
  return key || null;
}

function parseSupabaseStorageUrl(
  fileUrl: string,
): { bucket: string; path: string } | null {
  const marker = '/storage/v1/object/';
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;

  const rest = fileUrl.slice(idx + marker.length);
  const [access, ...parts] = rest.split('/');
  if (!access || parts.length === 0) return null;

  const bucket = parts[0];
  const path = parts.slice(1).join('/').split('?')[0];
  if (!bucket || !path) return null;

  return { bucket, path: decodeURIComponent(path) };
}

async function signedR2Url(objectKey: string): Promise<string | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: r2Config.bucketName,
      Key: objectKey,
    });
    return await getSignedUrl(r2Client, command, {
      expiresIn: DISTRIBUTION_SIGNED_URL_EXPIRY_SECONDS,
    });
  } catch (e) {
    console.error('[distribution-signed-urls] R2 presign failed:', e);
    return null;
  }
}

async function signedSupabaseUrl(bucket: string, path: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, DISTRIBUTION_SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data?.signedUrl) {
    console.error('[distribution-signed-urls] Supabase sign failed:', error?.message);
    return null;
  }

  return data.signedUrl;
}

/** 7-day download link for track audio (R2 or legacy Supabase audio-tracks). */
export async function createDistributionAudioSignedUrl(fileUrl: string | null): Promise<string | null> {
  if (!fileUrl?.trim()) return null;

  const r2Key = r2ObjectKeyFromUrl(fileUrl);
  if (r2Key) {
    return signedR2Url(r2Key);
  }

  const parsed = parseSupabaseStorageUrl(fileUrl);
  if (parsed) {
    return signedSupabaseUrl(parsed.bucket, parsed.path);
  }

  // Public R2-style path without full base match — try last path segment as key from URL pathname
  try {
    const u = new URL(fileUrl);
    const pathKey = u.pathname.replace(/^\/+/, '');
    if (pathKey.startsWith('audio/')) {
      return signedR2Url(pathKey);
    }
  } catch {
    /* not a valid URL */
  }

  return fileUrl;
}

/** 7-day download link for cover art (Supabase cover-art bucket or public URL). */
export async function createDistributionCoverSignedUrl(coverUrl: string | null): Promise<string | null> {
  if (!coverUrl?.trim()) return null;

  const parsed = parseSupabaseStorageUrl(coverUrl);
  if (parsed) {
    return signedSupabaseUrl(parsed.bucket, parsed.path);
  }

  // cover-art public URLs: extract path after /cover-art/ if present
  const coverMatch = coverUrl.match(/\/cover-art\/(.+?)(?:\?|$)/);
  if (coverMatch?.[1]) {
    return signedSupabaseUrl('cover-art', decodeURIComponent(coverMatch[1]));
  }

  return coverUrl;
}
