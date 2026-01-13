-- External Platform Links Feature
-- Migration to add external_links and external_link_clicks tables
-- with analytics tracking and Row Level Security

-- External links table with comprehensive tracking
CREATE TABLE IF NOT EXISTS external_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform_type VARCHAR(50) NOT NULL CHECK (platform_type IN (
    'instagram', 'youtube', 'spotify', 'apple_music', 'soundcloud', 'website'
  )),
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 1,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_url_format CHECK (url ~* '^https?://'),
  CONSTRAINT unique_platform_per_creator UNIQUE (creator_id, platform_type)
);

-- Indexes for performance
CREATE INDEX idx_external_links_creator ON external_links(creator_id);
CREATE INDEX idx_external_links_clicks ON external_links(creator_id, click_count DESC);

-- Click tracking table (separate for analytics)
CREATE TABLE IF NOT EXISTS external_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_link_id UUID NOT NULL REFERENCES external_links(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  listener_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_type VARCHAR(50),
  platform VARCHAR(50),
  referrer_url TEXT,
  session_id UUID
);

-- Indexes for click analytics
CREATE INDEX idx_link_clicks_link ON external_link_clicks(external_link_id, clicked_at DESC);
CREATE INDEX idx_link_clicks_creator ON external_link_clicks(creator_id, clicked_at DESC);
CREATE INDEX idx_link_clicks_time ON external_link_clicks(clicked_at DESC);

-- RPC function to track clicks atomically
CREATE OR REPLACE FUNCTION track_external_link_click(
  p_link_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL,
  p_device_type VARCHAR DEFAULT NULL,
  p_platform VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_creator_id UUID;
BEGIN
  -- Get creator_id from link
  SELECT creator_id INTO v_creator_id
  FROM external_links
  WHERE id = p_link_id;

  IF v_creator_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Insert click record
  INSERT INTO external_link_clicks (
    external_link_id,
    creator_id,
    listener_id,
    session_id,
    device_type,
    platform
  ) VALUES (
    p_link_id,
    v_creator_id,
    p_user_id,
    p_session_id,
    p_device_type,
    p_platform
  );

  -- Increment click counter
  UPDATE external_links
  SET click_count = click_count + 1
  WHERE id = p_link_id;

  RETURN TRUE;
END;
$$;

-- Row Level Security Policies
ALTER TABLE external_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_link_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone can view external links for public creators
CREATE POLICY "Public can view creator external links"
  ON external_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = external_links.creator_id
      AND profiles.role = 'creator'
    )
  );

-- Creators can manage their own links
CREATE POLICY "Creators can manage own links"
  ON external_links FOR ALL
  USING (auth.uid() = creator_id);

-- Anyone can insert click records (anonymous tracking supported)
CREATE POLICY "Anyone can record clicks"
  ON external_link_clicks FOR INSERT
  WITH CHECK (true);

-- Users can only view their own click history
CREATE POLICY "Users view own clicks"
  ON external_link_clicks FOR SELECT
  USING (
    listener_id = auth.uid()
    OR creator_id = auth.uid()
  );
