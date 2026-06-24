-- Internal outreach CRM (restricted to profiles.is_internal_team)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_internal_team BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_internal_team IS
  'When true, user may access internal outreach tracker (mobile + web).';

UPDATE public.profiles
SET is_internal_team = true
WHERE id IN (
  SELECT id FROM auth.users
  WHERE lower(email) IN ('asibechetachukwu@gmail.com', 'merituche2003@gmail.com')
);

CREATE TABLE IF NOT EXISTS public.outreach_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name TEXT NOT NULL,
  organisation_name TEXT,
  contact_type TEXT NOT NULL CHECK (
    contact_type IN ('institution', 'artist', 'venue', 'church', 'other')
  ),
  notes TEXT,
  meeting_held BOOLEAN NOT NULL DEFAULT false,
  meeting_held_at TIMESTAMPTZ,
  on_platform BOOLEAN NOT NULL DEFAULT false,
  on_platform_at TIMESTAMPTZ,
  profile_completed BOOLEAN NOT NULL DEFAULT false,
  profile_completed_at TIMESTAMPTZ,
  has_invited_others BOOLEAN NOT NULL DEFAULT false,
  has_invited_others_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.outreach_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.outreach_contacts(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  meeting_link_or_location TEXT,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oc_created_by ON public.outreach_contacts (created_by);
CREATE INDEX IF NOT EXISTS idx_oc_updated_at ON public.outreach_contacts (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_om_contact_id ON public.outreach_meetings (contact_id);
CREATE INDEX IF NOT EXISTS idx_om_scheduled_at ON public.outreach_meetings (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_om_reminder ON public.outreach_meetings (reminder_sent)
  WHERE reminder_sent = false;

CREATE OR REPLACE FUNCTION public.touch_outreach_contacts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_outreach_contacts_updated_at ON public.outreach_contacts;
CREATE TRIGGER trg_outreach_contacts_updated_at
  BEFORE UPDATE ON public.outreach_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_outreach_contacts_updated_at();

ALTER TABLE public.outreach_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outreach_contacts_internal_only ON public.outreach_contacts;
CREATE POLICY outreach_contacts_internal_only ON public.outreach_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_internal_team = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_internal_team = true
    )
  );

DROP POLICY IF EXISTS outreach_meetings_internal_only ON public.outreach_meetings;
CREATE POLICY outreach_meetings_internal_only ON public.outreach_meetings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_internal_team = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_internal_team = true
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_meetings TO authenticated;
GRANT ALL ON public.outreach_contacts TO service_role;
GRANT ALL ON public.outreach_meetings TO service_role;
