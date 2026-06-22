-- Partner resource click attribution (mobile + web Pro Resources taps)

CREATE TABLE IF NOT EXISTS public.partner_resource_clicks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  partner_name  TEXT NOT NULL,
  clicked_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_resource_clicks_partner_idx
  ON public.partner_resource_clicks (partner_name);

CREATE INDEX IF NOT EXISTS partner_resource_clicks_clicked_at_idx
  ON public.partner_resource_clicks (clicked_at DESC);

CREATE INDEX IF NOT EXISTS partner_resource_clicks_user_idx
  ON public.partner_resource_clicks (user_id);

ALTER TABLE public.partner_resource_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_resource_clicks_insert_own ON public.partner_resource_clicks;
CREATE POLICY partner_resource_clicks_insert_own ON public.partner_resource_clicks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS partner_resource_clicks_admin_select ON public.partner_resource_clicks;
CREATE POLICY partner_resource_clicks_admin_select ON public.partner_resource_clicks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

GRANT INSERT ON public.partner_resource_clicks TO authenticated;
