# Internal Outreach Tracker — Web Complete
Date: 24 Jun 2026

## Deploy checklist

1. **Migration:** `supabase/migrations/20260624130000_internal_outreach_tracker.sql`
   - Adds `profiles.is_internal_team`
   - Seeds `asibechetachukwu@gmail.com` and `merituche2003@gmail.com`
   - Creates `outreach_contacts` + `outreach_meetings` with RLS

2. **Edge function:** deploy `supabase/functions/outreach-meeting-reminders`
   ```bash
   supabase functions deploy outreach-meeting-reminders
   ```
   Ensure `EXPO_ACCESS_TOKEN` is set in Supabase secrets (same as event notifications).

3. **Cron:** Vercel runs `GET /api/cron/outreach-meeting-reminders` every 5 minutes (`vercel.json`). No pg_cron required if Vercel cron is active.

## Web UI

**URL:** `/internal/outreach`  
Non-internal users are silently redirected to `/feed`.

## API (internal team Bearer/session)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/internal/outreach/status` | Access check |
| GET/POST | `/api/internal/outreach/contacts` | List / create |
| PATCH/DELETE | `/api/internal/outreach/contacts/[id]` | Update flags / delete |
| POST | `/api/internal/outreach/meetings` | Schedule meeting |
| DELETE | `/api/internal/outreach/meetings/[id]` | Remove meeting |

Mobile may continue using Supabase client directly (RLS enforces `is_internal_team`).

## Reminder behaviour

~90 minutes before `scheduled_at`, edge function pushes all `is_internal_team` users (profiles `expo_push_token` + `user_push_tokens`), then sets `reminder_sent = true`.
