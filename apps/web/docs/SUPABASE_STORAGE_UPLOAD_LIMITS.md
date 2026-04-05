# Supabase Storage upload limits (SoundBridge)

Large audio (tracks, podcasts, **mixtapes up to 200MB**) may upload to the **`audio-tracks`** bucket (e.g. from mobile via `uploadAsync` to `/storage/v1/object/audio-tracks/...`).

Supabase enforces **two separate limits**. The **effective maximum upload size is the lower of the two**:

| Layer | Where to set | What it controls |
|--------|----------------|------------------|
| **Global (project)** | Dashboard → **Project Settings** → **Storage** → **Upload file size limit** | Max size for **any** single upload in the project |
| **Per bucket** | Dashboard → **Storage** → **Buckets** → **`audio-tracks`** → **Edit** → **Maximum file size** | Max size for one object in that bucket (`storage.buckets.file_size_limit`) |

If the bucket is **200MB** but the global limit is still the default (**often 50MB**), uploads **above ~50MB** return **413** / `Payload too large` / *“The object exceeded the maximum allowed size”* even though the bucket UI shows 200MB.

## Product targets

- **Standard track / podcast audio:** up to **100MB** (see app validation / R2 presign).
- **DJ mixtape:** up to **200MB** (209715200 bytes).

For mixtapes to work via Supabase Storage, **both** must be at least **200MB** (plan allowing):

1. **Global** “Upload file size limit” ≥ **200MB**
2. **`audio-tracks`** bucket “Maximum file size” = **200MB**

## Repo migration

`supabase/migrations/20260405120000_storage_audio_tracks_200mb.sql` updates **`storage.buckets.file_size_limit`** for **`audio-tracks`** to **209715200** when it was lower. It does **not** change the **global** Dashboard setting — that must be raised manually in production.

## Verify on production

**SQL (Supabase SQL Editor):**

```sql
SELECT id, file_size_limit
FROM storage.buckets
WHERE id = 'audio-tracks';
```

Expect `file_size_limit = 209715200` for 200MB per object.

**Dashboard:** Confirm global **Upload file size limit** and bucket **Maximum file size** are both ≥ your largest expected file.

## Related issues (resolved in this project)

- **413 on ~63MB with bucket at 200MB:** global limit was still ~50MB — raise **Project Settings → Storage** first.
- **“Network timeout” before upload:** mobile previously base64-decoded huge files in JS; fixed by streaming upload (`expo-file-system` / direct Storage upload).
- **ACRCloud / `temp/` path:** large files hitting the same per-object cap before the final object — mobile may skip fingerprinting over a size threshold.

## Plan note

On some Supabase plans, the **global** upload ceiling may be capped by the product (e.g. free-tier documentation). If you cannot raise global limit enough, route large files through **R2 presigned upload** instead of Supabase Storage.
