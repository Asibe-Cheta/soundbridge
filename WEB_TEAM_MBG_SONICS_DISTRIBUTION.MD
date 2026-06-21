# MBG Sonics Distribution — What You Need To Do (SendGrid only)

No Resend. No Supabase edge functions. Uses your existing **SendGrid** setup on Vercel.

---

## Checklist

### 1. Database (you already ran this)

`supabase/migrations/20260621000002_distribution_requests.sql`

### 2. One SQL snippet in Supabase (go-live creator email)

Run in **Supabase → SQL editor**. Replace `YOUR_SERVICE_ROLE_KEY` with the same value as `SUPABASE_SERVICE_ROLE_KEY` on Vercel (Settings → API → service_role):

```sql
INSERT INTO public.app_settings (key, value) VALUES
  (
    'distribution_creator_live_email_url',
    'https://www.soundbridge.live/api/distribution/on-track-live'
  ),
  ('service_role_key', 'YOUR_SERVICE_ROLE_KEY')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
```

This lets the DB trigger email creators via SendGrid when an admin marks a request **live** in the mobile app.

### 3. Vercel env (you likely already have these)

| Variable | Purpose |
|----------|---------|
| `SENDGRID_API_KEY` | Sends all distribution emails |
| `SUPABASE_SERVICE_ROLE_KEY` | DB trigger → web webhook auth |
| `STRIPE_SECRET_KEY` | Payment intents |
| R2 vars (`CLOUDFLARE_*`, `R2_*`) | 7-day signed download links in partner email |

Optional override:

| Variable | Default |
|----------|---------|
| `MBG_PARTNER_EMAIL` | `israeldmy@gmail.com` |

### 4. Deploy web app

Push to `main` → Vercel redeploys. Mobile needs these live routes:

- `POST /api/distribution/create-payment-intent`
- `POST /api/distribution/confirm`

### 5. Ignore / skip

- Resend account
- `supabase login` / edge function deploy
- `RESEND_API_KEY`

---

## What happens automatically

1. Creator pays £15.79 in mobile app → Stripe Payment Sheet  
2. Mobile calls **`/api/distribution/confirm`** → row saved + **SendGrid email to `israeldmy@gmail.com`** with track/cover download links  
3. Admin marks **live** in mobile → DB trigger → **`/api/distribution/on-track-live`** → **SendGrid email to creator**

---

## Fee

£15.79 fixed — SoundBridge keeps 100%.
