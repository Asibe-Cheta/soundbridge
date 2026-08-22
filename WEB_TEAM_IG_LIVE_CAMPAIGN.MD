# Web Team: IG Live Promo — Scheduled Push Campaign (Aug 22 – Sep 4, 2026)

Mobile side is done (deep link screen + notification routing). This doc is the spec for the
server-side piece: firing one push notification per day, for 14 days, to all active users.

## What exists already that this reuses

- `supabase/functions/send-event-notifications/` — the existing pattern for a Supabase edge
  function that builds Expo push messages and sends them via `sendPushNotifications()`
  (`_lib/expo.ts`, chunks of 100, `https://exp.host/--/api/v2/push/send`).
- `profiles.expo_push_token` — where device push tokens live. "Active users" = any profile
  row with a non-null `expo_push_token`.
- Vercel cron (`CRON_JOB_SETUP.md`) — `vercel.json` `crons` array hitting an API route on a
  schedule, e.g. `"schedule": "0 9 * * *"` for once daily at 09:00 UTC.
- `notifications` table — this is a per-user **inbox**, populated reactively when a push
  lands (see `WEB_TEAM_NOTIFICATIONS_TABLE_MIGRATION.md`). It is not a scheduling table and
  doesn't need to change for this.

## Recommended approach: no new table needed

Since the 14 messages and dates are fixed and known up front, hardcode them in the edge
function rather than building general-purpose campaign-scheduling infra:

```ts
// supabase/functions/send-campaign-notifications/index.ts
const CAMPAIGN_ID = 'ig-live-sept4';
const SCHEDULE: { date: string; title: string; body: string }[] = [
  { date: '2026-08-22', title: "It's happening", body: '🎙️ Big one coming. Sept 4, we\'re going live on Instagram to show you how creators get discovered & paid. Free. No catch.' },
  { date: '2026-08-23', title: 'Sound familiar?', body: 'Millions of streams. Barely any money. Sound familiar? We\'re fixing that Sept 4 — live on IG.' },
  // ... remaining 12 entries, copy verbatim from INSTA_LIVE.MD
];
```

Trigger it with a **daily** Vercel cron (once at a fixed hour, e.g. 9am local audience time):

```json
{
  "crons": [
    { "path": "/api/cron/send-campaign-notifications", "schedule": "0 9 * * *" }
  ]
}
```

The route/edge function each day:
1. Finds today's entry in `SCHEDULE` by matching `date` against the current UTC date. If no
   match (i.e. any day outside Aug 22 – Sep 4), no-op and return 200.
2. Queries `profiles` for all rows with a non-null `expo_push_token`.
3. Builds one Expo push message per user:
   ```ts
   {
     to: user.expo_push_token,
     sound: 'default',
     title: entry.title,
     body: entry.body,
     data: {
       type: 'campaign',
       campaignId: CAMPAIGN_ID,
       deepLink: 'soundbridge://campaigns/ig-live-sept4',
       url: 'soundbridge://campaigns/ig-live-sept4',
     },
   }
   ```
   The mobile app already routes `type: 'campaign'` + `campaignId: 'ig-live-sept4'` to the new
   in-app screen (`DeepLinkingService.ts`, `CAMPAIGN_SCREENS` map) — no other `data` fields
   are required.
4. Sends via `sendPushNotifications()` in chunks of 100, same as `send-event-notifications`.

## Idempotency (important)

Unlike `send-event-notifications` (triggered once per event by a DB webhook),  this cron will
be invoked on a recurring schedule and must not double-send if Vercel retries or if the cron
fires more than once on the same UTC day. Guard it with a one-row-per-day log, e.g.:

```sql
create table campaign_notification_sends (
  campaign_id text not null,
  send_date date not null,
  sent_at timestamptz not null default now(),
  primary key (campaign_id, send_date)
);
```

Before sending, attempt an insert for `(CAMPAIGN_ID, today)`; if it violates the primary key,
today's batch already went out — skip and return 200. This is the only new table this needs.

## Things to decide on your end

- **Send time**: doc doesn't specify a time of day for the daily pushes — pick one (9am UTC
  suggested) and keep it consistent across all 14 days.
- **Quiet hours / daily quota**: `send-event-notifications` respects `isWithinTimeWindow()` and
  a per-user daily notification cap (`check_notification_quota` RPC). Decide whether this
  promo should also respect those, or bypass them since it's a fixed 14-day campaign the user
  can't opt out of per-notification-type.
- **No RSVP flow**: confirmed not needed — this is push + static in-app screen only, per the
  original spec.

## What's already live on mobile (no action needed here)

- Screen: `src/screens/CampaignIGLiveScreen.tsx`, registered as `CampaignIGLive` in `App.tsx`.
- Deep link: `soundbridge://campaigns/ig-live-sept4` and
  `https://soundbridge.live/campaigns/ig-live-sept4` both route to the screen
  (`DeepLinkingService.ts`).
- Notification tap routing: `type: 'campaign'` + `campaignId: 'ig-live-sept4'` in the push
  `data` payload routes to the same screen (`DeepLinkingService.handleNotificationDeepLink`).
- On-screen content matches the spec exactly (header, title, date/time, body, "Watch on
  Instagram" → `instagram.com/soundbridge_live`, "Add to Calendar" → opens a prefilled Google
  Calendar event page — see note below).

**Note on "Add to Calendar"**: the brief said to use "our existing Google Calendar sync
feature," but that feature (`CalendarIntegrationService.ts`) is read-only FreeBusy access for
availability matching — it has no ability to write events. The button instead opens a
prefilled `calendar.google.com/calendar/render` link, which works without any new native
dependency or backend change. Flagging in case you want a different approach.
