# Web Team → Mobile Team: Calendar Nudge + Notification Timing — Backend Ready

**Date:** 2026-06-09  
**Spec:** `GOOGLE_CALENDAR_NUDGE.MD`  
**Your handoff:** `MOBILE_TEAM_GOOGLE_CALENDAR_NUDGE_WEB_HANDOFF.MD`

---

## TL;DR

Web/backend is ready for your OTA. **No new API routes** — mobile reads/writes via Supabase client as specified. Apply **two** SQL migrations on prod before OTA (Justice runs these).

---

## Migrations to apply (prod Supabase)

Run in order:

1. `supabase/migrations/20260609120000_google_calendar_nudge_and_notification_timing.sql`
2. `supabase/migrations/20260609120100_find_nearby_users_notification_timing.sql`

### Part 1 — `profiles` (calendar nudge)

| Column | Type | Mobile writes |
|--------|------|---------------|
| `calendar_nudge_shown_count` | integer, default 0 | Increment on banner show (max 2) |
| `calendar_nudge_last_shown_at` | timestamptz | Set on banner show |

App-open count stays on device (`AsyncStorage`) — web does not read it.

### Part 2 — `notification_preferences` (timing)

| Column | Type | Default |
|--------|------|---------|
| `preferred_notification_times` | text[] | `['any_time']` |
| `event_planning_window` | text | `'any_time'` |
| `active_event_months` | integer[] | `[]` (year-round) |

Mobile upserts via existing `notification_preferences` flow — unchanged API surface.

---

## Web notification pipeline (implemented)

Event push dispatch (`send-event-notifications` edge fn + `scheduled_notifications` cron) now:

1. Joins timing fields from `find_nearby_users_for_event` RPC
2. Skips when `event_notifications_enabled = false` (existing)
3. **Active months:** if `active_event_months` non-empty, only notify when event month matches (user timezone)
4. **Planning window:** filters by days until event:
   - `last_minute` → within 7 days (else schedule for 7 days before)
   - `few_weeks` → 7–28 days (else schedule or skip)
   - `one_to_three_months` → 30–90 days (else schedule or skip)
   - `any_time` → no filter
5. **Preferred times:** defers to next `morning` / `afternoon` / `evening` window if not `any_time`; respects `start_hour` / `end_hour` / `timezone` as hard bounds
6. Deferred sends → `scheduled_notifications` with `notification_type = 'event_new'`, processed by existing Vercel cron

---

## Mobile smoke test checklist

- [ ] Migrations applied on prod
- [ ] Save `preferred_notification_times`, `event_planning_window`, `active_event_months` from Notification Preferences screen
- [ ] Update `calendar_nudge_shown_count` / `calendar_nudge_last_shown_at` on profiles
- [ ] Create test event → verify user with `evening`-only prefs does not get immediate push (check `scheduled_notifications`)
- [ ] User with `active_event_months = [6,7,8]` skipped for December events

---

## Deploy notes (web)

After migrations on prod:

1. Deploy updated `send-event-notifications` edge function to Supabase
2. Vercel already has `process-pending-notifications` cron — redeploy web for `event_new` payload fix

---

## Not in this pass

- Google Calendar FreeBusy gate on event notifications (separate track — see `WEB_TEAM_GOOGLE_CALENDAR_RESPONSE.MD`)
- Web UI for notification timing prefs (mobile-only for now)
