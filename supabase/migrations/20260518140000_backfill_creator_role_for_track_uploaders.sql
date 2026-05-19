-- Users who uploaded tracks should be tippable: set profiles.role = 'creator'.
-- API also accepts tips when audio_tracks exist even if role was not backfilled yet.
-- profiles.role is enum user_role ('creator' | 'listener') — not a boolean "creator" column.

UPDATE public.profiles p
SET
  role = 'creator'::user_role,
  updated_at = now()
WHERE p.role IS DISTINCT FROM 'creator'::user_role
  AND EXISTS (
    SELECT 1
    FROM public.audio_tracks t
    WHERE t.creator_id = p.id
  );
