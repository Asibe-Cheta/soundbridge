-- Custom Branding Schema for SoundBridge
-- This enables Pro users to customize their profile branding

-- Create custom branding table
CREATE TABLE IF NOT EXISTS creator_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Custom Logo Settings
  custom_logo_url TEXT,
  custom_logo_width INTEGER DEFAULT 120,
  custom_logo_height INTEGER DEFAULT 40,
  custom_logo_position TEXT DEFAULT 'top-left' CHECK (custom_logo_position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center')),
  
  -- Theme Customization
  primary_color TEXT DEFAULT '#DC2626',
  secondary_color TEXT DEFAULT '#EC4899',
  accent_color TEXT DEFAULT '#F97316',
  background_gradient TEXT DEFAULT 'from-gray-900 via-gray-800 to-gray-900',
  
  -- Layout Options
  layout_style TEXT DEFAULT 'default' CHECK (layout_style IN ('default', 'minimal', 'creative', 'professional')),
  show_powered_by BOOLEAN DEFAULT true, -- Free users must show this, Pro users can hide
  
  -- Watermark Settings (for free users)
  watermark_enabled BOOLEAN DEFAULT true,
  watermark_opacity DECIMAL(3,2) DEFAULT 0.1, -- 0.0 to 1.0
  watermark_position TEXT DEFAULT 'bottom-right' CHECK (watermark_position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center')),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_creator_branding_user_id ON creator_branding(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_creator_branding_updated_at 
  BEFORE UPDATE ON creator_branding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to get user branding (respects subscription tier)
CREATE OR REPLACE FUNCTION get_user_branding(user_uuid UUID)
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
  watermark_opacity DECIMAL(3,2),
  watermark_position TEXT,
  user_tier TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cb.custom_logo_url,
    cb.custom_logo_width,
    cb.custom_logo_height,
    cb.custom_logo_position,
    cb.primary_color,
    cb.secondary_color,
    cb.accent_color,
    cb.background_gradient,
    cb.layout_style,
    -- Free users must show "Powered by SoundBridge", Pro+ can hide it
    CASE 
      WHEN COALESCE(us.current_tier, 'free') = 'free' THEN true
      ELSE cb.show_powered_by
    END as show_powered_by,
    -- Watermark enabled for all users by default, but Pro+ can customize
    CASE 
      WHEN COALESCE(us.current_tier, 'free') = 'free' THEN true
      ELSE cb.watermark_enabled
    END as watermark_enabled,
    cb.watermark_opacity,
    cb.watermark_position,
    COALESCE(us.current_tier, 'free') as user_tier
  FROM creator_branding cb
  LEFT JOIN user_upload_stats us ON cb.user_id = us.user_id
  WHERE cb.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user branding (with tier validation)
CREATE OR REPLACE FUNCTION update_user_branding(
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
  watermark_opacity_param DECIMAL(3,2) DEFAULT NULL,
  watermark_position_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
BEGIN
  -- Get user's subscription tier
  SELECT COALESCE(us.current_tier, 'free') INTO user_tier
  FROM user_upload_stats us
  WHERE us.user_id = user_uuid;
  
  -- Free tier restrictions
  IF user_tier = 'free' THEN
    -- Free users cannot hide "Powered by SoundBridge" or watermark
    IF show_powered_by_param = false OR watermark_enabled_param = false THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Upsert branding settings
  INSERT INTO creator_branding (
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
    COALESCE(custom_logo_url_param, ''),
    COALESCE(custom_logo_width_param, 120),
    COALESCE(custom_logo_height_param, 40),
    COALESCE(custom_logo_position_param, 'top-left'),
    COALESCE(primary_color_param, '#DC2626'),
    COALESCE(secondary_color_param, '#EC4899'),
    COALESCE(accent_color_param, '#F97316'),
    COALESCE(background_gradient_param, 'from-gray-900 via-gray-800 to-gray-900'),
    COALESCE(layout_style_param, 'default'),
    CASE 
      WHEN user_tier = 'free' THEN true -- Force true for free users
      ELSE COALESCE(show_powered_by_param, true)
    END,
    CASE 
      WHEN user_tier = 'free' THEN true -- Force true for free users
      ELSE COALESCE(watermark_enabled_param, true)
    END,
    COALESCE(watermark_opacity_param, 0.1),
    COALESCE(watermark_position_param, 'bottom-right')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    custom_logo_url = COALESCE(EXCLUDED.custom_logo_url, creator_branding.custom_logo_url),
    custom_logo_width = COALESCE(EXCLUDED.custom_logo_width, creator_branding.custom_logo_width),
    custom_logo_height = COALESCE(EXCLUDED.custom_logo_height, creator_branding.custom_logo_height),
    custom_logo_position = COALESCE(EXCLUDED.custom_logo_position, creator_branding.custom_logo_position),
    primary_color = COALESCE(EXCLUDED.primary_color, creator_branding.primary_color),
    secondary_color = COALESCE(EXCLUDED.secondary_color, creator_branding.secondary_color),
    accent_color = COALESCE(EXCLUDED.accent_color, creator_branding.accent_color),
    background_gradient = COALESCE(EXCLUDED.background_gradient, creator_branding.background_gradient),
    layout_style = COALESCE(EXCLUDED.layout_style, creator_branding.layout_style),
    show_powered_by = CASE 
      WHEN user_tier = 'free' THEN true -- Force true for free users
      ELSE COALESCE(EXCLUDED.show_powered_by, creator_branding.show_powered_by)
    END,
    watermark_enabled = CASE 
      WHEN user_tier = 'free' THEN true -- Force true for free users
      ELSE COALESCE(EXCLUDED.watermark_enabled, creator_branding.watermark_enabled)
    END,
    watermark_opacity = COALESCE(EXCLUDED.watermark_opacity, creator_branding.watermark_opacity),
    watermark_position = COALESCE(EXCLUDED.watermark_position, creator_branding.watermark_position),
    updated_at = NOW();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default branding for existing users (optional)
-- This will create default branding entries for users who don't have them yet
INSERT INTO creator_branding (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM creator_branding)
ON CONFLICT (user_id) DO NOTHING;
