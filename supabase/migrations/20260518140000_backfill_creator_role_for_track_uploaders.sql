-- Users who uploaded tracks should be tippable: set profiles.role = 'creator'.
-- API also accepts tips when audio_tracks exist even if role was not backfilled yet.
-- Note: there is no profiles.creator column; use role (not is_creator).

UPDATE public.profiles p
SET
  role = 'creator',
  updated_at = now()
WHERE COALESCE(p.role, '') IS DISTINCT FROM 'creator'
  AND EXISTS (
    SELECT 1
    FROM public.audio_tracks t
    WHERE t.creator_id = p.id
  );
