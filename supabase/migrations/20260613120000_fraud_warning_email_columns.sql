-- Track fraud warning emails sent from admin dashboard

ALTER TABLE public.creator_fraud_analysis
  ADD COLUMN IF NOT EXISTS warning_email_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS warning_email_sent_at timestamptz;

COMMENT ON COLUMN public.creator_fraud_analysis.warning_email_sent IS
  'True when admin sent a fraud warning or payout-withheld email to the creator.';
COMMENT ON COLUMN public.creator_fraud_analysis.warning_email_sent_at IS
  'When the fraud warning email was sent.';
