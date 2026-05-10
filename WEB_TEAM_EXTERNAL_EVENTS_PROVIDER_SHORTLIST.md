# Web team — External events provider shortlist (from mobile)

**No `external_events` schema changes required.** Use existing columns; discriminate rows with `source` (`'songkick' | 'ticketmaster' | …`).

## Shortlist (mobile verdict)

| Rank | Provider     | Verdict |
|------|--------------|---------|
| 🥇   | **Skiddle**  | Best UK music fit — free key, geo-radius search built-in, strong field coverage, images included. **Blocker:** email their partner team this week to confirm **commercial mobile caching** rights before relying on it in production. |
| 🥈   | **Ticketmaster** | Largest catalogue, strong image/genre data, free developer key. **6-hour cache** aligns with “reasonable periods” under standard ToS; a **formal Partner agreement** is still recommended at production scale. **Can be wired immediately** as a second sync. |
| 🥉   | **Bandsintown** | Most permissive ToS (caching + redistribution in apps called out). **Not** a general location browse feed — API is **artist-lookup**, not metro/radius discovery. Treat as a **supplementary** layer (e.g. SoundBridge creators / touring), not the main Discover external pipeline. |

## Ruled out (mobile)

- **PredictHQ** — caching prohibited on free tier; B2B/event-intel positioning.
- **Eventbrite** — pricing sales-gated, weaker artist fields, awkward outbound link rules for our UX.

## Implementation: Ticketmaster ✅ (in repo)

**Edge Function:** `supabase/functions/sync-ticketmaster-events/index.ts`

1. **Behaviour:** Discovery `GET /discovery/v2/events.json` per UK hub (London, Manchester, Birmingham, Leeds, Bristol, Reading) with **`latlong` + `radius=100` + `unit=km`**, **`classificationName=music`**, **`startDateTime` / `endDateTime`** (now → +90 days), **`sort=eventDate,date.asc`**, paginated (**`size=200`**, max **30 pages** per hub). Upserts into **`external_events`** with **`source = 'ticketmaster'`** and **`event_external_id = 'tm:' + id`**.
2. **Run alongside** `sync-songkick-events` (separate cron, e.g. every 6 hours). Shared cleanup: deletes all **past + unclaimed** `external_events` (any `source`); **`sync_logs`** row with `source: 'ticketmaster'`.
3. **Secret:** **`TICKETMASTER_API_KEY`** — set in Supabase **Edge Function secrets** (same project as `SUPABASE_URL` / service role).
4. **Deploy:** `supabase functions deploy sync-ticketmaster-events`
5. **Invoke (manual test):** `POST https://<ref>.functions.supabase.co/sync-ticketmaster-events` with `Authorization: Bearer <service-role-key>`.
6. **Genre mapping:** Same heuristic as Songkick sync (classifications segment/genre/subGenre → `event_category`-compatible strings).

### Suggested Discovery → `external_events` mapping (verify against live API docs)

| `external_events` column | Ticketmaster Discovery (typical) |
|--------------------------|----------------------------------|
| `event_external_id`      | `tm:` + event `id` |
| `source`                 | `'ticketmaster'` |
| `title`                  | Event `name` |
| `artist_name`            | Primary attraction / headliner name from `_embedded.attractions` or similar |
| `venue_name`             | `_embedded.venues[0].name` |
| `venue_address`          | Venue address line(s) if present |
| `city`                   | `_embedded.venues[0].city.name` |
| `country`                | Venue country code / name |
| `latitude` / `longitude` | `_embedded.venues[0].location.latitude/longitude` |
| `genre`                  | Mapped from classifications (segment / genre / subGenre) |
| `event_date`             | `dates.start.dateTime` (fallback `localDate` + timezone rules) |
| `ticket_url`             | Event `url` (Ticketmaster event page) |
| `image_url`              | Best available `images[]` URL |

Adjust field paths to the **exact** Discovery API version you integrate.

## Skiddle (next, after partner confirmation)

- Add **`sync-skiddle-events`** (or equivalent) once **caching / mobile app use** is confirmed in writing.
- Keep **`source = 'skiddle'`** and namespaced `event_external_id` (e.g. `skiddle:${id}`).

## Bandsintown (optional later)

- Separate use case (creator-linked / artist ID driven), not the default metro calendar sync.

## Mobile / product

- No app schema changes; cards and claim flow stay the same if rows match `external_events`.
