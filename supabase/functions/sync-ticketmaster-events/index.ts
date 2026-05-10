/**
 * Scheduled sync: Ticketmaster Discovery API → public.external_events
 * Env: TICKETMASTER_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Rows use source = 'ticketmaster' and event_external_id = 'tm:' + Discovery event id
 * (avoids collisions with Songkick numeric ids).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DISCOVERY_BASE = 'https://app.ticketmaster.com/discovery/v2'

/** UK hubs — lat/long + radius (km) aligned with Songkick metro coverage. */
const UK_HUBS = [
  { label: 'London', lat: 51.5074, lng: -0.1278 },
  { label: 'Manchester', lat: 53.4808, lng: -2.2426 },
  { label: 'Birmingham', lat: 52.4862, lng: -1.8904 },
  { label: 'Leeds', lat: 53.8008, lng: -1.5491 },
  { label: 'Bristol', lat: 51.4545, lng: -2.5879 },
  { label: 'Reading', lat: 51.4543, lng: -0.9781 },
] as const

const RADIUS_KM = '100'
const PAGE_SIZE = 200
/** Cap pages per hub so one run cannot explode on broad queries. */
const MAX_PAGES_PER_HUB = 30
const MAX_RETRIES = 2

type TmImage = { ratio?: string; url?: string; width?: number; height?: number; fallback?: boolean }

type TmClassification = {
  primary?: boolean
  segment?: { name?: string }
  genre?: { name?: string }
  subGenre?: { name?: string }
}

type TmVenue = {
  name?: string
  city?: { name?: string }
  country?: { name?: string; countryCode?: string }
  address?: { line1?: string; line2?: string }
  location?: { latitude?: string; longitude?: string }
}

type TmAttraction = { name?: string }

type TmEvent = {
  id?: string
  name?: string
  url?: string
  images?: TmImage[]
  dates?: {
    timezone?: string
    start?: {
      dateTime?: string
      localDate?: string
      localTime?: string
      dateTBA?: boolean
      dateTBD?: boolean
    }
  }
  classifications?: TmClassification[]
  _embedded?: {
    venues?: TmVenue[]
    attractions?: TmAttraction[]
  }
}

type TmEventsResponse = {
  _embedded?: { events?: TmEvent[] }
  page?: { size?: number; totalElements?: number; totalPages?: number; number?: number }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mapGenreLabel(flat: string): string {
  const g = flat.toLowerCase()
  if (!g.trim()) return 'Other'

  if (/\b(gospel|christian|worship)\b/.test(g)) return 'Gospel'
  if (/\b(jazz|blues|swing|bebop)\b/.test(g)) return 'Jazz'
  if (/\b(comedy|stand[- ]?up)\b/.test(g)) return 'Other'
  if (/\b(classical|opera|orchestra)\b/.test(g)) return 'Classical'
  if (/\bfestival\b/.test(g)) return 'Other'
  if (/\bkaraoke\b/.test(g)) return 'Other'
  if (/\b(carnival|parade)\b/.test(g)) return 'Carnival'
  if (/\b(workshop|masterclass|clinic)\b/.test(g)) return 'Other'
  if (/\b(conference|seminar|talk)\b/.test(g)) return 'Conference'
  if (/\b(hip[- ]?hop|rap)\b/.test(g)) return 'Hip-Hop'
  if (/\bafrobeat/.test(g)) return 'Afrobeat'
  if (/\brock\b/.test(g)) return 'Rock'
  if (/\b(pop|indie pop)\b/.test(g)) return 'Pop'
  if (/\b(r&b|soul|neo[- ]?soul)\b/.test(g)) return 'Secular'
  if (/\b(electronic|edm|techno|house|dnb)\b/.test(g)) return 'Secular'
  if (/\b(country|folk|world)\b/.test(g)) return 'Other'
  if (/\b(secular)\b/.test(g)) return 'Secular'

  return 'Other'
}

function classificationFlat(ev: TmEvent): string {
  const list = ev.classifications ?? []
  const primary = list.find((c) => c.primary) ?? list[0]
  return [primary?.segment?.name, primary?.genre?.name, primary?.subGenre?.name]
    .filter(Boolean)
    .join(' ')
}

function bestImageUrl(images: TmImage[] | undefined): string | null {
  if (!images?.length) return null
  const candidates = images.filter((i) => i.url && !i.fallback)
  if (!candidates.length) return images[0]?.url ?? null
  const by16 = candidates.filter((i) => i.ratio === '16_9')
  const pool = by16.length ? by16 : candidates
  const sorted = [...pool].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
  return sorted[0]?.url ?? null
}

function eventStartIso(ev: TmEvent): string | null {
  const dt = ev.dates?.start?.dateTime
  if (dt) return dt
  const ld = ev.dates?.start?.localDate
  const lt = ev.dates?.start?.localTime
  if (ld && lt) return `${ld}T${lt}:00Z`
  if (ld) return `${ld}T12:00:00.000Z`
  return null
}

function headlinerName(ev: TmEvent): string {
  const attrs = ev._embedded?.attractions
  if (attrs?.length) return attrs[0]?.name ?? 'Unknown Artist'
  return ev.name ?? 'Unknown Artist'
}

function venueAddressLines(v: TmVenue | undefined): string | null {
  if (!v?.address) return null
  const parts = [v.address.line1, v.address.line2].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

type FetchMode = 'geo-music' | 'geo-broad' | 'city-broad'

async function fetchEventsPage(args: {
  apiKey: string
  lat?: number
  lng?: number
  city?: string
  startIso: string
  endIso: string
  page: number
  mode: FetchMode
}): Promise<TmEventsResponse> {
  const { apiKey, lat, lng, city, startIso, endIso, page, mode } = args
  const url = new URL(`${DISCOVERY_BASE}/events.json`)
  url.searchParams.set('apikey', apiKey)
  if (typeof lat === 'number' && typeof lng === 'number') {
    url.searchParams.set('latlong', `${lat},${lng}`)
    url.searchParams.set('radius', RADIUS_KM)
    url.searchParams.set('unit', 'km')
  }
  if (city) url.searchParams.set('city', city)
  if (mode === 'geo-music') url.searchParams.set('classificationName', 'music')
  url.searchParams.set('startDateTime', startIso)
  url.searchParams.set('endDateTime', endIso)
  url.searchParams.set('size', String(PAGE_SIZE))
  url.searchParams.set('page', String(page))
  // Ticketmaster Discovery supports date,asc/date,desc (not eventDate,date.asc).
  url.searchParams.set('sort', 'date,asc')
  // UK coverage via lat/long + radius; omit countryCode (Discovery docs focus on US/CA enums).

  const requestUrl = url.toString()
  let lastStatus = 0
  let lastBody = ''
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(requestUrl)
    if (res.ok) {
      const json = (await res.json()) as TmEventsResponse
      if (page === 0) {
        const pageMeta = json.page ?? {}
        const rawEvents = json._embedded?.events?.length ?? 0
        console.log(
          `[sync-ticketmaster-events] raw ${mode}`,
          JSON.stringify({
            city,
            lat,
            lng,
            requestUrl,
            rawEvents,
            totalElements: pageMeta.totalElements,
            totalPages: pageMeta.totalPages,
          })
        )
      }
      return json
    }

    lastStatus = res.status
    lastBody = await res.text().catch(() => '')
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const delayMs = 500 * (attempt + 1)
      console.warn(`[sync-ticketmaster-events] 429 retry ${attempt + 1} in ${delayMs}ms`)
      await sleep(delayMs)
      continue
    }
    break
  }

  throw new Error(
    `Ticketmaster ${mode} page ${page}: ${lastStatus} ${lastBody.slice(0, 300)}`
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const apiKey = Deno.env.get('TICKETMASTER_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!apiKey || !supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: 'Missing TICKETMASTER_API_KEY or Supabase env' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + 90)
  const startIso = now.toISOString().replace(/\.\d{3}Z$/, 'Z')
  const endIso = end.toISOString().replace(/\.\d{3}Z$/, 'Z')

  const seen = new Set<string>()
  const rows: Record<string, unknown>[] = []
  const diagnostics: Array<{
    hub: string
    mode: FetchMode
    page: number
    rawEvents: number
    mappedEvents: number
    error?: string
  }> = []

  for (const hub of UK_HUBS) {
    let totalPages = MAX_PAGES_PER_HUB
    try {
      let mode: FetchMode = 'geo-music'
      let page = 0
      let attemptedFallbackGeo = false
      let attemptedFallbackCity = false

      while (page < totalPages && page < MAX_PAGES_PER_HUB) {
        const mappedBefore = rows.length
        const body = await fetchEventsPage({
          apiKey,
          lat: hub.lat,
          lng: hub.lng,
          city: mode === 'city-broad' ? hub.label : undefined,
          startIso,
          endIso,
          page,
          mode,
        })
        const reportedTotal = body.page?.totalPages
        if (typeof reportedTotal === 'number' && reportedTotal >= 0) {
          totalPages = Math.min(Math.max(reportedTotal, 1), MAX_PAGES_PER_HUB)
        }

        const events = body._embedded?.events ?? []
        diagnostics.push({
          hub: hub.label,
          mode,
          page,
          rawEvents: events.length,
          mappedEvents: 0,
        })
        if (events.length === 0) {
          if (mode === 'geo-music' && !attemptedFallbackGeo) {
            // First broadening step: remove the music filter.
            mode = 'geo-broad'
            page = 0
            totalPages = MAX_PAGES_PER_HUB
            attemptedFallbackGeo = true
            continue
          }
          if (mode !== 'city-broad' && !attemptedFallbackCity) {
            // Second fallback: city text search (Ticketmaster can be stricter on geo in some markets).
            mode = 'city-broad'
            page = 0
            totalPages = MAX_PAGES_PER_HUB
            attemptedFallbackCity = true
            continue
          }
          break
        }

        for (const ev of events) {
          const rawId = ev.id
          if (!rawId) continue
          const extKey = `tm:${rawId}`
          if (seen.has(extKey)) continue
          seen.add(extKey)

          const eventDate = eventStartIso(ev)
          if (!eventDate) continue
          if (ev.dates?.start?.dateTBA || ev.dates?.start?.dateTBD) continue

          const venue = ev._embedded?.venues?.[0]
          const city = venue?.city?.name ?? ''
          const country = venue?.country?.countryCode ?? venue?.country?.name ?? 'GB'
          const latStr = venue?.location?.latitude
          const lngStr = venue?.location?.longitude
          const latitude = latStr != null && latStr !== '' ? Number(latStr) : null
          const longitude = lngStr != null && lngStr !== '' ? Number(lngStr) : null

          const genre = mapGenreLabel(classificationFlat(ev))

          rows.push({
            event_external_id: extKey,
            source: 'ticketmaster',
            title: ev.name ?? 'Event',
            artist_name: headlinerName(ev),
            venue_name: venue?.name ?? 'TBC',
            venue_address: venueAddressLines(venue),
            city,
            country: country.length === 2 ? country : 'GB',
            latitude: Number.isFinite(latitude) ? latitude : null,
            longitude: Number.isFinite(longitude) ? longitude : null,
            genre,
            event_date: eventDate,
            ticket_url: ev.url ?? null,
            image_url: bestImageUrl(ev.images),
            updated_at: new Date().toISOString(),
          })
        }

        diagnostics[diagnostics.length - 1].mappedEvents = rows.length - mappedBefore
        if (events.length < PAGE_SIZE) break
        page += 1
      }
    } catch (e) {
      diagnostics.push({
        hub: hub.label,
        mode: 'geo-music',
        page: 0,
        rawEvents: 0,
        mappedEvents: 0,
        error: e instanceof Error ? e.message : 'unknown error',
      })
      console.error(`[sync-ticketmaster-events] hub ${hub.label}`, e)
    }
  }

  let upserted = 0
  const chunk = 80
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk)
    const { error } = await supabase.from('external_events').upsert(part, {
      onConflict: 'event_external_id',
    })
    if (error) {
      console.error('[sync-ticketmaster-events] upsert chunk', i, error)
    } else {
      upserted += part.length
    }
  }

  const { data: removed, error: delErr } = await supabase
    .from('external_events')
    .delete()
    .lt('event_date', new Date().toISOString())
    .eq('is_claimed', false)
    .select('id')

  if (delErr) {
    console.error('[sync-ticketmaster-events] cleanup delete', delErr)
  }

  const removedCount = removed?.length ?? 0

  await supabase.from('sync_logs').insert({
    source: 'ticketmaster',
    events_added: upserted,
    events_removed: removedCount,
  })

  return new Response(
    JSON.stringify({
      ok: true,
      hubs: UK_HUBS.length,
      unique_events: rows.length,
      upserted,
      removed_past_unclaimed: removedCount,
      diagnostics: diagnostics.slice(0, 30),
    }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } }
  )
})
