-- Event Ticket Payment System Schema
-- Simplified structure for direct event ticket purchases (not ticket types)
-- Date: December 3, 2025

-- ============================================
-- EVENT TICKETS TABLE (Purchased Tickets)
-- ============================================

-- Note: This table stores purchased tickets directly linked to events
-- Different from the existing event_tickets table which stores ticket types
CREATE TABLE IF NOT EXISTS purchased_event_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event and User references
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Ticket identification
  ticket_code VARCHAR(20) UNIQUE NOT NULL, -- Format: EVT-XXXXXX
  
  -- Purchase details
  quantity INTEGER NOT NULL DEFAULT 1,
  amount_paid INTEGER NOT NULL, -- Amount in smallest currency unit (pence for GBP, kobo for NGN)
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('GBP', 'NGN')),
  
  -- Stripe payment details
  payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  
  -- Purchase date
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'refunded', 'cancelled')),
  
  -- Fee breakdown (stored in smallest currency unit)
  platform_fee_amount INTEGER NOT NULL, -- 5% platform fee
  organizer_amount INTEGER NOT NULL, -- 95% to organizer
  
  -- Usage tracking
  used_at TIMESTAMPTZ, -- When ticket was scanned/used
  validated_by UUID REFERENCES profiles(id), -- Who validated the ticket (organizer/staff)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_amount CHECK (amount_paid > 0),
  CONSTRAINT valid_quantity CHECK (quantity > 0),
  CONSTRAINT valid_fee_breakdown CHECK (platform_fee_amount + organizer_amount <= amount_paid)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchased_tickets_event_id ON purchased_event_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_purchased_tickets_user_id ON purchased_event_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_purchased_tickets_ticket_code ON purchased_event_tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_purchased_tickets_payment_intent ON purchased_event_tickets(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_purchased_tickets_status ON purchased_event_tickets(status);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to generate unique ticket code (EVT-XXXXXX format)
CREATE OR REPLACE FUNCTION generate_event_ticket_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  code VARCHAR(20);
  exists_check BOOLEAN;
  attempts INTEGER := 0;
  max_attempts INTEGER := 10;
BEGIN
  LOOP
    attempts := attempts + 1;
    
    -- Generate code: EVT-XXXXXX (6 alphanumeric characters)
    -- Use random alphanumeric characters (0-9, A-Z)
    code := 'EVT-' || upper(
      substring(
        translate(
          md5(random()::text || clock_timestamp()::text || random()::text),
          '0123456789abcdef',
          'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        )
        from 1 for 6
      )
    );
    
    -- Check if code exists (also check in ticket_purchases table for compatibility)
    SELECT EXISTS(
      SELECT 1 FROM purchased_event_tickets 
      WHERE ticket_code = code
      UNION
      SELECT 1 FROM ticket_purchases
      WHERE ticket_code = code
    ) INTO exists_check;
    
    -- Exit loop if code is unique or max attempts reached
    EXIT WHEN NOT exists_check OR attempts >= max_attempts;
  END LOOP;
  
  -- If we couldn't generate a unique code, throw error
  IF exists_check THEN
    RAISE EXCEPTION 'Failed to generate unique ticket code after % attempts', max_attempts;
  END IF;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_purchased_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS trg_update_purchased_ticket_updated_at ON purchased_event_tickets;
CREATE TRIGGER trg_update_purchased_ticket_updated_at
  BEFORE UPDATE ON purchased_event_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_purchased_ticket_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE purchased_event_tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own purchased tickets" ON purchased_event_tickets;
DROP POLICY IF EXISTS "Authenticated users can create ticket purchases" ON purchased_event_tickets;
DROP POLICY IF EXISTS "Event organizers can view tickets for their events" ON purchased_event_tickets;
DROP POLICY IF EXISTS "Event organizers can update ticket status" ON purchased_event_tickets;

-- Users can view their own purchased tickets
CREATE POLICY "Users can view their own purchased tickets"
  ON purchased_event_tickets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can create ticket purchases
CREATE POLICY "Authenticated users can create ticket purchases"
  ON purchased_event_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Event organizers can view tickets for their events
CREATE POLICY "Event organizers can view tickets for their events"
  ON purchased_event_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = purchased_event_tickets.event_id
        AND events.creator_id = auth.uid()
    )
  );

-- Event organizers can update ticket status (validate/use tickets)
CREATE POLICY "Event organizers can update ticket status"
  ON purchased_event_tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = purchased_event_tickets.event_id
        AND events.creator_id = auth.uid()
    )
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE purchased_event_tickets IS 'Stores purchased event tickets directly linked to events';
COMMENT ON COLUMN purchased_event_tickets.ticket_code IS 'Unique ticket code in format EVT-XXXXXX';
COMMENT ON COLUMN purchased_event_tickets.amount_paid IS 'Total amount paid in smallest currency unit (pence for GBP, kobo for NGN)';
COMMENT ON COLUMN purchased_event_tickets.platform_fee_amount IS '5% platform fee in smallest currency unit';
COMMENT ON COLUMN purchased_event_tickets.organizer_amount IS '95% to organizer in smallest currency unit';
COMMENT ON FUNCTION generate_event_ticket_code() IS 'Generates unique ticket code in EVT-XXXXXX format';

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT, INSERT ON purchased_event_tickets TO authenticated;
GRANT SELECT ON purchased_event_tickets TO anon;
GRANT EXECUTE ON FUNCTION generate_event_ticket_code() TO authenticated;

-- ============================================
-- ENSURE EVENTS TABLE HAS COUNTRY COLUMN
-- ============================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Index for proximity queries (if coordinates exist)
CREATE INDEX IF NOT EXISTS idx_events_coordinates ON events(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
