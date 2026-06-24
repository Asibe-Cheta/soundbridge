# Event Promotion Tracking — Web Handoff

Mobile implements tap tracking per `EVENT_PROMOTION_TRACKING.MD`. Web is **live** after migration `20260624120000_event_promotion_interactions.sql`.

## Part 1 — Feed parity (web)

| Surface | Status |
|---------|--------|
| `/feed` (`app/feed/page.tsx`) | **Full parity** — personalized events strip (≥3 events, every 8 posts) + `EventPostCard` for `post_type=event` |
| Mobile `FeedScreen.tsx` vs `TestFeedScreen.tsx` | **Mobile-owned** — verify on app; web does not gate Part 2/3 |

Web feed mechanics:
- `usePersonalizedFeedEvents` → `GET /api/events/feed-strip` (`get_personalized_events` RPC)
- `buildFeedListItems` inserts `EventsStrip` every 8 posts when `showStrip` (≥3 events)
- Event post cards render via `EventPostCard` / `EventPostBody`

## Part 2 — Tracking API (mobile + web)

**Table:** `event_promotion_interactions`

| Column | Type |
|--------|------|
| `event_id` | UUID → events |
| `user_id` | UUID → profiles |
| `source` | `notification` \| `feed_card` \| `direct_search` \| `shared_link` \| `other` |
| `viewed_at` | timestamptz |
| `purchased_ticket` | boolean |
| `purchased_at` | timestamptz nullable |

**Record interaction (authenticated):**

```
POST /api/events/promotion-interaction
Authorization: Bearer <supabase access token>
Content-Type: application/json

{ "event_id": "<uuid>", "source": "notification" | "feed_card" | "shared_link" | ... }
```

**Notification tap:** Mobile should call above with `source: "notification"` before navigate, OR open event URL with `?ref=notification` (web records via `/api/events/notification-open`).

**Feed card tap:** `source: "feed_card"` before navigate.

**Shared link:** Share URLs use `?ref=shared_link` — recorded on event page load.

**Ticket purchase:** Web links purchases in `POST /api/events/confirm-ticket-purchase` via `linkEventPromotionTicketPurchase`. Mobile updates `purchased_ticket` on the client after payment — requires `UPDATE` RLS on own rows (included in migration).

**Canonical migration:** `supabase/migrations/20260624120000_event_promotion_interactions.sql` (web-owned; do not ship parallel mobile migrations).

## Part 3 — Admin

**Page:** `/admin/event-promotion`  
**API:** `GET /api/admin/event-promotion?view=summary|events|creators&date_from=&date_to=&sort=&order=`

Notifications sent count uses `event_notifications` where `status IN (sent, delivered)`.

## Mobile checklist

- [ ] Call `POST /api/events/promotion-interaction` on notification tap (`notification`)
- [ ] Call on feed event card tap (`feed_card`)
- [ ] Confirm TestFeedScreen has same event strip/cards as FeedScreen (separate fix if not)
- [ ] After ticket purchase, ensure backend links interaction (use confirm-ticket-purchase API)
