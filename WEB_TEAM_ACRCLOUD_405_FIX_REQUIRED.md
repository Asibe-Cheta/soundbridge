# ACRCloud Fingerprinting — 405 Error (Backend Fix Required)

**Priority:** High — audio verification is broken for all uploads

---

## Symptom

The mobile app's Upload screen attempts to fingerprint uploaded audio via:

```
POST /api/upload/fingerprint
```

The backend is returning **HTTP 405 Method Not Allowed**, causing the UI to show:

> "Audio verification unavailable — API error 405: Fingerprinting failed. You can still proceed with upload."

Console log from the app:
```
❌ API returned error status: 405
❌ ACRCloud error: Error: API error 405:
```

---

## What the mobile app sends

```typescript
fetch(`${config.apiUrl}/upload/fingerprint`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({
    audioFileUrl: storageUrl,   // public Supabase storage URL
    artistName: formData.artistName || undefined,
  }),
})
```

The app uploads the audio file to `audio-tracks` Supabase storage first, then sends the public URL to your backend. Your backend is expected to fetch that URL and run ACRCloud fingerprinting on it.

---

## Possible Causes

1. **Route not registered** — `/api/upload/fingerprint` route was removed or never added to the POST router
2. **Route registered under GET instead of POST** — change to `router.post`
3. **Route registered without the `/api` prefix** — confirm the route is `POST /api/upload/fingerprint` not just `POST /upload/fingerprint`
4. **Middleware blocking POST to this path** — check if a read-only middleware is wrapping this route

---

## Expected Response Shape (success)

```json
{
  "success": true,
  "matchFound": true,
  "requiresISRC": true,
  "detectedArtist": "Artist Name",
  "detectedTitle": "Song Title",
  "detectedAlbum": "Album Name",
  "detectedISRC": "GBUM71234567",
  "artistMatch": { "match": true, "confidence": 0.95 },
  "artistMatchConfidence": 0.95
}
```

Or if no match (original music):

```json
{
  "success": true,
  "matchFound": false,
  "requiresISRC": false,
  "isUnreleased": true
}
```

Or on ACRCloud-level error (quota, timeout, etc.) — **do not return 4xx**, return 200 with:

```json
{
  "success": false,
  "matchFound": false,
  "error": "Quota exceeded",
  "errorCode": "QUOTA_EXCEEDED",
  "requiresManualReview": true
}
```

Valid `errorCode` values the mobile app handles: `"QUOTA_EXCEEDED"`, `"TIMEOUT"`, `"API_ERROR"`, `"INVALID_FILE"`

---

## Impact

- All uploads show a yellow warning box during the upload flow
- Cover song detection is disabled until fixed
- ISRC auto-population from ACRCloud is disabled

The app allows uploads to proceed despite this error (it does not block), but copyright verification is skipped.

---

## Notes

- This was working previously — likely a recent deployment broke the route registration
- Not a subscription issue (405 ≠ 402/429)
- The mobile code is correct; the fix is entirely server-side

---

## Backend fix applied (2026-03)

- **Route verified:** `apps/web/app/api/upload/fingerprint/route.ts` exports `POST` and `OPTIONS`. It accepts:
  - **JSON body** (what mobile sends): `{ audioFileUrl: string, artistName?: string }` — backend fetches the URL and runs ACRCloud.
  - **multipart/form-data:** `audioFile` + optional `artistName`.
- **GET handler added:** Returns `405 Method Not Allowed` with `Allow: POST, OPTIONS` so the route is clearly registered; if the client mistakenly sends GET, the response is explicit.
- **Segment config:** `runtime = 'nodejs'` and `maxDuration = 60` kept so the route runs in Node (ffmpeg, large body) and doesn’t time out.
- **If 405 still occurs on POST:** Check that the request is actually `POST` (no redirect that converts to GET), URL is exactly `/api/upload/fingerprint` (no trailing slash), and no proxy/gateway is stripping the method.

---

## How to verify the problem is not client/URL/proxy

Use these checks to see whether the 405 is due to (1) request sent as GET, (2) wrong URL, or (3) proxy rewriting.

### 1. Server logs — what did the backend receive?

The fingerprint route logs every request. After deployment, when the mobile triggers a fingerprint call:

- **If you see** `🔍 ACRCloud fingerprinting API called` in logs → the **POST** handler ran; the 405 is coming from somewhere else (e.g. a second request or a different path).
- **If you see no log for that request** but the client got 405 → the request may never have reached the POST handler (e.g. GET hit the route, or a different path returned 405). Search logs for `[fingerprint]` — the GET handler logs `method=GET path=...` and the POST handler logs `method=POST path=...`, so you can see exactly what the server received.
- **If you see** `[fingerprint] method=POST path=/api/upload/fingerprint` (or similar) in logs → the server received POST at the right path; the 405 is likely from a proxy or a duplicate GET.

So: **inspect backend logs at the time of the mobile request** and note whether any log is for that request and which handler (GET vs POST) ran.

### 2. Mobile / client — what is actually sent?

In the app, right before the fingerprint `fetch`, log and (if possible) show in a debug UI:

- `method` (must be `'POST'`)
- Full URL: `config.apiUrl + '/upload/fingerprint'` (no trailing slash; must be exactly `.../upload/fingerprint`)

If the base URL is wrong (e.g. missing `/api`, or trailing slash), fix the URL. If the client is sending GET (e.g. after a redirect that changed the method), fix the client or the redirect.

### 3. Direct backend test — does POST work from outside?

From a machine that can reach the same backend URL the app uses (same origin or same API gateway):

```bash
# Replace with your real API base URL and a valid Supabase anon or user token
BASE="https://your-app.vercel.app"
TOKEN="your-jwt"

# POST with minimal JSON body (will fail auth or "missing file" but must NOT be 405)
curl -i -X POST "${BASE}/api/upload/fingerprint" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"audioFileUrl":"https://example.com/fake.mp3"}'
```

- **If you get 401 / 400 / 500** → the backend received **POST** and the route is correct; the 405 the app sees is likely from a different request (e.g. GET), wrong URL, or proxy in front of the app.
- **If you get 405** → the server (or a proxy in front of it) is rejecting POST for this path; check Vercel/host rewrites, API gateway rules, and any middleware that might strip or change the method.

### 4. Optional: echo endpoint to see what the server sees

If you cannot access backend logs, add a temporary route that echoes method and path (e.g. `GET/POST /api/upload/fingerprint-debug` returning `{ method, path }`). Call it with POST from the same client and same base URL as the app. If the response shows `method: "GET"` or a different path, the issue is client-side or proxy (redirect/rewrite). Remove the debug route after use.

---

## Where to get ACRCloud keys for Identify API

The fingerprint endpoint uses ACRCloud’s **Identify API** (`/v1/identify`), not the Console API.

- **Identify API** uses the **Access Key** and **Access Secret** of a **specific project** (e.g. under “Audio & Video Recognition”). That’s what `ACRCLOUD_ACCESS_KEY` and `ACRCLOUD_ACCESS_SECRET` in Vercel must be.
- **Account-level** “Old Access Keys” and “Personal Access Token” (under Developer Setting) are for the **Console API** only. The console warns: *“Please do not use them for Identify API which needs access key and access secret of a specific project you created.”*

So if keys “disappeared” in the console:

1. You may be looking in the wrong place: **Developer Setting → Old Access Keys / Personal Access Token** are not used for fingerprinting.
2. Go to **Products → Audio & Video Recognition** → open (or create) a project. The project’s **Access Key** and **Access Secret** are shown there. Those are the values to put in Vercel as `ACRCLOUD_ACCESS_KEY` and `ACRCLOUD_ACCESS_SECRET`.
3. Confirm you’re in the correct ACRCloud account (the one used when the project was created). If the project was created under another account, either use that account to copy the project keys or create a new project in the current account and update Vercel with the new key/secret.
