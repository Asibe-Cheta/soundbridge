-- Post-tip thank-you DM for live session tips (mirrors apps/web/src/lib/tip-thank-you-dm.ts).

ALTER TABLE public.live_session_tips
  ADD COLUMN IF NOT EXISTS thank_you_message_id UUID;

COMMENT ON COLUMN public.live_session_tips.thank_you_message_id IS
  'DM sent from creator to tipper after live session tip (idempotency).';

DROP TRIGGER IF EXISTS trg_live_session_tip_thank_you_dm ON public.live_session_tips;
DROP TRIGGER IF EXISTS on_live_session_tip_thank_you ON public.live_session_tips;
DROP TRIGGER IF EXISTS live_session_tip_thank_you_trigger ON public.live_session_tips;

CREATE OR REPLACE FUNCTION public.send_live_session_tip_thank_you_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipper_name text;
  v_creator_username text;
  v_content text;
  v_message_id uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.tipper_id = NEW.creator_id THEN
    RETURN NEW;
  END IF;

  IF NEW.thank_you_message_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(
      NULLIF(trim(p.display_name), ''),
      NULLIF(split_part(p.email, '@', 1), ''),
      'friend'
    )
  INTO v_tipper_name
  FROM public.profiles p
  WHERE p.id = NEW.tipper_id;

  SELECT NULLIF(trim(p.username), '')
  INTO v_creator_username
  FROM public.profiles p
  WHERE p.id = NEW.creator_id;

  v_content := format('Thank you so much %s, you are amazing!', COALESCE(v_tipper_name, 'friend'));

  IF v_creator_username IS NOT NULL THEN
    v_creator_username := ltrim(v_creator_username, '@');
    v_content := v_content
      || E'\n\nYou are now part of my SoundBridge community. Stay connected and listen to my music here:'
      || E'\n'
      || format('soundbridge.live/%s/home', v_creator_username);
  END IF;

  INSERT INTO public.messages (sender_id, recipient_id, content, message_type, is_read)
  VALUES (NEW.creator_id, NEW.tipper_id, v_content, 'text', false)
  RETURNING id INTO v_message_id;

  UPDATE public.live_session_tips
  SET thank_you_message_id = v_message_id
  WHERE id = NEW.id
    AND thank_you_message_id IS NULL;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_live_session_tip_thank_you
  AFTER INSERT OR UPDATE OF status ON public.live_session_tips
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.send_live_session_tip_thank_you_message();
