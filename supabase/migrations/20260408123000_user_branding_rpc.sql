-- User branding backend for mobile/web fallback safety.
-- Provides dedicated table + RPC functions expected by BrandingService.

CREATE TABLE IF NOT EXISTS public.user_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  custom_logo_url TEXT,
  custom_logo_width INTEGER NOT NULL DEFAULT 120,
  custom_logo_height INTEGER NOT NULL DEFAULT 40,
  custom_logo_position TEXT NOT NULL DEFAULT 'top-left',
  primary_color TEXT NOT NULL DEFAULT '#DC2626',
  secondary_color TEXT NOT NULL DEFAULT '#EC4899',
  accent_color TEXT NOT NULL DEFAULT '#F97316',
  background_gradient TEXT NOT NULL DEFAULT 'from-gray-900 via-gray-800 to-gray-900',
  layout_style TEXT NOT NULL DEFAULT 'default',
  show_powered_by BOOLEAN NOT NULL DEFAULT true,
  watermark_enabled BOOLEAN NOT NULL DEFAULT true,
  watermark_opacity DOUBLE PRECISION NOT NULL DEFAULT 0.1,
  watermark_position TEXT NOT NULL DEFAULT 'bottom-right',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_branding_user_id ON public.user_branding(user_id);

ALTER TABLE public.user_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own branding" ON public.user_branding;
CREATE POLICY "Users can view own branding"
  ON public.user_branding FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own branding" ON public.user_branding;
CREATE POLICY "Users can insert own branding"
  ON public.user_branding FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own branding" ON public.user_branding;
CREATE POLICY "Users can update own branding"
  ON public.user_branding FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recreate functions safely even if an older signature already exists.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_user_branding'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.sig);
  END LOOP;
END $$;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_user_branding'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.sig);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_user_branding(user_uuid UUID)
RETURNS TABLE (
  custom_logo_url TEXT,
  custom_logo_width INTEGER,
  custom_logo_height INTEGER,
  custom_logo_position TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  background_gradient TEXT,
  layout_style TEXT,
  show_powered_by BOOLEAN,
  watermark_enabled BOOLEAN,
  watermark_opacity DOUBLE PRECISION,
  watermark_position TEXT,
  user_tier TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ub.custom_logo_url,
    ub.custom_logo_width,
    ub.custom_logo_height,
    ub.custom_logo_position,
    ub.primary_color,
    ub.secondary_color,
    ub.accent_color,
    ub.background_gradient,
    ub.layout_style,
    ub.show_powered_by,
    ub.watermark_enabled,
    ub.watermark_opacity,
    ub.watermark_position,
    COALESCE(p.subscription_tier, 'free') AS user_tier
  FROM public.profiles p
  LEFT JOIN public.user_branding ub ON ub.user_id = p.id
  WHERE p.id = user_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_branding(
  user_uuid UUID,
  custom_logo_url_param TEXT DEFAULT NULL,
  custom_logo_width_param INTEGER DEFAULT NULL,
  custom_logo_height_param INTEGER DEFAULT NULL,
  custom_logo_position_param TEXT DEFAULT NULL,
  primary_color_param TEXT DEFAULT NULL,
  secondary_color_param TEXT DEFAULT NULL,
  accent_color_param TEXT DEFAULT NULL,
  background_gradient_param TEXT DEFAULT NULL,
  layout_style_param TEXT DEFAULT NULL,
  show_powered_by_param BOOLEAN DEFAULT NULL,
  watermark_enabled_param BOOLEAN DEFAULT NULL,
  watermark_opacity_param DOUBLE PRECISION DEFAULT NULL,
  watermark_position_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_branding (
    user_id,
    custom_logo_url,
    custom_logo_width,
    custom_logo_height,
    custom_logo_position,
    primary_color,
    secondary_color,
    accent_color,
    background_gradient,
    layout_style,
    show_powered_by,
    watermark_enabled,
    watermark_opacity,
    watermark_position,
    updated_at
  )
  VALUES (
    user_uuid,
    custom_logo_url_param,
    COALESCE(custom_logo_width_param, 120),
    COALESCE(custom_logo_height_param, 40),
    COALESCE(custom_logo_position_param, 'top-left'),
    COALESCE(primary_color_param, '#DC2626'),
    COALESCE(secondary_color_param, '#EC4899'),
    COALESCE(accent_color_param, '#F97316'),
    COALESCE(background_gradient_param, 'from-gray-900 via-gray-800 to-gray-900'),
    COALESCE(layout_style_param, 'default'),
    COALESCE(show_powered_by_param, true),
    COALESCE(watermark_enabled_param, true),
    COALESCE(watermark_opacity_param, 0.1),
    COALESCE(watermark_position_param, 'bottom-right'),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    custom_logo_url = COALESCE(update_user_branding.custom_logo_url_param, user_branding.custom_logo_url),
    custom_logo_width = COALESCE(update_user_branding.custom_logo_width_param, user_branding.custom_logo_width),
    custom_logo_height = COALESCE(update_user_branding.custom_logo_height_param, user_branding.custom_logo_height),
    custom_logo_position = COALESCE(update_user_branding.custom_logo_position_param, user_branding.custom_logo_position),
    primary_color = COALESCE(update_user_branding.primary_color_param, user_branding.primary_color),
    secondary_color = COALESCE(update_user_branding.secondary_color_param, user_branding.secondary_color),
    accent_color = COALESCE(update_user_branding.accent_color_param, user_branding.accent_color),
    background_gradient = COALESCE(update_user_branding.background_gradient_param, user_branding.background_gradient),
    layout_style = COALESCE(update_user_branding.layout_style_param, user_branding.layout_style),
    show_powered_by = COALESCE(update_user_branding.show_powered_by_param, user_branding.show_powered_by),
    watermark_enabled = COALESCE(update_user_branding.watermark_enabled_param, user_branding.watermark_enabled),
    watermark_opacity = COALESCE(update_user_branding.watermark_opacity_param, user_branding.watermark_opacity),
    watermark_position = COALESCE(update_user_branding.watermark_position_param, user_branding.watermark_position),
    updated_at = now();

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_branding(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_branding(
  UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, DOUBLE PRECISION, TEXT
) TO authenticated;
