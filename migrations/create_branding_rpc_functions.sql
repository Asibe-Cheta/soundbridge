-- Migration: Create Branding RPC Functions
-- Date: December 11, 2025
-- Description: Creates RPC functions for getting and updating user branding

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_user_branding(UUID);
DROP FUNCTION IF EXISTS update_user_branding(UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, BOOLEAN, BOOLEAN, INTEGER, TEXT);

-- Function to get user branding
CREATE OR REPLACE FUNCTION get_user_branding(user_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  custom_logo_url TEXT,
  custom_logo_width INTEGER,
  custom_logo_height INTEGER,
  custom_logo_position TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  background_gradient JSONB,
  layout_style TEXT,
  show_powered_by BOOLEAN,
  watermark_enabled BOOLEAN,
  watermark_opacity INTEGER,
  watermark_position TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cb.user_id,
    cb.custom_logo_url,
    cb.custom_logo_width,
    cb.custom_logo_height,
    cb.custom_logo_position,
    cb.primary_color,
    cb.secondary_color,
    cb.accent_color,
    cb.background_gradient,
    cb.layout_style,
    cb.show_powered_by,
    cb.watermark_enabled,
    cb.watermark_opacity,
    cb.watermark_position,
    cb.created_at,
    cb.updated_at
  FROM custom_branding cb
  WHERE cb.user_id = user_uuid;

  -- If no branding exists, return default values
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      user_uuid::UUID,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::INTEGER,
      'top-left'::TEXT,
      '#EF4444'::TEXT,  -- Default red
      '#1F2937'::TEXT,  -- Default dark gray
      '#F59E0B'::TEXT,  -- Default amber
      NULL::JSONB,
      'default'::TEXT,
      TRUE::BOOLEAN,
      FALSE::BOOLEAN,
      30::INTEGER,
      'bottom-right'::TEXT,
      NOW()::TIMESTAMP,
      NOW()::TIMESTAMP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update user branding
CREATE OR REPLACE FUNCTION update_user_branding(
  user_uuid UUID,
  custom_logo_url_param TEXT DEFAULT NULL,
  custom_logo_width_param INTEGER DEFAULT NULL,
  custom_logo_height_param INTEGER DEFAULT NULL,
  custom_logo_position_param TEXT DEFAULT NULL,
  primary_color_param TEXT DEFAULT NULL,
  secondary_color_param TEXT DEFAULT NULL,
  accent_color_param TEXT DEFAULT NULL,
  background_gradient_param JSONB DEFAULT NULL,
  layout_style_param TEXT DEFAULT NULL,
  show_powered_by_param BOOLEAN DEFAULT NULL,
  watermark_enabled_param BOOLEAN DEFAULT NULL,
  watermark_opacity_param INTEGER DEFAULT NULL,
  watermark_position_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  exists_check BOOLEAN;
BEGIN
  -- Check if branding record exists
  SELECT EXISTS(SELECT 1 FROM custom_branding WHERE user_id = user_uuid) INTO exists_check;

  IF exists_check THEN
    -- Update existing record
    UPDATE custom_branding
    SET
      custom_logo_url = COALESCE(custom_logo_url_param, custom_logo_url),
      custom_logo_width = COALESCE(custom_logo_width_param, custom_logo_width),
      custom_logo_height = COALESCE(custom_logo_height_param, custom_logo_height),
      custom_logo_position = COALESCE(custom_logo_position_param, custom_logo_position),
      primary_color = COALESCE(primary_color_param, primary_color),
      secondary_color = COALESCE(secondary_color_param, secondary_color),
      accent_color = COALESCE(accent_color_param, accent_color),
      background_gradient = COALESCE(background_gradient_param, background_gradient),
      layout_style = COALESCE(layout_style_param, layout_style),
      show_powered_by = COALESCE(show_powered_by_param, show_powered_by),
      watermark_enabled = COALESCE(watermark_enabled_param, watermark_enabled),
      watermark_opacity = COALESCE(watermark_opacity_param, watermark_opacity),
      watermark_position = COALESCE(watermark_position_param, watermark_position),
      updated_at = NOW()
    WHERE user_id = user_uuid;
  ELSE
    -- Insert new record with defaults for NULL params
    INSERT INTO custom_branding (
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
      watermark_position
    ) VALUES (
      user_uuid,
      custom_logo_url_param,
      custom_logo_width_param,
      custom_logo_height_param,
      COALESCE(custom_logo_position_param, 'top-left'),
      COALESCE(primary_color_param, '#EF4444'),
      COALESCE(secondary_color_param, '#1F2937'),
      COALESCE(accent_color_param, '#F59E0B'),
      background_gradient_param,
      COALESCE(layout_style_param, 'default'),
      COALESCE(show_powered_by_param, TRUE),
      COALESCE(watermark_enabled_param, FALSE),
      COALESCE(watermark_opacity_param, 30),
      COALESCE(watermark_position_param, 'bottom-right')
    );
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_branding(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_branding(UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, BOOLEAN, BOOLEAN, INTEGER, TEXT) TO authenticated;
