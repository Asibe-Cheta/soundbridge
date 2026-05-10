# Mobile team — External events data provider (Songkick pending)

## Status

- **Songkick:** We submitted a **Partnership request** via Songkick support (API self-service is paused). They indicate responses can take up to **~30 working days**.
- **Backend (web):** The `external_events` table, **`claim_external_event`** RPC, **`POST /api/events/external/:id/claim`**, and extended **`get_personalized_events`** (with `is_external`, `ticket_url`, `artist_name`) are in place. The Supabase Edge Function **`sync-songkick-events`** is implemented for **Songkick’s API shape** and env secret **`SONGKICK_API_KEY`** once licensed.

## Shortlist (completed)

| Rank | Provider | Verdict |
|------|----------|---------|
| 🥇 | **Skiddle** | Best UK music fit — free key, geo-radius search, strong fields, images. **Action:** email partner team to confirm **commercial mobile caching** rights. |
| 🥈 | **Ticketmaster** | Largest catalogue, image/genre data, free key; **6h cache** reasonable per standard ToS; Partner agreement for scale. **Web can ship `sync-ticketmaster-events` now** (`source = 'ticketmaster'`). |
| 🥉 | **Bandsintown** | Permissive ToS; **artist-lookup only** — supplementary (e.g. creator touring), not main location browse feed. |

**Ruled out:** PredictHQ (no cache on free tier), Eventbrite (pricing/fields/links).

**Web handoff:** See **`WEB_TEAM_EXTERNAL_EVENTS_PROVIDER_SHORTLIST.md`** (field map stub, `event_external_id` namespacing, no schema change).

## Technical note (web ↔ mobile)

- Mobile uses **`getExternalEvents()`**, **`ExternalEventCard`**, **`ClaimEventModal`**, **`POST /api/events/external/:id/claim`** — unchanged if `external_events` rows keep the same shape.
- Additional providers = **extra Edge sync jobs** + **`source` discriminator** + stable **namespaced** `event_external_id`.

Songkick remains in **`sync-songkick-events`** pending partnership key; Ticketmaster can run **in parallel** once implemented.
