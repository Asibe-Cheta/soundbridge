# Cloudflare R2 Migration (Implemented)

## Install Command

```bash
npm install @aws-sdk/client-s3
```

## Environment Variables

**Production:** These are already configured on Vercel (deployed). For local or one-off scripts, use `apps/web/.env.local` with the same names and values.

```bash
# Cloudflare account ID (R2 dashboard URL / account settings)
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id

# R2 API token credentials (R2 -> Manage R2 API tokens)
CLOUDFLARE_ACCESS_KEY_ID=your_r2_access_key_id
CLOUDFLARE_SECRET_ACCESS_KEY=your_r2_secret_access_key

# Existing bucket in your Cloudflare account
R2_BUCKET_NAME=soundbridge-audio

# Public R2 domain (bucket public access URL)
# Example: https://pub-abc1234567890.r2.dev
R2_PUBLIC_URL=https://pub-your-account-hash.r2.dev
```

## Implemented Endpoints / Files

- `src/lib/r2-client.ts` — R2 S3 client + URL builder
- `src/lib/audio-upload-security.ts` — file type/size + filename sanitization
- `app/api/upload/audio-file/route.ts` — authenticated audio uploads to R2
- `src/lib/upload-service.ts` — client upload flow now sends audio to `/api/upload/audio-file`
- `app/api/upload/route.ts` — supports R2 upload from `fileData` payload when `audioFileUrl` is missing
- `app/upload/page.tsx` — temporary fingerprint uploads now use R2 upload API

## Request / Response Example

### Request
- `POST /api/upload/audio-file`
- `multipart/form-data`
- field: `audioFile` (File)

### Success Response

```json
{
  "success": true,
  "url": "https://pub-xxxx.r2.dev/soundbridge-audio/audio/<userId>/<timestamp>-<name>-<rand>.mp3",
  "objectKey": "audio/<userId>/<timestamp>-<name>-<rand>.mp3",
  "size": 10485760,
  "contentType": "audio/mpeg"
}
```

### Error Response

```json
{
  "error": "Invalid audio file extension. Allowed: .mp3, .wav, .m4a, .flac, .ogg"
}
```

## Phase 5 — Migrate existing Supabase audio to R2 (one-off)

Script: `apps/web/scripts/migrate-to-r2.js`

**What it does**

- Loads rows from `audio_tracks` with a `file_url` pointing at **Supabase public storage** (`…/storage/v1/object/public/audio-tracks/…`).
- Skips rows already on R2 (`R2_PUBLIC_URL` / `r2.dev`).
- For each row: downloads from Supabase `audio-tracks` (service role), uploads the same bytes to R2 under  
  `migrated/supabase-audio-tracks/<original-path>`, updates `file_url` to the new public R2 URL.
- **Does not delete** objects in Supabase (verify playback, then clean up storage manually if desired).

**Requirements**

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (required for download + DB update)
- Same R2 env vars as production uploads (`CLOUDFLARE_*`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`)

**Run** (from `apps/web/`):

```bash
npm run migrate-files -- --dry-run
npm run migrate-files
npm run migrate-files -- --limit=200
```

**Note:** If your database keeps `audio_url` in sync with `file_url` via a trigger, updating `file_url` is enough. If not, run a one-time SQL to align `audio_url` from `file_url` after migration.
