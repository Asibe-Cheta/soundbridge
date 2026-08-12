**FULL CURSOR PROMPT — Portfolio Video Clips:**

---

**Important — check existing code first:** Inspect the existing Portfolio tab implementation, the existing upload pipeline (presigned URL → R2 PUT flow), and existing storage tier logic before building. Match existing naming conventions, existing R2 bucket/prefix patterns, and existing upload UI patterns (e.g. how cover art upload currently works) rather than introducing a parallel system.

Add portfolio video support to the existing Portfolio tab on creator profiles.

**Constraints:**
- Maximum 3 video clips per profile
- Maximum duration: 90 seconds per clip (enforce client-side before upload, and reject server-side if a file exceeds this when duration metadata is available)
- Maximum file size: 30 MB per clip after compression
- Compression must happen client-side (mobile and web) before upload — encode to H.264/AAC at approximately 2–4 Mbps target bitrate. Do not rely on server-side transcoding, since the current pipeline has no video transcoding step.
- Server must reject any upload exceeding the 30 MB limit, regardless of client compression, as a safety check

**Poster/thumbnail:**
- Client must capture a poster frame (first frame or user-selected frame) at time of upload, following the same pattern used for existing cover art uploads
- Upload the poster frame as a small JPEG/WebP alongside the video file
- Store `thumbnail_url` alongside `video_url` in the schema, matching existing naming conventions for similar media fields

**Storage:**
- Store video files in the existing R2 bucket structure, using a new prefix/folder for portfolio videos (do not create a new bucket unless the existing bucket structure requires it — check existing R2 setup first)
- Portfolio video storage must count against the user's existing storage tier quota (250MB Free, 2GB Premium, 10GB Unlimited), using whatever quota-tracking logic already exists for audio uploads

**Schema:**
- Add fields needed to track portfolio videos per user: video_url, thumbnail_url, duration, file_size, uploaded_at — match existing table/column naming conventions rather than introducing new patterns

**UI:**
- Videos appear only in the Portfolio tab on creator profiles, never on the main feed
- Enforce the 3-clip maximum in the UI (disable/hide upload option once limit reached)
- Show clear duration and remaining slots to the user during upload

**Explicitly out of scope for this prompt:**
- No live video streaming
- No adaptive bitrate / multiple resolutions
- No server-side video transcoding pipeline
