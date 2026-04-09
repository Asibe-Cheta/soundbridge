-- Branding on profiles + RPCs (mobile/web). Supersedes user_branding-only RPCs from 20260408123000.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS background_gradient JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_logo_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_logo_width INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_logo_height INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_logo_position TEXT DEFAULT 'top-left',
  ADD COLUMN IF NOT EXISTS layout_style TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS show_powered_by BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS watermark_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS watermark_opacity INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS watermark_position TEXT DEFAULT 'bottom-right',
  ADD COLUMN IF NOT EXISTS avatar_border_type TEXT DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS avatar_border_color TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avatar_border_gradient_start TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avatar_border_gradient_end TEXT DEFAULT NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_avatar_border_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_avatar_border_type_check
  CHECK (
    avatar_border_type IS NULL
    OR avatar_border_type IN ('none', 'single', 'gradient')
  );

-- One-time copy from legacy user_branding table (if present).
UPDATE public.profiles p
SET
  custom_logo_url = ub.custom_logo_url,
  custom_logo_width = ub.custom_logo_width,
  custom_logo_height = ub.custom_logo_height,
  custom_logo_position = ub.custom_logo_position,
  primary_color = ub.primary_color,
  secondary_color = ub.secondary_color,
  accent_color = ub.accent_color,
  background_gradient = CASE
    WHEN ub.background_gradient IS NOT NULL THEN to_jsonb(ub.background_gradient::text)
    ELSE NULL
  END,
  layout_style = ub.layout_style,
  show_powered_by = ub.show_powered_by,
  watermark_enabled = ub.watermark_enabled,
  watermark_opacity = LEAST(100, GREATEST(0, ROUND(ub.watermark_opacity * 100)::INTEGER)),
  watermark_position = ub.watermark_position,
  updated_at = NOW()
FROM public.user_branding ub
WHERE ub.user_id = p.id;

-- Replace RPC implementations (drop all overloads).
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
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT row_to_json(t) INTO result
  FROM (
    SELECT
      p.primary_color,
      p.secondary_color,
      p.accent_color,
      p.background_gradient,
      p.custom_logo_url,
      p.custom_logo_width,
      p.custom_logo_height,
      p.custom_logo_position,
      p.layout_style,
      p.show_powered_by,
      p.watermark_enabled,
      p.watermark_opacity,
      p.watermark_position,
      p.avatar_border_type,
      p.avatar_border_color,
      p.avatar_border_gradient_start,
      p.avatar_border_gradient_end,
      COALESCE(p.subscription_tier, 'free') AS user_tier
    FROM public.profiles p
    WHERE p.id = user_uuid
  ) t;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_branding(
  user_uuid UUID,
  primary_color TEXT DEFAULT NULL,
  secondary_color TEXT DEFAULT NULL,
  accent_color TEXT DEFAULT NULL,
  background_gradient JSONB DEFAULT NULL,
  custom_logo_url TEXT DEFAULT NULL,
  custom_logo_width INTEGER DEFAULT NULL,
  custom_logo_height INTEGER DEFAULT NULL,
  custom_logo_position TEXT DEFAULT NULL,
  layout_style TEXT DEFAULT NULL,
  show_powered_by BOOLEAN DEFAULT NULL,
  watermark_enabled BOOLEAN DEFAULT NULL,
  watermark_opacity INTEGER DEFAULT NULL,
  watermark_position TEXT DEFAULT NULL,
  avatar_border_type TEXT DEFAULT NULL,
  avatar_border_color TEXT DEFAULT NULL,
  avatar_border_gradient_start TEXT DEFAULT NULL,
  avatar_border_gradient_end TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> user_uuid THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.profiles SET
    primary_color = COALESCE(update_user_branding.primary_color, profiles.primary_color),
    secondary_color = COALESCE(update_user_branding.secondary_color, profiles.secondary_color),
    accent_color = COALESCE(update_user_branding.accent_color, profiles.accent_color),
    background_gradient = COALESCE(update_user_branding.background_gradient, profiles.background_gradient),
    custom_logo_url = COALESCE(update_user_branding.custom_logo_url, profiles.custom_logo_url),
    custom_logo_width = COALESCE(update_user_branding.custom_logo_width, profiles.custom_logo_width),
    custom_logo_height = COALESCE(update_user_branding.custom_logo_height, profiles.custom_logo_height),
    custom_logo_position = COALESCE(update_user_branding.custom_logo_position, profiles.custom_logo_position),
    layout_style = COALESCE(update_user_branding.layout_style, profiles.layout_style),
    show_powered_by = COALESCE(update_user_branding.show_powered_by, profiles.show_powered_by),
    watermark_enabled = COALESCE(update_user_branding.watermark_enabled, profiles.watermark_enabled),
    watermark_opacity = COALESCE(update_user_branding.watermark_opacity, profiles.watermark_opacity),
    watermark_position = COALESCE(update_user_branding.watermark_position, profiles.watermark_position),
    avatar_border_type = COALESCE(update_user_branding.avatar_border_type, profiles.avatar_border_type),
    avatar_border_color = COALESCE(update_user_branding.avatar_border_color, profiles.avatar_border_color),
    avatar_border_gradient_start = COALESCE(update_user_branding.avatar_border_gradient_start, profiles.avatar_border_gradient_start),
    avatar_border_gradient_end = COALESCE(update_user_branding.avatar_border_gradient_end, profiles.avatar_border_gradient_end),
    updated_at = NOW()
  WHERE id = user_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_branding(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_branding(UUID) TO anon;

GRANT EXECUTE ON FUNCTION public.update_user_branding(
  UUID,
  TEXT, TEXT, TEXT, JSONB,
  TEXT, INTEGER, INTEGER, TEXT,
  TEXT, BOOLEAN, BOOLEAN, INTEGER, TEXT,
  TEXT, TEXT, TEXT, TEXT
) TO authenticated;
