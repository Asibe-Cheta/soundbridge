# Mobile team — Cloudflare R2 audio storage (full brief)

**Purpose:** One document you can share with mobile engineering. It matches the web team’s `CLOUDFLARE.MD` plan, describes what was built, what is live in production, and what mobile clients should do.

---

## Executive summary

- **Audio files** for the web upload flow are stored in **Cloudflare R2** (S3-compatible), not Supabase Storage, for **new uploads** and for **existing tracks we migrated**.
- **Supabase** remains used for **database + auth** (and legacy storage objects until manually cleaned up).
- **Production Vercel** already has all **server-side** R2 environment variables.
- **Bucket:** `soundbridge-audio`. **Public URLs** use the Cloudflare **Public Development URL** (`https://pub-….r2.dev`) until/unless we attach a **custom domain** later.
- **Phase 5 (one-time migration)** has been **run successfully** on the current dataset: **6** `audio_tracks` rows were moved from Supabase public URLs to R2; **`file_url`** in the database now points at R2. **Original files were not deleted from Supabase** (ops can remove them after QA).

---

## Mapping to `CLOUDFLARE.MD` phases

| Phase | Intent | Status on web |
|-------|--------|----------------|
| **1** | R2 client, env, AWS SDK | `apps/web/src/lib/r2-client.ts`; dependency `@aws-sdk/client-s3` |
| **2** | Upload to R2, validation, public URL | `POST /api/upload/audio-file` (`multipart/form-data`, field `audioFile`); `apps/web/src/lib/audio-upload-security.ts` (extensions: `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`; max **50MB** for this path) |
| **3** | Persist R2 URLs in DB | `audio_tracks.file_url` stores the returned public HTTPS URL |
| **4** | Playback | Any normal HTTPS audio URL; players use `file_url` (or `audio_url` if your API exposes it) as today |
| **5** | Migrate legacy Supabase files | `apps/web/scripts/migrate-to-r2.js` — `npm run migrate-files`; **executed** — 6/6 success, 0 failures |

---

## Repository reference (web)

| Path | Role |
|------|------|
| `apps/web/src/lib/r2-client.ts` | S3 client for R2, `buildR2PublicUrl` |
| `apps/web/src/lib/audio-upload-security.ts` | Validation + safe object key (`audio/<userId>/…`) |
| `apps/web/app/api/upload/audio-file/route.ts` | Authenticated upload to R2 |
| `apps/web/src/lib/upload-service.ts` | Web client upload uses `/api/upload/audio-file` |
| `apps/web/app/api/upload/route.ts` | Legacy JSON path can upload base64 `fileData` to R2 |
| `apps/web/app/upload/page.tsx` | Large-file ACR fingerprint temp upload uses same API |
| `apps/web/scripts/migrate-to-r2.js` | Phase 5 migration |
| `apps/web/docs/cloudflare-r2-migration.md` | Technical runbook for web/ops |

---

## Public URL formats

**New uploads** (object key pattern):

```text
{R2_PUBLIC_URL}/{R2_BUCKET_NAME}/audio/<userId>/<timestamp>-<slug>-<rand>.<ext>
```

**Migrated legacy rows** (preserves original storage path under a prefix):

```text
{R2_PUBLIC_URL}/{R2_BUCKET_NAME}/migrated/supabase-audio-tracks/<original-supabase-path>
```

Example pattern:

```text
https://pub-<hash>.r2.dev/soundbridge-audio/migrated/supabase-audio-tracks/<uuid>/<file>.mp3
```

**Old format** (only if a row were never migrated):

```text
https://<project>.supabase.co/storage/v1/object/public/audio-tracks/...
```

---

## Production environment (complete)

The following are **already set on Vercel** for the Next.js app (server secrets — **never** expose as `NEXT_PUBLIC_*`):

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ACCESS_KEY_ID`
- `CLOUDFLARE_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME` → `soundbridge-audio`
- `R2_PUBLIC_URL` → `https://pub-….r2.dev` (current dev public URL)

No further “pending setup” for these five in production.

---

## R2 bucket CORS policy (web / WebView) — required for playback

Audio players use **HTTP Range** requests (`Accept-Ranges`, `Content-Range`, `Content-Length`). If the bucket has **no CORS**, or CORS omits **ExposeHeaders** for those, **browsers can fail to stream** cross-origin audio: UI may show **playing at 0:00** with no progress. **WebViews** that load the site are subject to the same rules as the browser.

**Where to set:** Cloudflare Dashboard → **R2** → **`soundbridge-audio`** → **Settings** → **CORS policy**.

### If playback is broken (web + mobile Web): apply this first (broad read access)

Use this when you need **maximum compatibility** (production web, WebView, varied `Origin` headers). Bucket is **public read-only**; only **GET** / **HEAD** are allowed.

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": [
      "Content-Length",
      "Content-Type",
      "Accept-Ranges",
      "Content-Range",
      "ETag"
    ],
    "MaxAgeSeconds": 86400
  }
]
```

### Tighter option (production web origins only)

Add **`http://localhost:3000`** (and any dev host) if local web QA needs it.

```json
[
  {
    "AllowedOrigins": [
      "https://soundbridge.live",
      "https://www.soundbridge.live"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type",
      "Content-Range",
      "Accept-Ranges"
    ],
    "MaxAgeSeconds": 86400
  }
]
```

### Verify before/after

1. Open a live **`file_url`** (or **`audio_url`**) in a **new browser tab** — expect **200** and file download/play. **403** → fix **public access** or URL path, not CORS alone.
2. In DevTools **Network**, play the same URL in the app — confirm **GET** succeeds and **206 Partial Content** may appear for range requests.
3. Check **Cloudflare WAF** is not blocking requests with **`Range`** headers to **`*.r2.dev`**.

**Uploads** from the browser go **via our backend** (`PutObject` with secrets), so CORS does **not** need `PUT`/`POST` on the bucket for uploads.

**Pure native players** (AVPlayer / ExoPlayer hitting `https://…` directly) are not browser CORS; if those still fail, suspect **URL**, **TLS**, **403**, or **redirect** — but **WebView + website audio** is CORS-sensitive like desktop Safari/Chrome.

---

## Mobile app — integration guidance

### Playback

- Continue using **`file_url`** (and **`audio_url`** if your endpoints return it) exactly as today.
- Values may be **Supabase** or **R2** depending on row age and migration; after migration on our side, **`file_url`** for the migrated set is **R2**.
- If **`audio_url`** exists and was duplicated from `file_url` at insert time, confirm with backend whether a one-time sync from `file_url` is needed after migration (DB trigger may already keep them aligned).

### Uploads

- **Do not** ship R2 access keys in the app.
- If mobile still uploads audio to **Supabase Storage** and posts that URL to an API, those flows are **unchanged** until product/engineering align on using the **same server-mediated R2 upload** as web (cookie/session vs token pattern TBD for native).

### Testing

- Pick a track returned by API whose `file_url` starts with `https://pub-` and verify **play**, **seek**, and **download/offline** if applicable.
- Regression: a known **Supabase** URL should still play until that object is removed (we have **not** deleted Supabase objects yet).

---

## Phase 5 migration — outcome (this environment)

| Step | Result |
|------|--------|
| Dry run | 6 tracks eligible |
| `npm run migrate-files` | **6 migrated**, **0** failures |
| Follow-up `migrate-files --limit=100` | **0** eligible (all already R2) |

**Important:** Supabase **still contains** the original objects; deletion is **manual** after you’re happy with R2 playback and backups.

---

## API surface (for awareness)

- **`POST /api/upload/audio-file`** — web-oriented; **`multipart/form-data`**, field **`audioFile`**; requires session/auth as implemented. **Not** documented here as the mobile contract; coordinate if native should use the same or a dedicated mobile upload route.

Example **success** shape:

```json
{
  "success": true,
  "url": "https://pub-….r2.dev/soundbridge-audio/audio/<userId>/…",
  "objectKey": "audio/<userId>/…",
  "size": 10485760,
  "contentType": "audio/mpeg"
}
```

---

## Optional SQL if `audio_url` drifts from `file_url`

Only if your schema has **`audio_url`** and no trigger keeps it in sync:

```sql
UPDATE audio_tracks
SET audio_url = file_url
WHERE file_url IS NOT NULL
  AND (audio_url IS DISTINCT FROM file_url);
```

Run only after confirming column semantics with backend.

---

## Single point of contact

Questions: web/backend team. **Source doc in repo:** `apps/web/docs/MOBILE_TEAM_R2_MIGRATION.md` (this file).
