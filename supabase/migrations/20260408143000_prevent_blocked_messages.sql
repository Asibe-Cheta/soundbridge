-- Prevent direct messages between users with a block relationship (either direction).

CREATE OR REPLACE FUNCTION public.prevent_blocked_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.user_blocks ub
    WHERE
      (ub.blocker_id = NEW.sender_id AND ub.blocked_id = NEW.recipient_id)
      OR
      (ub.blocker_id = NEW.recipient_id AND ub.blocked_id = NEW.sender_id)
  ) THEN
    RAISE EXCEPTION 'Messaging is blocked between these users'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.messages') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS prevent_blocked_message_insert_trigger ON public.messages;

    CREATE TRIGGER prevent_blocked_message_insert_trigger
    BEFORE INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_blocked_message_insert();
  END IF;
END $$;
