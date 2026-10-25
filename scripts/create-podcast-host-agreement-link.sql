-- =============================================================================
-- Create a new podcast-host agreement link for one person.
-- Run in Supabase SQL Editor. Edit the name on the line below, then run.
-- The returned "link" column is the URL to send them.
-- =============================================================================

INSERT INTO public.podcast_host_agreement_signups (token, label)
VALUES (
  encode(gen_random_bytes(32), 'hex'),
  'EDIT ME: the host''s full name, e.g. Dayo Adeyemi'  -- shown in the agreement text itself, as "the Host"
)
RETURNING
  id,
  label,
  token,
  'https://soundbridge.live/agreements/podcast-host/' || token AS link,
  created_at;
