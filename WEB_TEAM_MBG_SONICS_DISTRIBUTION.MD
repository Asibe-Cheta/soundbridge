# MBG Sonics Distribution — Web Team Handoff

Mobile distribution flow is live. Web must deploy the following.

## 1. SQL migration

Run in Supabase SQL editor (if not already applied by mobile):

`supabase/migrations/20260621000002_distribution_requests.sql`

Also configure trigger URL in `app_settings` (replace project ref):

```sql
INSERT INTO public.app_settings (key, value) VALUES
  ('distribution_creator_live_email_url', 'https://YOUR_PROJECT.supabase.co/functions/v1/send-distribution-creator-live-email'),
  ('service_role_key', 'YOUR_SERVICE_ROLE_KEY')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

## 2. Deploy edge functions

```bash
supabase functions deploy send-distribution-email
supabase functions deploy send-distribution-creator-live-email
supabase secrets set RESEND_API_KEY=<key>
supabase secrets set MBG_PARTNER_EMAIL=distributions@mbgsonics.com
# Optional — for 7-day R2 audio download links in partner email:
supabase secrets set CLOUDFLARE_ACCOUNT_ID=<id>
supabase secrets set CLOUDFLARE_ACCESS_KEY_ID=<key>
supabase secrets set CLOUDFLARE_SECRET_ACCESS_KEY=<secret>
supabase secrets set R2_BUCKET_NAME=<bucket>
supabase secrets set R2_PUBLIC_URL=<public base url>
```

## 3. API endpoints (deployed with web app)

### POST `/api/distribution/create-payment-intent`

- Auth: Bearer required
- Body: `{ "creatorId": "uuid", "trackId": "uuid" }`
- Returns: `{ "clientSecret": "...", "paymentIntentId": "pi_..." }`
- Stripe: `1579` GBP, metadata `{ creator_id, track_id, type: mbg_distribution }`

### POST `/api/distribution/confirm`

- Auth: Bearer required (after Payment Sheet succeeds)
- Body: full distribution form + `paymentIntentId`
- Verifies PI succeeded, inserts `distribution_requests`, invokes `send-distribution-email`
- Returns: `{ "requestId": "uuid", "releaseDate": "YYYY-MM-DD" }`

## 4. Creator go-live email

When admin sets `track_status = 'live'` (mobile admin screen via Supabase), DB trigger calls `send-distribution-creator-live-email` edge function (requires `app_settings` rows above).

## Fee

£15.79 fixed — SoundBridge keeps 100%. No partner split fields.
