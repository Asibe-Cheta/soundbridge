-- Chat schema reconciliation for reply/forwarded + sender edit/delete-for-everyone support.

ALTER TYPE public.message_type ADD VALUE IF NOT EXISTS 'reply';
ALTER TYPE public.message_type ADD VALUE IF NOT EXISTS 'forwarded';

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname = 'sender can update own messages'
  ) THEN
    CREATE POLICY "sender can update own messages"
      ON public.messages
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = sender_id)
      WITH CHECK (auth.uid() = sender_id);
  END IF;
END
$$;

