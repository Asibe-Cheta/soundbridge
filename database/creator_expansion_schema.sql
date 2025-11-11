-- ==============================================
-- 10. TABLE: SERVICE BOOKINGS
-- ==============================================

CREATE TABLE IF NOT EXISTS service_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_offering_id UUID REFERENCES service_offerings(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  total_amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  platform_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  provider_payout NUMERIC(10,2) NOT NULL DEFAULT 0,
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  booking_notes TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  disputed_at TIMESTAMPTZ,
  dispute_reason TEXT,
  auto_release_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_bookings_status_check
    CHECK (status IN (
      'pending',
      'confirmed_awaiting_payment',
      'paid',
      'completed',
      'cancelled',
      'disputed'
    )),
  CONSTRAINT service_bookings_time_check
    CHECK (scheduled_end > scheduled_start)
);

CREATE INDEX IF NOT EXISTS idx_service_bookings_provider
  ON service_bookings(provider_id, scheduled_start);

CREATE INDEX IF NOT EXISTS idx_service_bookings_booker
  ON service_bookings(booker_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_bookings_status
  ON service_bookings(status);

-- Activity log for status transitions, reminders, etc.
CREATE TABLE IF NOT EXISTS booking_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES service_bookings(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_activity_booking
  ON booking_activity(booking_id, created_at);

-- Funds ledger for delayed payouts / escrow releases
CREATE TABLE IF NOT EXISTS booking_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES service_bookings(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_ledger_booking
  ON booking_ledger(booking_id);

-- Notification queue for booking lifecycle emails/reminders
CREATE TABLE IF NOT EXISTS booking_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES service_bookings(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed')),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_notifications_status_scheduled
  ON booking_notifications(status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_booking_notifications_recipient
  ON booking_notifications(recipient_id);

CREATE OR REPLACE FUNCTION trg_booking_notifications_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_notifications_set_updated_at ON booking_notifications;
CREATE TRIGGER trg_booking_notifications_set_updated_at
BEFORE UPDATE ON booking_notifications
FOR EACH ROW EXECUTE PROCEDURE trg_booking_notifications_set_updated_at();

-- Stripe Connect accounts mapping (providers must connect before payouts)
CREATE TABLE IF NOT EXISTS provider_connect_accounts (
  provider_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,
  charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  details_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  requirements JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================
-- 11. RLS POLICIES FOR BOOKINGS
-- ==============================================

ALTER TABLE service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_notifications ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_bookings'
      AND policyname = 'Provider or booker can view booking'
  ) THEN
    CREATE POLICY "Provider or booker can view booking"
      ON service_bookings
      FOR SELECT
      USING (
        auth.role() = 'service_role'
        OR provider_id = auth.uid()
        OR booker_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_bookings'
      AND policyname = 'Booker can insert booking'
  ) THEN
    CREATE POLICY "Booker can insert booking"
      ON service_bookings
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role' OR booker_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_bookings'
      AND policyname = 'Participants can update booking'
  ) THEN
    CREATE POLICY "Participants can update booking"
      ON service_bookings
      FOR UPDATE
      USING (
        auth.role() = 'service_role'
        OR provider_id = auth.uid()
        OR booker_id = auth.uid()
      )
      WITH CHECK (
        auth.role() = 'service_role'
        OR provider_id = auth.uid()
        OR booker_id = auth.uid()
      );
  END IF;
END
$policy$;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'booking_activity'
      AND policyname = 'Participants can view booking activity'
  ) THEN
    CREATE POLICY "Participants can view booking activity"
      ON booking_activity
      FOR SELECT
      USING (
        auth.role() = 'service_role'
        OR EXISTS (
          SELECT 1 FROM service_bookings
          WHERE id = booking_activity.booking_id
            AND (
              provider_id = auth.uid()
              OR booker_id = auth.uid()
            )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'booking_activity'
      AND policyname = 'Participants can insert booking activity'
  ) THEN
    CREATE POLICY "Participants can insert booking activity"
      ON booking_activity
      FOR INSERT
      WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
          SELECT 1 FROM service_bookings
          WHERE id = booking_activity.booking_id
            AND (
              provider_id = auth.uid()
              OR booker_id = auth.uid()
            )
        )
      );
  END IF;
END
$policy$;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'booking_ledger'
      AND policyname = 'Service role can manage ledger'
  ) THEN
    CREATE POLICY "Service role can manage ledger"
      ON booking_ledger
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$policy$;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'provider_connect_accounts'
      AND policyname = 'Providers manage their connect accounts'
  ) THEN
    CREATE POLICY "Providers manage their connect accounts"
      ON provider_connect_accounts
      FOR ALL
      USING (
        auth.role() = 'service_role'
        OR provider_id = auth.uid()
      )
      WITH CHECK (
        auth.role() = 'service_role'
        OR provider_id = auth.uid()
      );
  END IF;
END
$policy$;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'booking_notifications'
      AND policyname = 'Participants can view booking notifications'
  ) THEN
    CREATE POLICY "Participants can view booking notifications"
      ON booking_notifications
      FOR SELECT
      USING (
        auth.role() = 'service_role'
        OR EXISTS (
          SELECT 1 FROM service_bookings
          WHERE id = booking_notifications.booking_id
            AND (
              provider_id = auth.uid()
              OR booker_id = auth.uid()
            )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'booking_notifications'
      AND policyname = 'Service role manages booking notifications'
  ) THEN
    CREATE POLICY "Service role manages booking notifications"
      ON booking_notifications
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$policy$;

-- ==============================================
-- 12. TRIGGERS
-- ==============================================

-- Badge recalculation and history logging
CREATE OR REPLACE FUNCTION refresh_provider_badges(p_provider_id UUID)
RETURNS VOID AS $$
DECLARE
  v_previous_badge TEXT;
  v_new_badge TEXT := 'new_provider';
  v_completed INTEGER := 0;
  v_review_count INTEGER := 0;
  v_avg_rating NUMERIC(5,2) := 0;
BEGIN
  SELECT badge_tier
    INTO v_previous_badge
    FROM service_provider_profiles
    WHERE user_id = p_provider_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(COUNT(*), 0)
    INTO v_completed
    FROM service_bookings
    WHERE provider_id = p_provider_id
      AND status = 'completed';

  SELECT
    COALESCE(COUNT(*), 0),
    COALESCE(AVG(rating)::NUMERIC, 0)
    INTO v_review_count, v_avg_rating
    FROM service_reviews
    WHERE provider_id = p_provider_id
      AND status = 'published';

  v_avg_rating := ROUND(v_avg_rating, 2);

  IF v_completed >= 25 AND v_avg_rating >= 4.8 THEN
    v_new_badge := 'top_rated';
  ELSIF v_completed >= 10 THEN
    v_new_badge := 'established';
  ELSIF v_completed >= 3 AND v_avg_rating >= 4.5 THEN
    v_new_badge := 'rising_star';
  END IF;

  UPDATE service_provider_profiles
  SET
    completed_booking_count = v_completed,
    review_count = v_review_count,
    average_rating = v_avg_rating,
    badge_tier = v_new_badge,
    badge_updated_at = NOW()
  WHERE user_id = p_provider_id;

  IF v_previous_badge IS DISTINCT FROM v_new_badge THEN
    INSERT INTO provider_badge_history (provider_id, previous_tier, new_tier)
    VALUES (p_provider_id, v_previous_badge, v_new_badge);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION trg_refresh_provider_badges()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.provider_id IS NOT NULL THEN
    PERFORM refresh_provider_badges(NEW.provider_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_refresh_provider_badges_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.provider_id IS NOT NULL THEN
    PERFORM refresh_provider_badges(OLD.provider_id);
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_bookings_refresh_provider_badges ON service_bookings;
CREATE TRIGGER trg_service_bookings_refresh_provider_badges
AFTER INSERT OR UPDATE OF status ON service_bookings
FOR EACH ROW
EXECUTE FUNCTION trg_refresh_provider_badges();

DROP TRIGGER IF EXISTS trg_service_bookings_refresh_provider_badges_delete ON service_bookings;
CREATE TRIGGER trg_service_bookings_refresh_provider_badges_delete
AFTER DELETE ON service_bookings
FOR EACH ROW
EXECUTE FUNCTION trg_refresh_provider_badges_on_delete();

DROP TRIGGER IF EXISTS trg_service_reviews_refresh_provider_badges ON service_reviews;
CREATE TRIGGER trg_service_reviews_refresh_provider_badges
AFTER INSERT OR UPDATE ON service_reviews
FOR EACH ROW
EXECUTE FUNCTION trg_refresh_provider_badges();

DROP TRIGGER IF EXISTS trg_service_reviews_refresh_provider_badges_delete ON service_reviews;
CREATE TRIGGER trg_service_reviews_refresh_provider_badges_delete
AFTER DELETE ON service_reviews
FOR EACH ROW
EXECUTE FUNCTION trg_refresh_provider_badges_on_delete();

CREATE OR REPLACE FUNCTION trg_service_bookings_set_default_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_bookings_default_status ON service_bookings;
CREATE TRIGGER trg_service_bookings_default_status
BEFORE INSERT OR UPDATE ON service_bookings
FOR EACH ROW EXECUTE FUNCTION trg_service_bookings_set_default_status();

-- Creator Expansion & Service Provider Schema
-- Date: November 10, 2025

-- ==============================================
-- 1. LOOKUP TABLES
-- ==============================================

CREATE TABLE IF NOT EXISTS creator_type_lookup (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO creator_type_lookup (id, label, description)
VALUES
  ('musician', 'Musician', 'Performs and publishes music on SoundBridge'),
  ('podcaster', 'Podcaster', 'Creates episodic spoken word content'),
  ('dj', 'DJ', 'Performs curated music mixes'),
  ('event_organizer', 'Event Organizer', 'Hosts events and experiences'),
  ('service_provider', 'Service Provider', 'Offers paid creative services'),
  ('venue_owner', 'Venue Owner', 'Manages venues or spaces for events')
ON CONFLICT (id) DO UPDATE
SET label = EXCLUDED.label,
    description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS service_category_lookup (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO service_category_lookup (id, label, description)
VALUES
  ('sound_engineering', 'Sound Engineering', 'Live or studio sound services'),
  ('music_lessons', 'Music Lessons', 'Education and coaching services'),
  ('mixing_mastering', 'Mixing & Mastering', 'Audio post-production services'),
  ('session_musician', 'Session Musician', 'Instrumental or vocal sessions'),
  ('photography', 'Photography', 'Photo shoots and visual capture'),
  ('videography', 'Videography', 'Video production and editing'),
  ('lighting', 'Lighting', 'Lighting design and operation'),
  ('event_management', 'Event Management', 'Planning and coordination services'),
  ('other', 'Other', 'General creative service')
ON CONFLICT (id) DO UPDATE
SET label = EXCLUDED.label,
    description = EXCLUDED.description;

-- ==============================================
-- 2. CREATOR TYPES
-- ==============================================

CREATE TABLE IF NOT EXISTS user_creator_types (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creator_type TEXT NOT NULL REFERENCES creator_type_lookup(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, creator_type)
);

CREATE INDEX IF NOT EXISTS idx_user_creator_types_creator_type
  ON user_creator_types(creator_type);

ALTER TABLE user_creator_types ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_creator_types'
      AND policyname = 'Users can view their creator types'
  ) THEN
    CREATE POLICY "Users can view their creator types"
      ON user_creator_types
      FOR SELECT
      USING (auth.role() = 'service_role' OR auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_creator_types'
      AND policyname = 'Users can manage their creator types'
  ) THEN
    CREATE POLICY "Users can manage their creator types"
      ON user_creator_types
      FOR ALL
      USING (auth.role() = 'service_role' OR auth.uid() = user_id)
      WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);
  END IF;
END
$policy$;

-- ==============================================
-- 3. SERVICE PROVIDER PROFILES
-- ==============================================

CREATE TABLE IF NOT EXISTS service_provider_profiles (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  headline TEXT,
  bio TEXT,
  categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  default_rate NUMERIC(10,2),
  rate_currency TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status TEXT NOT NULL DEFAULT 'not_requested' CHECK (
    verification_status IN ('not_requested', 'pending', 'approved', 'rejected')
  ),
  verification_requested_at TIMESTAMPTZ,
  verification_reviewed_at TIMESTAMPTZ,
  verification_reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verification_notes TEXT,
  id_verified BOOLEAN NOT NULL DEFAULT FALSE,
  id_verified_at TIMESTAMPTZ,
  average_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_provider_profiles_status_check
    CHECK (status IN ('draft', 'pending_review', 'active', 'suspended'))
);

ALTER TABLE service_provider_profiles
  ADD COLUMN IF NOT EXISTS badge_tier TEXT NOT NULL DEFAULT 'new_provider'
    CHECK (badge_tier IN ('new_provider', 'rising_star', 'established', 'top_rated')),
  ADD COLUMN IF NOT EXISTS badge_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS completed_booking_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS show_payment_protection BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS first_booking_discount_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS first_booking_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (first_booking_discount_percent >= 0 AND first_booking_discount_percent <= 50);

CREATE INDEX IF NOT EXISTS idx_service_provider_profiles_status
  ON service_provider_profiles(status);

ALTER TABLE service_provider_profiles ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_provider_profiles'
      AND policyname = 'Public can view active service providers'
  ) THEN
    CREATE POLICY "Public can view active service providers"
      ON service_provider_profiles
      FOR SELECT
      USING (
        auth.role() = 'service_role'
        OR auth.uid() = user_id
        OR status = 'active'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_provider_profiles'
      AND policyname = 'Owners can manage service provider profiles'
  ) THEN
    CREATE POLICY "Owners can manage service provider profiles"
      ON service_provider_profiles
      FOR ALL
      USING (auth.role() = 'service_role' OR auth.uid() = user_id)
      WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);
  END IF;
END
$policy$;

-- Badge history log for audit trail
CREATE TABLE IF NOT EXISTS provider_badge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_provider_profiles(user_id) ON DELETE CASCADE,
  previous_tier TEXT,
  new_tier TEXT NOT NULL CHECK (new_tier IN ('new_provider', 'rising_star', 'established', 'top_rated')),
  reason TEXT DEFAULT 'auto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_badge_history_provider
  ON provider_badge_history(provider_id, created_at DESC);

ALTER TABLE provider_badge_history ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'provider_badge_history'
      AND policyname = 'Providers can view their badge history'
  ) THEN
    CREATE POLICY "Providers can view their badge history"
      ON provider_badge_history
      FOR SELECT
      USING (
        auth.role() = 'service_role'
        OR provider_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'provider_badge_history'
      AND policyname = 'Service role manages badge history'
  ) THEN
    CREATE POLICY "Service role manages badge history"
      ON provider_badge_history
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$policy$;

-- ==============================================
-- 4. SERVICE PROVIDER VERIFICATION REQUESTS
-- ==============================================

CREATE TABLE IF NOT EXISTS service_provider_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_provider_profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  provider_notes TEXT,
  automated_checks JSONB,
  bookings_completed INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2),
  portfolio_items INTEGER,
  profile_completeness JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_requests_status
  ON service_provider_verification_requests(status);

CREATE INDEX IF NOT EXISTS idx_verification_requests_provider
  ON service_provider_verification_requests(provider_id);

CREATE OR REPLACE FUNCTION trg_verification_requests_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verification_requests_set_updated_at ON service_provider_verification_requests;
CREATE TRIGGER trg_verification_requests_set_updated_at
BEFORE UPDATE ON service_provider_verification_requests
FOR EACH ROW EXECUTE PROCEDURE trg_verification_requests_set_updated_at();

ALTER TABLE service_provider_verification_requests ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_provider_verification_requests'
      AND policyname = 'Providers view their verification requests'
  ) THEN
    CREATE POLICY "Providers view their verification requests"
      ON service_provider_verification_requests
      FOR SELECT
      USING (
        auth.role() = 'service_role'
        OR provider_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_provider_verification_requests'
      AND policyname = 'Providers submit verification requests'
  ) THEN
    CREATE POLICY "Providers submit verification requests"
      ON service_provider_verification_requests
      FOR INSERT
      WITH CHECK (
        auth.role() = 'service_role'
        OR provider_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_provider_verification_requests'
      AND policyname = 'Service role manages verification requests'
  ) THEN
    CREATE POLICY "Service role manages verification requests"
      ON service_provider_verification_requests
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$policy$;

-- ==============================================
-- 5. SERVICE PROVIDER VERIFICATION DOCUMENTS
-- ==============================================

CREATE TABLE IF NOT EXISTS service_provider_verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES service_provider_verification_requests(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_documents_request
  ON service_provider_verification_documents(request_id);

ALTER TABLE service_provider_verification_documents ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_provider_verification_documents'
      AND policyname = 'Providers manage verification documents'
  ) THEN
    CREATE POLICY "Providers manage verification documents"
      ON service_provider_verification_documents
      FOR ALL
      USING (
        auth.role() = 'service_role'
        OR EXISTS (
          SELECT 1 FROM service_provider_verification_requests spr
          WHERE spr.id = service_provider_verification_documents.request_id
            AND spr.provider_id = auth.uid()
        )
      )
      WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
          SELECT 1 FROM service_provider_verification_requests spr
          WHERE spr.id = service_provider_verification_documents.request_id
            AND spr.provider_id = auth.uid()
        )
      );
  END IF;
END
$policy$;

-- ==============================================
-- 6. SERVICE OFFERINGS
-- ==============================================

CREATE TABLE IF NOT EXISTS service_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_provider_profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL REFERENCES service_category_lookup(id),
  description TEXT,
  rate_amount NUMERIC(10,2),
  rate_currency TEXT,
  rate_unit TEXT NOT NULL DEFAULT 'hour',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_offerings_provider
  ON service_offerings(provider_id);

ALTER TABLE service_offerings ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_offerings'
      AND policyname = 'Public can view active service offerings'
  ) THEN
    CREATE POLICY "Public can view active service offerings"
      ON service_offerings
      FOR SELECT
      USING (
        auth.role() = 'service_role'
        OR provider_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM service_provider_profiles spp
          WHERE spp.user_id = service_offerings.provider_id
            AND spp.status = 'active'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_offerings'
      AND policyname = 'Owners can manage service offerings'
  ) THEN
    CREATE POLICY "Owners can manage service offerings"
      ON service_offerings
      FOR ALL
      USING (auth.role() = 'service_role' OR provider_id = auth.uid())
      WITH CHECK (auth.role() = 'service_role' OR provider_id = auth.uid());
  END IF;
END
$policy$;

-- ==============================================
-- 5. SERVICE PORTFOLIO
-- ==============================================

CREATE TABLE IF NOT EXISTS service_portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_provider_profiles(user_id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_portfolio_provider
  ON service_portfolio_items(provider_id);

ALTER TABLE service_portfolio_items ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_portfolio_items'
      AND policyname = 'Public can view service portfolios'
  ) THEN
    CREATE POLICY "Public can view service portfolios"
      ON service_portfolio_items
      FOR SELECT
      USING (
        auth.role() = 'service_role'
        OR provider_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM service_provider_profiles spp
          WHERE spp.user_id = service_portfolio_items.provider_id
            AND spp.status = 'active'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_portfolio_items'
      AND policyname = 'Owners can manage service portfolios'
  ) THEN
    CREATE POLICY "Owners can manage service portfolios"
      ON service_portfolio_items
      FOR ALL
      USING (auth.role() = 'service_role' OR provider_id = auth.uid())
      WITH CHECK (auth.role() = 'service_role' OR provider_id = auth.uid());
  END IF;
END
$policy$;

-- ==============================================
-- 6. SERVICE PROVIDER AVAILABILITY
-- ==============================================

CREATE TABLE IF NOT EXISTS service_provider_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_provider_profiles(user_id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_rule TEXT,
  is_bookable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_provider_availability_time_check
    CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_service_provider_availability_provider
  ON service_provider_availability(provider_id);

ALTER TABLE service_provider_availability ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_provider_availability'
      AND policyname = 'Public can view bookable availability'
  ) THEN
    CREATE POLICY "Public can view bookable availability"
      ON service_provider_availability
      FOR SELECT
      USING (
        auth.role() = 'service_role'
        OR provider_id = auth.uid()
        OR (
          is_bookable = TRUE
          AND EXISTS (
            SELECT 1 FROM service_provider_profiles spp
            WHERE spp.user_id = service_provider_availability.provider_id
              AND spp.status = 'active'
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_provider_availability'
      AND policyname = 'Owners can manage service availability'
  ) THEN
    CREATE POLICY "Owners can manage service availability"
      ON service_provider_availability
      FOR ALL
      USING (auth.role() = 'service_role' OR provider_id = auth.uid())
      WITH CHECK (auth.role() = 'service_role' OR provider_id = auth.uid());
  END IF;
END
$policy$;

-- ==============================================
-- 7. SERVICE REVIEWS
-- ==============================================

CREATE TABLE IF NOT EXISTS service_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_provider_profiles(user_id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  comment TEXT,
  booking_reference UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_reviews_status_check
    CHECK (status IN ('pending', 'published', 'flagged', 'removed'))
);

CREATE INDEX IF NOT EXISTS idx_service_reviews_provider
  ON service_reviews(provider_id);

CREATE INDEX IF NOT EXISTS idx_service_reviews_reviewer
  ON service_reviews(reviewer_id);

ALTER TABLE service_reviews ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_reviews'
      AND policyname = 'Public can view published service reviews'
  ) THEN
    CREATE POLICY "Public can view published service reviews"
      ON service_reviews
      FOR SELECT
      USING (
        auth.role() = 'service_role'
        OR reviewer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM service_provider_profiles spp
          WHERE spp.user_id = service_reviews.provider_id
            AND spp.status = 'active'
        )
        OR status = 'published'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_reviews'
      AND policyname = 'Reviewers can manage their service reviews'
  ) THEN
    CREATE POLICY "Reviewers can manage their service reviews"
      ON service_reviews
      FOR ALL
      USING (auth.role() = 'service_role' OR reviewer_id = auth.uid())
      WITH CHECK (auth.role() = 'service_role' OR reviewer_id = auth.uid());
  END IF;
END
$policy$;

-- Recalculate provider ratings when reviews change

CREATE OR REPLACE FUNCTION refresh_service_provider_rating(p_provider_id UUID)
RETURNS VOID AS $$
DECLARE
  rating_record RECORD;
BEGIN
  SELECT
    COALESCE(AVG(rating), 0)::NUMERIC(3,2) AS avg_rating,
    COUNT(*)::INTEGER AS review_count
  INTO rating_record
  FROM service_reviews
  WHERE provider_id = p_provider_id
    AND status = 'published';

  UPDATE service_provider_profiles
  SET average_rating = COALESCE(rating_record.avg_rating, 0),
      review_count = COALESCE(rating_record.review_count, 0),
      updated_at = NOW()
  WHERE user_id = p_provider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION refresh_service_provider_rating(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION trg_refresh_service_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_service_provider_rating(OLD.provider_id);
    RETURN OLD;
  ELSE
    PERFORM refresh_service_provider_rating(NEW.provider_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_service_reviews_refresh_provider_rating ON service_reviews;
CREATE TRIGGER trg_service_reviews_refresh_provider_rating
AFTER INSERT OR UPDATE OR DELETE ON service_reviews
FOR EACH ROW EXECUTE FUNCTION trg_refresh_service_provider_rating();

-- ==============================================
-- 8. VENUES (PHASE 2 PREPARATION)
-- ==============================================

CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address JSONB,
  capacity INTEGER,
  amenities TEXT[] DEFAULT ARRAY[]::TEXT[],
  primary_contact JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT venues_status_check
    CHECK (status IN ('draft', 'pending_review', 'active', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_venues_status
  ON venues(status);

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'venues'
      AND policyname = 'Public can view active venues'
  ) THEN
    CREATE POLICY "Public can view active venues"
      ON venues
      FOR SELECT
      USING (
        auth.role() = 'service_role'
        OR owner_id = auth.uid()
        OR status = 'active'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'venues'
      AND policyname = 'Owners can manage venues'
  ) THEN
    CREATE POLICY "Owners can manage venues"
      ON venues
      FOR ALL
      USING (auth.role() = 'service_role' OR owner_id = auth.uid())
      WITH CHECK (auth.role() = 'service_role' OR owner_id = auth.uid());
  END IF;
END
$policy$;

-- ==============================================
-- 9. SUMMARY
-- ==============================================
-- ✅ Added creator type & service category lookups
-- ✅ Created user_creator_types table with RLS
-- ✅ Added service provider profile, offerings, portfolio, availability tables
-- ✅ Added service reviews with automatic rating refresh
-- ✅ Stubbed venues table for Phase 2
-- ✅ Established RLS policies for all new tables


