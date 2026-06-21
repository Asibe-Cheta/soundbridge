const EXPIRY_SECONDS = 604800; // 7 days

function parseSupabaseStorageUrl(
  fileUrl: string,
): { bucket: string; path: string } | null {
  const marker = '/storage/v1/object/';
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  const rest = fileUrl.slice(idx + marker.length);
  const parts = rest.split('/');
  if (parts.length < 2) return null;
  const access = parts[0];
  if (!access) return null;
  const bucket = parts[1];
  const path = parts.slice(2).join('/').split('?')[0];
  if (!bucket || !path) return null;
  return { bucket, path: decodeURIComponent(path) };
}

function r2KeyFromUrl(fileUrl: string, publicBase: string): string | null {
  const base = publicBase.replace(/\/$/, '');
  const normalized = fileUrl.split('?')[0];
  if (normalized.startsWith(base)) {
    const key = normalized.slice(base.length).replace(/^\/+/, '');
    return key || null;
  }
  try {
    const u = new URL(fileUrl);
    const pathKey = u.pathname.replace(/^\/+/, '');
    if (pathKey.startsWith('audio/')) return pathKey;
  } catch {
    /* ignore */
  }
  return null;
}

async function signR2Url(objectKey: string): Promise<string | null> {
  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const accessKeyId = Deno.env.get('CLOUDFLARE_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('CLOUDFLARE_SECRET_ACCESS_KEY');
  const bucket = Deno.env.get('R2_BUCKET_NAME');
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;

  try {
    const { S3Client, GetObjectCommand } = await import('npm:@aws-sdk/client-s3@3');
    const { getSignedUrl } = await import('npm:@aws-sdk/s3-request-presigner@3');
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    return await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
      { expiresIn: EXPIRY_SECONDS },
    );
  } catch (e) {
    console.error('[distribution-urls] R2 presign failed:', e);
    return null;
  }
}

export async function createDistributionAudioSignedUrl(
  supabase: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2').createClient>,
  fileUrl: string | null,
): Promise<string | null> {
  if (!fileUrl?.trim()) return null;

  const publicBase = Deno.env.get('R2_PUBLIC_URL') ?? '';
  const r2Key = publicBase ? r2KeyFromUrl(fileUrl, publicBase) : null;
  if (r2Key) {
    const signed = await signR2Url(r2Key);
    if (signed) return signed;
  }

  const parsed = parseSupabaseStorageUrl(fileUrl);
  if (parsed) {
    const { data, error } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, EXPIRY_SECONDS);
    if (!error && data?.signedUrl) return data.signedUrl;
  }

  return fileUrl;
}

export async function createDistributionCoverSignedUrl(
  supabase: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2').createClient>,
  coverUrl: string | null,
): Promise<string | null> {
  if (!coverUrl?.trim()) return null;

  const parsed = parseSupabaseStorageUrl(coverUrl);
  if (parsed) {
    const { data, error } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, EXPIRY_SECONDS);
    if (!error && data?.signedUrl) return data.signedUrl;
  }

  const coverMatch = coverUrl.match(/\/cover-art\/(.+?)(?:\?|$)/);
  if (coverMatch?.[1]) {
    const { data, error } = await supabase.storage
      .from('cover-art')
      .createSignedUrl(decodeURIComponent(coverMatch[1]), EXPIRY_SECONDS);
    if (!error && data?.signedUrl) return data.signedUrl;
  }

  return coverUrl;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendResendEmail(args: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY')?.trim();
  if (!apiKey) {
    console.error('[distribution-email] RESEND_API_KEY not set');
    return false;
  }

  const from =
    Deno.env.get('RESEND_FROM_EMAIL')?.trim() || 'SoundBridge <justice@soundbridge.live>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(args.to) ? args.to : [args.to],
      subject: args.subject,
      html: args.html,
      reply_to: args.replyTo,
    }),
  });

  if (!res.ok) {
    console.error('[distribution-email] Resend error:', await res.text());
    return false;
  }

  return true;
}
