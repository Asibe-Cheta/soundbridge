-- Event Ticketing System Schema for SoundBridge (FIXED VERSION)
-- Includes: Tickets, Purchases, Bundles, Smart Recommendations, Social Features

-- ============================================
-- PART 1: EVENT TICKETS
-- ============================================

-- Ticket types for events (General, VIP, Early Bird, etc.)
CREATE TABLE IF NOT EXISTS event_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  ticket_type TEXT NOT NULL DEFAULT 'general_admission',
  ticket_name TEXT NOT NULL, -- 'General Admission', 'VIP', 'Early Bird'
  description TEXT,
  price_gbp DECIMAL(10,2) NOT NULL,
  price_ngn DECIMAL(10,2),
  quantity_total INTEGER NOT NULL,
  quantity_sold INTEGER DEFAULT 0,
  quantity_available INTEGER GENERATED ALWAYS AS (quantity_total - quantity_sold) STORED,
  
  -- Sales window
  sales_start TIMESTAMPTZ DEFAULT NOW(),
  sales_end TIMESTAMPTZ,
  
  -- Ticket features
  includes_features JSONB DEFAULT '[]'::jsonb, -- ['VIP lounge access', 'Meet & greet']
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_quantity CHECK (quantity_total > 0),
  CONSTRAINT valid_price CHECK (price_gbp >= 0)
);

CREATE INDEX IF NOT EXISTS idx_event_tickets_event_id ON event_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_active ON event_tickets(is_active) WHERE is_active = true;

-- ============================================
-- PART 2: BUNDLES (Create before ticket_purchases)
-- ============================================

-- Bundle definitions (e.g., "Album + VIP Ticket")
CREATE TABLE IF NOT EXISTS event_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Bundle info
  bundle_name TEXT NOT NULL,
  description TEXT,
  
  -- Event reference
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  ticket_id UUID REFERENCES event_tickets(id) ON DELETE CASCADE NOT NULL,
  
  -- Music content (optional - can bundle with tracks/albums)
  bundled_track_ids UUID[] DEFAULT ARRAY[]::UUID[],
  bundled_content_type TEXT CHECK (bundled_content_type IN ('track', 'album', 'playlist', 'none')),
  
  -- Pricing
  individual_price DECIMAL(10,2) NOT NULL, -- Sum of individual items
  bundle_price DECIMAL(10,2) NOT NULL, -- Discounted price
  discount_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    ((individual_price - bundle_price) / NULLIF(individual_price, 0)) * 100
  ) STORED,
  
  -- Availability
  quantity_available INTEGER,
  quantity_sold INTEGER DEFAULT 0,
  
  -- Sales window
  available_from TIMESTAMPTZ DEFAULT NOW(),
  available_until TIMESTAMPTZ,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_bundle_price CHECK (bundle_price <= individual_price)
);

CREATE INDEX IF NOT EXISTS idx_event_bundles_event ON event_bundles(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bundles_active ON event_bundles(is_active) WHERE is_active = true;

-- Bundle purchases
CREATE TABLE IF NOT EXISTS bundle_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  bundle_id UUID REFERENCES event_bundles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Payment
  stripe_payment_intent_id TEXT UNIQUE,
  amount_paid DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  
  -- Metadata
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_bundle_purchases_user ON bundle_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_bundle_purchases_bundle ON bundle_purchases(bundle_id);

-- ============================================
-- PART 3: TICKET PURCHASES (Now bundle_purchases exists)
-- ============================================

-- Individual ticket purchases
CREATE TABLE IF NOT EXISTS ticket_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Purchase info
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  ticket_id UUID REFERENCES event_tickets(id) ON DELETE CASCADE NOT NULL,
  
  -- Payment details
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  amount_paid DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  platform_fee DECIMAL(10,2) NOT NULL,
  promoter_revenue DECIMAL(10,2) NOT NULL,
  
  -- Buyer info
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT,
  
  -- Ticket details
  ticket_code TEXT UNIQUE NOT NULL, -- QR code data
  qr_code_url TEXT, -- Generated QR code image URL
  quantity INTEGER DEFAULT 1,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded', 'used')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'refunded')),
  
  -- Usage tracking
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES profiles(id),
  
  -- Bundle reference (now bundle_purchases exists)
  bundle_purchase_id UUID REFERENCES bundle_purchases(id) ON DELETE SET NULL,
  
  -- Metadata
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  refunded_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT valid_amount CHECK (amount_paid >= 0),
  CONSTRAINT valid_quantity CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_ticket_purchases_user ON ticket_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_event ON ticket_purchases(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_status ON ticket_purchases(status);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_ticket_code ON ticket_purchases(ticket_code);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_stripe_intent ON ticket_purchases(stripe_payment_intent_id);

-- ============================================
-- PART 4: SOCIAL FEATURES (Friends Attending)
-- ============================================

-- Track which friends are attending events
CREATE OR REPLACE VIEW user_friends_attending_events AS
SELECT DISTINCT
  e.id AS event_id,
  e.title AS event_title,
  e.event_date,
  u.id AS user_id,
  f.following_id AS friend_id,
  p.display_name AS friend_name,
  p.avatar_url AS friend_avatar,
  tp.status AS attendance_status
FROM events e
JOIN ticket_purchases tp ON tp.event_id = e.id
JOIN profiles p ON p.id = tp.user_id
JOIN follows f ON f.following_id = p.id
JOIN profiles u ON u.id = f.follower_id
WHERE tp.status IN ('completed', 'used')
  AND e.event_date >= NOW();

-- ============================================
-- PART 5: SMART RECOMMENDATIONS
-- ============================================

-- User listening history for event recommendations
CREATE TABLE IF NOT EXISTS user_listening_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Listening metrics
  play_count INTEGER DEFAULT 1,
  total_listen_duration INTEGER DEFAULT 0, -- seconds
  last_played_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Derived data
  genre TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_listening_history_user ON user_listening_history(user_id);
CREATE INDEX IF NOT EXISTS idx_listening_history_artist ON user_listening_history(artist_id);
CREATE INDEX IF NOT EXISTS idx_listening_history_genre ON user_listening_history(genre);

-- Artist-to-Event mapping for recommendations
CREATE OR REPLACE FUNCTION get_artist_upcoming_events(p_artist_id UUID)
RETURNS TABLE (
  event_id UUID,
  event_title TEXT,
  event_date TIMESTAMPTZ,
  location TEXT,
  min_price DECIMAL,
  tickets_available INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.event_date,
    e.location,
    MIN(et.price_gbp) AS min_price,
    SUM(et.quantity_total - et.quantity_sold)::INTEGER AS tickets_available
  FROM events e
  LEFT JOIN event_tickets et ON et.event_id = e.id AND et.is_active = true
  WHERE e.creator_id = p_artist_id
    AND e.event_date >= NOW()
    AND e.is_public = true
  GROUP BY e.id, e.title, e.event_date, e.location
  ORDER BY e.event_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recommend events based on user's listening habits
CREATE OR REPLACE FUNCTION get_personalized_event_recommendations(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  event_id UUID,
  event_title TEXT,
  event_date TIMESTAMPTZ,
  location TEXT,
  min_price DECIMAL,
  recommendation_score INTEGER,
  recommendation_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Events by artists the user listens to
  SELECT DISTINCT
    e.id,
    e.title,
    e.event_date,
    e.location,
    MIN(et.price_gbp) AS min_price,
    (ulh.play_count * 10)::INTEGER AS recommendation_score,
    'You listen to ' || p.display_name AS recommendation_reason
  FROM events e
  JOIN profiles p ON p.id = e.creator_id
  JOIN user_listening_history ulh ON ulh.artist_id = e.creator_id
  LEFT JOIN event_tickets et ON et.event_id = e.id AND et.is_active = true
  WHERE ulh.user_id = p_user_id
    AND e.event_date >= NOW()
    AND e.is_public = true
  GROUP BY e.id, e.title, e.event_date, e.location, ulh.play_count, p.display_name
  
  UNION ALL
  
  -- Events by genre the user likes
  SELECT DISTINCT
    e.id,
    e.title,
    e.event_date,
    e.location,
    MIN(et.price_gbp) AS min_price,
    5::INTEGER AS recommendation_score,
    'Based on your ' || e.category::TEXT || ' listening' AS recommendation_reason
  FROM events e
  JOIN user_listening_history ulh ON ulh.genre = e.category::TEXT
  LEFT JOIN event_tickets et ON et.event_id = e.id AND et.is_active = true
  WHERE ulh.user_id = p_user_id
    AND e.event_date >= NOW()
    AND e.is_public = true
    AND NOT EXISTS (
      SELECT 1 FROM user_listening_history ulh2 
      WHERE ulh2.user_id = p_user_id AND ulh2.artist_id = e.creator_id
    )
  GROUP BY e.id, e.title, e.event_date, e.location, e.category
  
  ORDER BY recommendation_score DESC, event_date ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 6: HELPER FUNCTIONS
-- ============================================

-- Generate unique ticket code
CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate format: SB-XXXX-XXXX-XXXX
    code := 'SB-' || 
            substring(md5(random()::text) from 1 for 4) || '-' ||
            substring(md5(random()::text) from 1 for 4) || '-' ||
            substring(md5(random()::text) from 1 for 4);
    code := upper(code);
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM ticket_purchases WHERE ticket_code = code) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Check ticket availability
CREATE OR REPLACE FUNCTION check_ticket_availability(
  p_ticket_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  available INTEGER;
  sales_active BOOLEAN;
BEGIN
  SELECT 
    (quantity_total - quantity_sold) >= p_quantity,
    (sales_start <= NOW() AND (sales_end IS NULL OR sales_end >= NOW()))
  INTO available, sales_active
  FROM event_tickets
  WHERE id = p_ticket_id AND is_active = true;
  
  RETURN COALESCE(available AND sales_active, false);
END;
$$ LANGUAGE plpgsql;

-- Get event ticket summary
CREATE OR REPLACE FUNCTION get_event_ticket_summary(p_event_id UUID)
RETURNS TABLE (
  total_tickets INTEGER,
  tickets_sold INTEGER,
  tickets_available INTEGER,
  revenue_generated DECIMAL,
  ticket_types INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    SUM(et.quantity_total)::INTEGER,
    SUM(et.quantity_sold)::INTEGER,
    SUM(et.quantity_total - et.quantity_sold)::INTEGER,
    COALESCE(SUM(tp.promoter_revenue), 0),
    COUNT(DISTINCT et.id)::INTEGER
  FROM event_tickets et
  LEFT JOIN ticket_purchases tp ON tp.ticket_id = et.id AND tp.payment_status = 'succeeded'
  WHERE et.event_id = p_event_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 7: RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE event_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_purchases ENABLE ROW LEVEL SECURITY;

-- Event tickets policies
CREATE POLICY "Event tickets are viewable by everyone"
  ON event_tickets FOR SELECT
  USING (is_active = true);

CREATE POLICY "Event creators can manage their event tickets"
  ON event_tickets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_tickets.event_id
      AND e.creator_id = auth.uid()
    )
  );

-- Ticket purchases policies
CREATE POLICY "Users can view their own ticket purchases"
  ON ticket_purchases FOR SELECT
  USING (user_id = auth.uid() OR buyer_email = auth.jwt()->>'email');

CREATE POLICY "Authenticated users can create ticket purchases"
  ON ticket_purchases FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Event creators can view tickets for their events"
  ON ticket_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = ticket_purchases.event_id
      AND e.creator_id = auth.uid()
    )
  );

-- Bundle policies
CREATE POLICY "Bundles are viewable by everyone"
  ON event_bundles FOR SELECT
  USING (is_active = true);

CREATE POLICY "Event creators can manage their bundles"
  ON event_bundles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_bundles.event_id
      AND e.creator_id = auth.uid()
    )
  );

-- Bundle purchase policies
CREATE POLICY "Users can view their own bundle purchases"
  ON bundle_purchases FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create bundle purchases"
  ON bundle_purchases FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- PART 8: INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ticket_purchases_user_status ON ticket_purchases(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_event_status ON ticket_purchases(event_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_event_bundles_event_active ON event_bundles(event_id, is_active);
CREATE INDEX IF NOT EXISTS idx_listening_history_user_artist ON user_listening_history(user_id, artist_id);

-- ============================================
-- PART 9: GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON event_tickets TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON event_tickets TO authenticated;

GRANT SELECT, INSERT ON ticket_purchases TO authenticated;
GRANT SELECT ON ticket_purchases TO anon;

GRANT SELECT ON event_bundles TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON event_bundles TO authenticated;

GRANT SELECT, INSERT ON bundle_purchases TO authenticated;

GRANT SELECT ON user_friends_attending_events TO authenticated;

GRANT EXECUTE ON FUNCTION get_artist_upcoming_events(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_personalized_event_recommendations(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_ticket_code() TO authenticated;
GRANT EXECUTE ON FUNCTION check_ticket_availability(UUID, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_event_ticket_summary(UUID) TO authenticated, anon;

-- Success message
SELECT 'Event ticketing schema created successfully!' AS status;
