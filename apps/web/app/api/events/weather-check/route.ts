import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

/**
 * Post-entry weather/transport check for event creation — WEATHER_IN_EVENTS.MD.
 * Mirrors the mobile app's EventEnvironmentService exactly (same thresholds, same three
 * data sources, same UK-only gate) so organisers see consistent guidance on either
 * platform. Server-side here (unlike mobile's direct client calls) so the OpenWeatherMap/
 * TomTom keys never reach the browser — this is a public creation form, not an
 * authenticated app bundle.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

type WeatherForecast = {
  available: boolean;
  reason?: 'too_far_out' | 'not_configured' | 'error';
  tempC?: number;
  condition?: string;
  daysOut?: number;
  pop?: number;
};

type RoadDisruptions = {
  available: boolean;
  reason?: 'not_configured' | 'error';
  incidents: string[];
};

type RailDisruptions = {
  available: boolean;
  reason?: 'outside_coverage' | 'no_nearby_station' | 'not_configured' | 'error';
  stationName?: string;
  messages: string[];
};

const CACHE_TABLE = 'event_environment_cache';

/** Refresh cadence tightens as the event approaches — matches mobile's cacheTtlMs. */
function cacheTtlMs(daysUntilEvent: number): number {
  if (daysUntilEvent <= 2) return 6 * 60 * 60 * 1000;
  if (daysUntilEvent <= 7) return 12 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

function cacheKeyFor(lat: number, lng: number, dateISO: string): string {
  // Rounded to ~1km so nearby organisers checking the same venue/date share a cache entry.
  const day = dateISO.slice(0, 10);
  return `${lat.toFixed(2)},${lng.toFixed(2)},${day}`;
}

async function fetchWeather(lat: number, lng: number, eventDateISO: string): Promise<WeatherForecast> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return { available: false, reason: 'not_configured' };

  const eventDate = new Date(eventDateISO);
  const daysOut = Math.ceil((eventDate.getTime() - Date.now()) / 86400000);
  if (daysOut < 0 || daysOut > 8) return { available: false, reason: 'too_far_out', daysOut };

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    exclude: 'current,minutely,hourly,alerts',
    units: 'metric',
    appid: apiKey,
  });
  const res = await fetch(`https://api.openweathermap.org/data/3.0/onecall?${params}`);
  if (!res.ok) return { available: false, reason: 'error' };
  const json = await res.json();
  const daily: any[] = json?.daily ?? [];
  if (daily.length === 0) return { available: false, reason: 'error' };

  const targetDaySeconds = Math.floor(
    new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()).getTime() / 1000,
  );
  let closest = daily[0];
  let closestDiff = Math.abs(closest.dt - targetDaySeconds);
  for (const d of daily) {
    const diff = Math.abs(d.dt - targetDaySeconds);
    if (diff < closestDiff) {
      closest = d;
      closestDiff = diff;
    }
  }
  if (closestDiff > 1.5 * 86400) return { available: false, reason: 'too_far_out', daysOut };

  return {
    available: true,
    tempC: Math.round(closest.temp?.day ?? closest.temp),
    condition: closest.weather?.[0]?.description ?? undefined,
    daysOut,
    pop: typeof closest.pop === 'number' ? closest.pop : undefined,
  };
}

async function fetchRoad(lat: number, lng: number): Promise<RoadDisruptions> {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) return { available: false, reason: 'not_configured', incidents: [] };

  const delta = 0.05; // ~5km at UK latitudes, matches mobile
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const params = new URLSearchParams({
    key: apiKey,
    bbox,
    language: 'en-GB',
    fields: '{incidents{type,properties{iconCategory,events{description}}}}',
  });
  const res = await fetch(`https://api.tomtom.com/traffic/services/5/incidentDetails?${params}`);
  if (!res.ok) return { available: false, reason: 'error', incidents: [] };
  const json = await res.json();
  const incidents: string[] = (json?.incidents ?? [])
    .map((i: any) => i?.properties?.events?.[0]?.description)
    .filter(Boolean)
    .slice(0, 5);
  return { available: true, incidents };
}

async function fetchRail(lat: number, lng: number, country: string | null): Promise<RailDisruptions> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.functions.invoke('event-disruptions', {
    body: { lat, lng, country },
  });
  if (error || !data) return { available: false, reason: 'error', messages: [] };
  if (!data.available) return { available: false, reason: data.reason, messages: [] };
  return { available: true, stationName: data.stationName, messages: data.messages ?? [] };
}

async function readCache(key: string): Promise<{ data: any; fetchedAt: string } | null> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase.from(CACHE_TABLE).select('data, fetched_at').eq('cache_key', key).maybeSingle();
    if (!data) return null;
    return { data: data.data, fetchedAt: data.fetched_at };
  } catch {
    return null;
  }
}

async function writeCache(key: string, data: any): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase
      .from(CACHE_TABLE)
      .upsert({ cache_key: key, data, fetched_at: new Date().toISOString() }, { onConflict: 'cache_key' });
  } catch {
    // Non-fatal — just means next request re-fetches.
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng, country, eventDateISO } = body as {
      lat?: number;
      lng?: number;
      country?: string;
      eventDateISO?: string;
    };

    // UK-only per existing rail coverage limits — same gate as mobile.
    if (country !== 'GB' || typeof lat !== 'number' || typeof lng !== 'number' || !eventDateISO) {
      return NextResponse.json({ available: false, reason: 'unsupported' }, { headers: corsHeaders });
    }

    const daysUntilEvent = Math.ceil((new Date(eventDateISO).getTime() - Date.now()) / 86400000);
    const key = cacheKeyFor(lat, lng, eventDateISO);
    const cached = await readCache(key);
    if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < cacheTtlMs(daysUntilEvent)) {
      return NextResponse.json(cached.data, { headers: corsHeaders });
    }

    const offsets = [-3, -2, -1, 1, 2, 3];
    const base = new Date(eventDateISO);

    const [weather, road, rail, ...altWeather] = await Promise.all([
      fetchWeather(lat, lng, eventDateISO).catch((): WeatherForecast => ({ available: false, reason: 'error' })),
      fetchRoad(lat, lng).catch((): RoadDisruptions => ({ available: false, reason: 'error', incidents: [] })),
      fetchRail(lat, lng, country).catch((): RailDisruptions => ({ available: false, reason: 'error', messages: [] })),
      ...offsets.map((offset) => {
        const altISO = new Date(base.getTime() + offset * 86400000).toISOString();
        return fetchWeather(lat, lng, altISO)
          .catch((): WeatherForecast => ({ available: false, reason: 'error' }))
          .then((w) => ({ dateISO: altISO, weather: w }));
      }),
    ]);

    const result = {
      available: true,
      current: { weather, road, rail },
      alternatives: altWeather,
      fetchedAt: new Date().toISOString(),
    };

    await writeCache(key, result);

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error: any) {
    console.error('[weather-check] error:', error);
    return NextResponse.json({ available: false, reason: 'error' }, { status: 500, headers: corsHeaders });
  }
}
