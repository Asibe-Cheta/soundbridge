-- Add stripe_client_secret to opportunity_projects for GET project and retry-payment (poster can complete payment)
-- See WEB_TEAM_GIG_PAYMENT_RETRY_ENDPOINT.md

ALTER TABLE opportunity_projects
ADD COLUMN IF NOT EXISTS stripe_client_secret TEXT;

COMMENT ON COLUMN opportunity_projects.stripe_client_secret IS 'Stripe PaymentIntent client_secret; exposed only to poster when status=payment_pending';
