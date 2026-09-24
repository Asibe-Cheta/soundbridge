-- Fix: purchased_event_tickets.amount_paid / platform_fee_amount / organizer_amount are
-- INTEGER columns, but confirm-ticket-purchase always computes and inserts fractional
-- major-unit values (e.g. £1.00 ticket, 15% platform fee → platform_fee_amount = 0.15,
-- organizer_amount = 0.85). Every insert with a non-whole-number split has been failing
-- with "invalid input syntax for type integer" — confirmed directly by probing all three
-- columns with real values from an actual charged-but-ticketless purchase
-- (pi_3UJ9Yw0Bt6mXrdye1oJz67k9, £1.00 GBP, succeeded in Stripe, zero rows in this table).
--
-- This is not a one-off — an 85/15 split on a real price essentially never lands on a
-- whole number, so this has likely been breaking ticket sales broadly, not just this event.
--
-- Widening INTEGER -> NUMERIC is lossless for any existing whole-number rows; no data at
-- risk either way (this table currently has zero rows for the affected events).

ALTER TABLE purchased_event_tickets
  ALTER COLUMN amount_paid TYPE NUMERIC(10, 2),
  ALTER COLUMN platform_fee_amount TYPE NUMERIC(10, 2),
  ALTER COLUMN organizer_amount TYPE NUMERIC(10, 2);
