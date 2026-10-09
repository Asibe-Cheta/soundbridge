-- post-attachments bucket had 0 RLS policies (confirmed via dashboard — every other
-- working bucket like avatars/branding/event-images/cover-art has real ones). With RLS
-- enabled by default on storage.objects, zero policies means no client can write to it at
-- all — this was invisible until mobile's uploadImage fix switched from a service-role
-- server route (bypasses RLS) to a direct client upload, which immediately surfaced it as
-- "new row violates row-level security policy".
--
-- Pattern matches the confirmed-real avatars bucket policies exactly (pulled directly from
-- pg_policy, not guessed): public read, own-path-scoped write for insert/update/delete.
-- Mobile's upload path is {user_id}/{timestamp}_{filename} — first path segment is the
-- uploader's own user id, same convention avatars already uses.

CREATE POLICY "Public read access for post attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-attachments');

CREATE POLICY "Users can upload their own post attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post-attachments' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own post attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'post-attachments' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own post attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'post-attachments' AND (auth.uid())::text = (storage.foldername(name))[1]);
