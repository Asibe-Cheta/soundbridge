-- Item: Limited-discount tickets + tiered ticket categories.
--
-- Design: event_ticket_tiers is the single unified pricing mechanism for both features,
-- so they compose freely (a tier can have a discount, or not; an event can have one tier
-- with a discount and no other tiers, which is functionally "a discount with no real
-- tiering"). Events with ZERO rows here keep working exactly as today — price comes from
-- events.price_gbp/price_ngn, no purchase-flow change, no migration needed for existing
-- events. Only events that opt into tiers/discounts get rows here at all.
--
-- Discount fields are on the tier itself (not a separate table) because the prompt's own
-- framing — "once that quantity is sold, price reverts to standard for subsequent
-- purchases" — only makes sense relative to a single, specific "standard price", which is
-- exactly what a tier row already is.

CREATE TABLE IF NOT EXISTS event_ticket_tiers (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id                 UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  description              TEXT,
  price_gbp                NUMERIC(10, 2),
  price_ngn                NUMERIC(10, 2),
  quantity_available       INTEGER,                    -- NULL = unlimited at this tier
  quantity_sold            INTEGER NOT NULL DEFAULT 0,
  discount_percent         NUMERIC(5, 2),                -- e.g. 30.00 for 30% off; NULL = no discount
  discount_quantity_limit  INTEGER,                      -- how many tickets at this tier get the discount
  discount_quantity_used   INTEGER NOT NULL DEFAULT 0,
  display_order            INTEGER NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT event_ticket_tiers_price_check CHECK (price_gbp IS NOT NULL OR price_ngn IS NOT NULL),
  CONSTRAINT event_ticket_tiers_discount_pair CHECK (
    (discount_percent IS NULL AND discount_quantity_limit IS NULL)
    OR (discount_percent IS NOT NULL AND discount_quantity_limit IS NOT NULL)
  ),
  CONSTRAINT event_ticket_tiers_discount_range CHECK (
    discount_percent IS NULL OR (discount_percent > 0 AND discount_percent < 100)
  )
);

CREATE INDEX IF NOT EXISTS event_ticket_tiers_event_id_idx ON event_ticket_tiers (event_id);

ALTER TABLE event_ticket_tiers ENABLE ROW LEVEL SECURITY;

-- Publicly readable — same reasoning as event_co_organizers/sound_divisions: additive
-- metadata on an already-public event.
CREATE POLICY "Event ticket tiers are publicly readable"
  ON event_ticket_tiers FOR SELECT USING (true);

-- Only the event's own creator can manage its tiers.
CREATE POLICY "Event creators can manage tiers on their own events"
  ON event_ticket_tiers FOR ALL
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.creator_id = auth.uid()));

-- Record which tier (if any) a purchased ticket belongs to. NULL for every existing
-- ticket and for any future purchase of an event with no tiers — fully backward compatible.
ALTER TABLE purchased_event_tickets
  ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES event_ticket_tiers(id);

CREATE INDEX IF NOT EXISTS purchased_event_tickets_tier_id_idx ON purchased_event_tickets (tier_id);

-- Atomically increments quantity_sold (and discount_quantity_used, if the ticket was sold
-- at the discounted price) and returns whether it fit within quantity_available — avoids a
-- read-then-write race between two buyers hitting the last ticket/discount slot at once.
CREATE OR REPLACE FUNCTION public.increment_ticket_tier_sold(
  p_tier_id UUID,
  p_quantity INTEGER,
  p_used_discount BOOLEAN
)
RETURNS TABLE (success BOOLEAN, new_quantity_sold INTEGER, new_discount_quantity_used INTEGER) AS $$
DECLARE
  v_tier RECORD;
BEGIN
  SELECT * INTO v_tier FROM event_ticket_tiers WHERE id = p_tier_id FOR UPDATE;
  IF v_tier IS NULL THEN
    RETURN QUERY SELECT false, 0, 0;
    RETURN;
  END IF;

  IF v_tier.quantity_available IS NOT NULL
     AND (v_tier.quantity_sold + p_quantity) > v_tier.quantity_available THEN
    RETURN QUERY SELECT false, v_tier.quantity_sold, v_tier.discount_quantity_used;
    RETURN;
  END IF;

  UPDATE event_ticket_tiers
  SET
    quantity_sold = quantity_sold + p_quantity,
    discount_quantity_used = discount_quantity_used + (CASE WHEN p_used_discount THEN p_quantity ELSE 0 END),
    updated_at = NOW()
  WHERE id = p_tier_id
  RETURNING quantity_sold, discount_quantity_used INTO v_tier.quantity_sold, v_tier.discount_quantity_used;

  RETURN QUERY SELECT true, v_tier.quantity_sold, v_tier.discount_quantity_used;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.increment_ticket_tier_sold(UUID, INTEGER, BOOLEAN) TO service_role;
