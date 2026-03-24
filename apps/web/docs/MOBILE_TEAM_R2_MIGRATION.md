# Mobile team — Cloudflare R2 & audio URLs

This note replaces the earlier informal summary. **Production web env is already deployed** (all R2 + Supabase variables on Vercel). **Phase 5** (one-off migration of existing Supabase Storage audio to R2) is **implemented in-repo**; it must be run from a machine that has the **full** env (see below), not assumed to run inside Cursor’s sandbox.

---

## 1. What `CLOUDFLARE.MD` asked for vs what shipped

| Phase | Status |
|-------|--------|
| 1–2 | R2 client, upload path, validation (`apps/web/src/lib/r2-client.ts`, `audio-upload-security.ts`, `POST /api/upload/audio-file`) |
| 3 | New uploads store **public R2 URLs** in `audio_tracks.file_url` |
| 4 | Playback: any HTTPS audio URL; native players unchanged |
| 5 | **Script:** `apps/web/scripts/migrate-to-r2.js` — `npm run migrate-files` |

---

## 2. Public URL shape (after migration / new uploads)

```text
{R2_PUBLIC_URL}/{R2_BUCKET_NAME}/{objectKey}
```

Example:

```text
https://pub-….r2.dev/soundbridge-audio/migrated/supabase-audio-tracks/<userId>/<file>.mp3
```

Legacy rows may still show `https://…supabase.co/storage/v1/object/public/audio-tracks/…` until the migration script is executed successfully.

---

## 3. Production environment (already configured)

**These are live on Vercel** for the web app — no pending “add these” step for production:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ACCESS_KEY_ID`
- `CLOUDFLARE_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME` (e.g. `soundbridge-audio`)
- `R2_PUBLIC_URL` (e.g. `https://pub-….r2.dev` or a future custom audio domain)

Server-only — **never** `NEXT_PUBLIC_*` for secrets.

---

## 4. R2 bucket CORS (web only)

For browsers / WebViews loading audio cross-origin from the R2 public host:

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
      "Content-Range",
      "Accept-Ranges"
    ],
    "MaxAgeSeconds": 86400
  }
]
```

**Native iOS/Android** players streaming a plain HTTPS `file_url` are **not** gated by browser CORS the same way.

---

## 5. Mobile app behaviour

- **Playback:** Keep using whatever API returns for `file_url` (or `audio_url` if exposed). Values may be Supabase **or** R2 URLs during transition.
- **Uploads:** If mobile still uploads to Supabase and sends that URL to the API, those rows stay Supabase until migrated or re-uploaded. Align with backend when moving mobile uploads to the same server-side R2 path as web.
- **Do not** embed R2 secret keys in the app.

---

## 6. Phase 5 — running the migration

**Script:** from `apps/web`:

```bash
npm run migrate-files -- --dry-run
npm run migrate-files
npm run migrate-files -- --limit=100
```

**Env required locally (or in a secure runner):**

- `NEXT_PUBLIC_SUPABASE_URL` **or** `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- All five R2 variables (same names as Vercel)

If `.env.local` only has web vars and R2 lives only on Vercel, copy the R2 + service role values into `.env.local` **for that run** (or use `vercel env pull`), then execute. The migration **does not delete** Supabase objects.

After migration: spot-check tracks; optionally backfill `audio_url` from `file_url` if your DB has no sync trigger.

---

## 7. Operational note

Running `migrate-files` from this repo **on a developer machine** is expected. Automated runs from CI need injected secrets. **Dry-run** is safe to preview counts; real runs change `file_url` in the database.
