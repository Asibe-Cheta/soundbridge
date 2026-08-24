# Web Team: Two New Campaign Push Notifications

Mobile side is live in production (OTA, both platforms). This is the spec for sending the
actual pushes — same pattern as the IG Live campaign (`WEB_TEAM_IG_LIVE_CAMPAIGN.MD`), but
simpler: these are one-off sends, not a 14-day schedule.

## What's already live on mobile

Two new in-app screens, reachable the same way the IG Live one is — via `type: 'campaign'` +
a `campaignId` in the push payload:

| campaignId | Screen | What it's about |
|---|---|---|
| `video-content-teaser` | Coming-soon teaser for video content on creator profiles (Portfolio tab, 3 videos/profile, 1 min each to start, real-time tipping) |
| `earning-reminder` | Reminder to use the Tip Room and Digital Card, with buttons that deep-link straight into both real, existing flows |

## Payload contract (identical shape to the IG Live campaign)

```json
{
  "type": "campaign",
  "campaignId": "video-content-teaser",
  "deepLink": "soundbridge://campaigns/video-content-teaser",
  "url": "soundbridge://campaigns/video-content-teaser"
}
```

```json
{
  "type": "campaign",
  "campaignId": "earning-reminder",
  "deepLink": "soundbridge://campaigns/earning-reminder",
  "url": "soundbridge://campaigns/earning-reminder"
}
```

Send via the same Expo push mechanism as `send-event-notifications` — `profiles.expo_push_token`
for the recipient list, chunks of 100, `https://exp.host/--/api/v2/push/send`.

## Suggested push copy

**Video content teaser**
- Title: `Video content soon available`
- Body: `Imagine getting tipped right on the spot for your video content. Look out for it.`

**Earning reminder**
- Title: `People already earning. Don't sleep on it.`
- Body: `Have you used the Tip Room yet? Tap to see how it — and your Digital Card — can get you paid.`

Feel free to adjust wording on your end; the in-app screen content is the authoritative
detailed copy either way, the push itself just needs to earn the tap.

## Open items for you to decide

- **Timing/order**: no schedule was specified for either of these — they're one-off sends,
  not a recurring campaign. Pick send dates/times (and whether one goes before the other).
- **Test first**: same advice as the IG Live campaign — send a single test push to one known
  `expo_push_token` before broadcasting to everyone, so a tap can be verified end-to-end.
- **Audience**: assuming both go to all users with a non-null `expo_push_token`, same as the
  IG Live campaign. Flag if either should be creator-only (the earning-reminder content is
  creator-facing — Tip Room and Digital Card are both creator features — so listener accounts
  tapping through will land on the same screen but the CTAs won't apply to them; worth
  considering scoping this one to creator profiles only).
