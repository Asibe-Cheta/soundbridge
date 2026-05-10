/**
 * Scheduled sync: Songkick metro calendars → public.external_events
 * Env: SONGKICK_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const METRO_IDS_STATIC = [
  { label: 'London', id: 24426 },
  { label: 'Manchester', id: 28714 },
  { label: 'Birmingham', id: 24542 },
  { label: 'Leeds', id: 24485 },
  { label: 'Bristol', id: 24521 },
] as const

type SongkickArtist = {
  displayName?: string
  genre?: { displayName?: string }
}

type SongkickPerformance = {
  billing?: string
  billingIndex?: number
  artist?: SongkickArtist
}

type SongkickEvent = {
  id?: number
  displayName?: string
  type?: string
  uri?: string
  venue?: {
    displayName?: string
    street?: string
    lat?: number
    lng?: number
  }
  location?: { city?: string }
  start?: { datetime?: string; date?: string; time?: string }
  performance?: SongkickPerformance[]
}

type ResultsPage = {
  resultsPage?: {
    page?: number
    perPage?: number
    totalEntries?: number
    results?: { event?: SongkickEvent[] }
  }
}

function normalizeGenreTokens(perf: SongkickPerformance[] | undefined): string[] {
  if (!perf?.length) return []
  const sorted = [...perf].sort(
    (a, b) => (a.billingIndex ?? 0) - (b.billingIndex ?? 0)
  )
  const head = sorted[0]?.artist
  const g = head?.genre?.displayName
  if (g) return [g]
  return []
}

/** Map Songkick / loose labels → public.event_category labels (Postgres enum). */
function mapSongkickGenre(genreTokens: string[]): string {
  const flat = genreTokens.join(' ').toLowerCase()
  if (!flat.trim()) return 'Other'

  if (/\b(gospel|christian|worship)\b/.test(flat)) return 'Gospel'
  if (/\b(jazz|blues|swing|bebop)\b/.test(flat)) return 'Jazz'
  if (/\b(comedy|stand[- ]?up)\b/.test(flat)) return 'Other'
  if (/\b(classical|opera|orchestra)\b/.test(flat)) return 'Classical'
  if (/\bfestival\b/.test(flat)) return 'Other'
  if (/\bkaraoke\b/.test(flat)) return 'Other'
  if (/\b(carnival|parade)\b/.test(flat)) return 'Carnival'
  if (/\b(workshop|masterclass|clinic)\b/.test(flat)) return 'Other'
  if (/\b(conference|seminar|talk)\b/.test(flat)) return 'Conference'
  if (/\b(hip[- ]?hop|rap)\b/.test(flat)) return 'Hip-Hop'
  if (/\bafrobeat/.test(flat)) return 'Afrobeat'
  if (/\brock\b/.test(flat)) return 'Rock'
  if (/\b(pop|indie pop)\b/.test(flat)) return 'Pop'
  if (/\b(r&b|soul|neo[- ]?soul)\b/.test(flat)) return 'Secular'
  if (/\belectronic\b/.test(flat)) return 'Secular'
  if (/\b(secular)\b/.test(flat)) return 'Secular'

  return 'Other'
}

function eventIsoDate(sk: SongkickEvent): string | null {
  if (sk.start?.datetime) return sk.start.datetime
  if (sk.start?.date) return `${sk.start.date}T12:00:00.000Z`
  return null
}

function headlinerName(sk: SongkickEvent): string {
  const perf = sk.performance
  if (!perf?.length) return 'Unknown Artist'
  const sorted = [...perf].sort((a, b) => (a.billingIndex ?? 0) - (b.billingIndex ?? 0))
  return sorted[0]?.artist?.displayName ?? 'Unknown Artist'
}

async function fetchReadingMetroId(apiKey: string): Promise<number | null> {
  const url =
    `https://api.songkick.com/api/3.0/search/locations.json?query=${encodeURIComponent('Reading UK')}&apikey=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) {
    console.warn('[sync-songkick-events] Reading location search failed', res.status)
    return null
  }
  const body = (await res.json()) as {
    resultsPage?: { results?: { location?: { metroArea?: { id?: number } }[] } }
  }
  const loc = body.resultsPage?.results?.location?.[0]
  const id = loc?.metroArea?.id
  return typeof id === 'number' ? id : null
}

async function fetchMetroPage(
  apiKey: string,
  metroId: number,
  minDate: string,
  maxDate: string,
  page: number
): Promise<ResultsPage> {
  const url = new URL(`https://api.songkick.com/api/3.0/metro_areas/${metroId}/calendar.json`)
  url.searchParams.set('apikey', apiKey)
  url.searchParams.set('min_date', minDate)
  url.searchParams.set('max_date', maxDate)
  url.searchParams.set('per_page', '50')
  url.searchParams.set('page', String(page))

  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Songkick ${metroId} page ${page}: ${res.status} ${text.slice(0, 200)}`)
  }
  return (await res.json()) as ResultsPage
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const apiKey = Deno.env.get('SONGKICK_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!apiKey || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Missing SONGKICK_API_KEY or Supabase env' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const today = new Date()
  const max = new Date(today)
  max.setDate(max.getDate() + 90)
  const minDate = today.toISOString().slice(0, 10)
  const maxDate = max.toISOString().slice(0, 10)

  const metros: { label: string; id: number }[] = [...METRO_IDS_STATIC]
  const readingId = await fetchReadingMetroId(apiKey)
  if (readingId != null) metros.push({ label: 'Reading', id: readingId })

  const seen = new Set<string>()
  const rows: Record<string, unknown>[] = []

  for (const metro of metros) {
    let page = 1
    let totalPages = 1
    try {
      while (page <= totalPages) {
        const json = await fetchMetroPage(apiKey, metro.id, minDate, maxDate, page)
        const rp = json.resultsPage
        const events = rp?.results?.event ?? []
        const total = rp?.totalEntries ?? 0
        const perPage = rp?.perPage ?? 50
        totalPages = Math.max(1, Math.ceil(total / perPage))

        for (const ev of events) {
          const extId = ev.id != null ? String(ev.id) : null
          if (!extId || seen.has(extId)) continue
          seen.add(extId)

          const eventDate = eventIsoDate(ev)
          if (!eventDate) continue

          const tokens = normalizeGenreTokens(ev.performance)
          const genre = mapSongkickGenre(tokens)
          const city = ev.location?.city ?? ''
          const country = 'GB'

          rows.push({
            event_external_id: extId,
            source: 'songkick',
            title: ev.displayName ?? 'Event',
            artist_name: headlinerName(ev),
            venue_name: ev.venue?.displayName ?? 'TBC',
            venue_address: ev.venue?.street ?? null,
            city,
            country,
            latitude: ev.venue?.lat ?? null,
            longitude: ev.venue?.lng ?? null,
            genre,
            event_date: eventDate,
            ticket_url: ev.uri ?? null,
            image_url: null,
            updated_at: new Date().toISOString(),
          })
        }
        page += 1
        if (events.length === 0) break
      }
    } catch (e) {
      console.error(`[sync-songkick-events] metro ${metro.label} (${metro.id})`, e)
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
      console.error('[sync-songkick-events] upsert chunk', i, error)
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
    console.error('[sync-songkick-events] cleanup delete', delErr)
  }

  const removedCount = removed?.length ?? 0

  await supabase.from('sync_logs').insert({
    source: 'songkick',
    events_added: upserted,
    events_removed: removedCount,
  })

  return new Response(
    JSON.stringify({
      ok: true,
      metros: metros.length,
      unique_events: rows.length,
      upserted,
      removed_past_unclaimed: removedCount,
    }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } }
  )
})
