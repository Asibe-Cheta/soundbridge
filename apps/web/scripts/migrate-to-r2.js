/**
 * Phase 5: One-time migration — copy audio files from Supabase Storage (audio-tracks)
 * to Cloudflare R2, verify size, update audio_tracks.file_url (and audio_url if present).
 *
 * Does NOT delete objects from Supabase (manual cleanup after verification).
 *
 * Prerequisites (same as web R2 uploads — already on Vercel / .env.local):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_ACCESS_KEY_ID
 *   CLOUDFLARE_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME
 *   R2_PUBLIC_URL
 *
 * Run from apps/web:
 *   npm run migrate-files
 *   npm run migrate-files -- --dry-run
 *   npm run migrate-files -- --limit=100
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const STORAGE_PREFIX = '/storage/v1/object/public/audio-tracks/';
const BUCKET = 'audio-tracks';

function getArg(name, def) {
  const prefixed = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefixed));
  if (hit) return hit.slice(prefixed.length);
  if (process.argv.includes(`--${name}`) && def === true) return true;
  return def;
}

const dryRun = process.argv.includes('--dry-run');
const limitRaw = getArg('limit', '');
const limit = limitRaw ? Math.max(1, parseInt(limitRaw, 10) || 0) : null;

function requireEnv(key) {
  const v = process.env[key];
  if (!v) {
    console.error(`Missing required env: ${key}`);
    process.exit(1);
  }
  return v;
}

function extractStoragePath(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  try {
    const u = new URL(fileUrl);
    const idx = u.pathname.indexOf(STORAGE_PREFIX);
    if (idx >= 0) {
      return decodeURIComponent(u.pathname.slice(idx + STORAGE_PREFIX.length));
    }
  } catch {
    // ignore
  }
  if (fileUrl.includes(`${BUCKET}/`)) {
    const i = fileUrl.indexOf(`${BUCKET}/`);
    return decodeURIComponent(fileUrl.slice(i + `${BUCKET}/`.length).split('?')[0]);
  }
  return null;
}

function isSupabasePublicAudioUrl(url) {
  if (!url) return false;
  return (
    url.includes('supabase.co') &&
    (url.includes('/storage/v1/object/public/audio-tracks/') || url.includes(`/${BUCKET}/`))
  );
}

function isAlreadyR2Url(url, publicBase, bucket) {
  if (!url || !publicBase) return false;
  const base = publicBase.replace(/\/$/, '');
  return url.startsWith(`${base}/${bucket}/`) || url.includes('.r2.dev');
}

function guessContentType(storagePath) {
  const ext = storagePath.split('.').pop()?.toLowerCase() || '';
  const map = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
    ogg: 'audio/ogg',
  };
  return map[ext] || 'application/octet-stream';
}

function buildR2PublicUrl(publicBaseUrl, bucketName, objectKey) {
  const base = publicBaseUrl.replace(/\/$/, '');
  const cleanKey = objectKey.replace(/^\/+/, '');
  return `${base}/${bucketName}/${cleanKey}`;
}

async function main() {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const accessKeyId = requireEnv('CLOUDFLARE_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('CLOUDFLARE_SECRET_ACCESS_KEY');
  const r2Bucket = requireEnv('R2_BUCKET_NAME');
  const r2Public = requireEnv('R2_PUBLIC_URL');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  console.log(`\n🔧 R2 migration ${dryRun ? '(DRY RUN — no upload/DB updates)' : ''}`);
  console.log(`   Bucket: ${r2Bucket}  Public base: ${r2Public}\n`);

  let query = supabase
    .from('audio_tracks')
    .select('id,file_url')
    .not('file_url', 'is', null)
    .order('created_at', { ascending: true });

  if (limit) query = query.limit(limit);

  const { data: rows, error: qErr } = await query;

  if (qErr) {
    console.error('Query error:', qErr);
    process.exit(1);
  }

  const candidates = (rows || []).filter(
    (r) => r.file_url && isSupabasePublicAudioUrl(r.file_url) && !isAlreadyR2Url(r.file_url, r2Public, r2Bucket)
  );

  console.log(`Rows loaded: ${(rows || []).length}  |  To migrate (Supabase audio URLs): ${candidates.length}\n`);

  let success = 0;
  let skipped = 0;
  const failures = [];

  let i = 0;
  for (const row of candidates) {
    i += 1;
    const { id, file_url: fileUrl } = row;
    const storagePath = extractStoragePath(fileUrl);

    if (!storagePath) {
      failures.push({ id, fileUrl, reason: 'Could not parse storage path' });
      console.log(`[${i}/${candidates.length}] SKIP ${id} — bad path`);
      continue;
    }

    const r2ObjectKey = `migrated/supabase-audio-tracks/${storagePath}`;

    console.log(`[${i}/${candidates.length}] ${id}  ${storagePath}`);

    try {
      const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(storagePath);
      if (dlErr || !blob) {
        failures.push({ id, fileUrl, reason: dlErr?.message || 'download failed' });
        console.log(`   ❌ Download failed: ${dlErr?.message || 'no data'}`);
        continue;
      }

      const buf = Buffer.from(await blob.arrayBuffer());
      const srcSize = buf.length;
      if (srcSize === 0) {
        failures.push({ id, fileUrl, reason: 'empty file' });
        console.log(`   ❌ Empty file`);
        continue;
      }

      if (dryRun) {
        console.log(`   … dry-run: would upload ${srcSize} bytes → ${r2ObjectKey}`);
        success += 1;
        continue;
      }

      await s3.send(
        new PutObjectCommand({
          Bucket: r2Bucket,
          Key: r2ObjectKey,
          Body: buf,
          ContentType: guessContentType(storagePath),
          ContentLength: srcSize,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );

      const newUrl = buildR2PublicUrl(r2Public, r2Bucket, r2ObjectKey);

      const { error: upErr } = await supabase.from('audio_tracks').update({ file_url: newUrl }).eq('id', id);

      if (upErr) {
        failures.push({ id, fileUrl, reason: `DB update failed: ${upErr.message}` });
        console.log(`   ❌ DB update failed: ${upErr.message}`);
        continue;
      }

      success += 1;
      console.log(`   ✅ Migrated ${srcSize} bytes → ${newUrl}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push({ id, fileUrl, reason: msg });
      console.log(`   ❌ ${msg}`);
    }
  }

  const notTargeted = (rows || []).length - candidates.length;

  console.log('\n========== REPORT ==========');
  console.log(`Success:  ${success}`);
  console.log(`Failed:   ${failures.length}`);
  console.log(`Not targeted (already R2 or non-Supabase URL): ${notTargeted}`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(`  - ${f.id}: ${f.reason}  (${f.fileUrl?.slice(0, 80)}…)`));
  }
  console.log('\nSupabase objects were NOT deleted. Remove them manually after spot-checking playback.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
