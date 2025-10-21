-- =====================================================
-- Event Cancellation & Refund System Schema
-- =====================================================

-- Add cancellation tracking columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed', 'postponed'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(50) CHECK (cancellation_reason IN ('force_majeure', 'organizer_emergency', 'venue_issues', 'low_attendance', 'artist_cancellation'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);

-- Add refund tracking to ticket_purchases
ALTER TABLE ticket_purchases ADD COLUMN IF NOT EXISTS refund_id VARCHAR(100);
ALTER TABLE ticket_purchases ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE ticket_purchases ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2);
ALTER TABLE ticket_purchases ADD COLUMN IF NOT EXISTS refund_reason VARCHAR(50);
ALTER TABLE ticket_purchases ADD COLUMN IF NOT EXISTS refund_error TEXT;

-- Update ticket_purchases status to include refund states
ALTER TABLE ticket_purchases DROP CONSTRAINT IF EXISTS ticket_purchases_status_check;
ALTER TABLE ticket_purchases ADD CONSTRAINT ticket_purchases_status_check 
  CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded', 'refund_failed', 'refund_processing'));

-- Create index for faster queries on event status
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_cancelled_at ON events(cancelled_at) WHERE cancelled_at IS NOT NULL;

-- Create index for refund tracking
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_refund_status ON ticket_purchases(status) WHERE status IN ('refunded', 'refund_failed', 'refund_processing');
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_refund_id ON ticket_purchases(refund_id) WHERE refund_id IS NOT NULL;

-- =====================================================
-- Refund Statistics View
-- =====================================================

CREATE OR REPLACE VIEW event_refund_statistics AS
SELECT 
  e.id AS event_id,
  e.title AS event_title,
  e.status AS event_status,
  e.cancelled_at,
  e.cancellation_reason,
  COUNT(tp.id) AS total_tickets,
  COUNT(CASE WHEN tp.status = 'refunded' THEN 1 END) AS refunded_tickets,
  COUNT(CASE WHEN tp.status = 'refund_failed' THEN 1 END) AS failed_refunds,
  COUNT(CASE WHEN tp.status = 'refund_processing' THEN 1 END) AS processing_refunds,
  SUM(CASE WHEN tp.status = 'refunded' THEN tp.refund_amount ELSE 0 END) AS total_refunded_amount,
  ROUND(
    (COUNT(CASE WHEN tp.status = 'refunded' THEN 1 END)::DECIMAL / 
     NULLIF(COUNT(tp.id), 0) * 100), 2
  ) AS refund_success_rate
FROM events e
LEFT JOIN ticket_purchases tp ON e.id = tp.event_id
WHERE e.status = 'cancelled'
GROUP BY e.id, e.title, e.status, e.cancelled_at, e.cancellation_reason;

-- =====================================================
-- Automatic Event Status Update Triggers
-- =====================================================

-- Function to update bundle purchases when event is cancelled
CREATE OR REPLACE FUNCTION update_bundle_purchases_on_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Mark associated bundle purchases for refund
    UPDATE bundle_purchases
    SET status = 'refund_processing'
    WHERE event_id = NEW.id
      AND status = 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bundle purchase updates
DROP TRIGGER IF EXISTS trigger_update_bundles_on_event_cancellation ON events;
CREATE TRIGGER trigger_update_bundles_on_event_cancellation
  AFTER UPDATE OF status ON events
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled')
  EXECUTE FUNCTION update_bundle_purchases_on_cancellation();

-- =====================================================
-- RLS Policies for Cancellation Data
-- =====================================================

-- Organizers can cancel their own events
CREATE POLICY "Organizers can cancel their own events"
  ON events
  FOR UPDATE
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Users can view their refund status
CREATE POLICY "Users can view their own refund status"
  ON ticket_purchases
  FOR SELECT
  USING (auth.uid() = user_id);

-- Organizers can view refund statistics for their events
CREATE POLICY "Organizers can view refund statistics"
  ON ticket_purchases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = ticket_purchases.event_id 
        AND events.creator_id = auth.uid()
    )
  );

-- Grant access to refund statistics view
GRANT SELECT ON event_refund_statistics TO authenticated;

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to get refund statistics for an organizer
CREATE OR REPLACE FUNCTION get_organizer_refund_stats(organizer_id UUID)
RETURNS TABLE (
  total_cancelled_events BIGINT,
  total_refunds_processed BIGINT,
  total_refunds_failed BIGINT,
  total_refunded_amount NUMERIC,
  average_refund_success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT e.id) AS total_cancelled_events,
    COUNT(CASE WHEN tp.status = 'refunded' THEN 1 END) AS total_refunds_processed,
    COUNT(CASE WHEN tp.status = 'refund_failed' THEN 1 END) AS total_refunds_failed,
    SUM(CASE WHEN tp.status = 'refunded' THEN tp.refund_amount ELSE 0 END) AS total_refunded_amount,
    ROUND(AVG(
      CASE WHEN COUNT(tp.id) > 0 
        THEN (COUNT(CASE WHEN tp.status = 'refunded' THEN 1 END)::DECIMAL / COUNT(tp.id) * 100)
        ELSE 0
      END
    ), 2) AS average_refund_success_rate
  FROM events e
  LEFT JOIN ticket_purchases tp ON e.id = tp.event_id
  WHERE e.creator_id = organizer_id
    AND e.status = 'cancelled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending refunds that need manual processing
CREATE OR REPLACE FUNCTION get_pending_refunds()
RETURNS TABLE (
  purchase_id UUID,
  event_id UUID,
  event_title VARCHAR,
  buyer_email VARCHAR,
  amount_paid DECIMAL,
  failed_attempts INT,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.id AS purchase_id,
    tp.event_id,
    e.title AS event_title,
    tp.buyer_email,
    tp.amount_paid,
    0 AS failed_attempts, -- Can be enhanced to track retry attempts
    tp.refund_error AS last_error,
    tp.created_at
  FROM ticket_purchases tp
  INNER JOIN events e ON tp.event_id = e.id
  WHERE tp.status = 'refund_failed'
    AND e.status = 'cancelled'
  ORDER BY tp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON COLUMN events.status IS 'Event status: active, cancelled, completed, or postponed';
COMMENT ON COLUMN events.cancellation_reason IS 'Reason for event cancellation';
COMMENT ON COLUMN events.cancelled_at IS 'Timestamp when event was cancelled';
COMMENT ON COLUMN events.cancelled_by IS 'User ID who cancelled the event';

COMMENT ON COLUMN ticket_purchases.refund_id IS 'Stripe refund ID for tracking';
COMMENT ON COLUMN ticket_purchases.refunded_at IS 'Timestamp when refund was processed';
COMMENT ON COLUMN ticket_purchases.refund_amount IS 'Amount refunded to customer';
COMMENT ON COLUMN ticket_purchases.refund_reason IS 'Reason for refund';
COMMENT ON COLUMN ticket_purchases.refund_error IS 'Error message if refund failed';

COMMENT ON VIEW event_refund_statistics IS 'Aggregated refund statistics per cancelled event';
COMMENT ON FUNCTION get_organizer_refund_stats IS 'Get refund statistics for a specific organizer';
COMMENT ON FUNCTION get_pending_refunds IS 'Get list of failed refunds that need manual processing';

