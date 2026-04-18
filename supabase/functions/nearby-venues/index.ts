/**
 * Supabase Edge Function: nearby-venues
 * Proxies Google Places Nearby Search so GOOGLE_PLACES_API_KEY never ships to mobile.
 * Expects POST JSON: { lat: number, lng: number, radius?: number } (radius in meters, default 2000, max 50000)
 * Two Nearby Search passes: night_club + bar (bars/clubs/studio-adjacent); results merged and deduped by place_id.
 */

const PLACES_NEARBY_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

type NearbyBody = {
  lat?: number;
  lng?: number;
  radius?: number;
};

type GooglePlaceResult = {
  place_id?: string;
  name?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function mapVenue(r: GooglePlaceResult) {
  const loc = r.geometry?.location;
  return {
    place_id: r.place_id ?? '',
    name: r.name ?? '',
    lat: loc?.lat ?? 0,
    lng: loc?.lng ?? 0,
    vicinity: r.vicinity ?? null,
    rating: r.rating ?? null,
    user_ratings_total: r.user_ratings_total ?? null,
    types: r.types ?? [],
  };
}

async function fetchNearby(
  key: string,
  lat: number,
  lng: number,
  radius: number,
  params: Record<string, string>
): Promise<GooglePlaceResult[]> {
  const search = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: String(radius),
    key,
    ...params,
  });
  const url = `${PLACES_NEARBY_URL}?${search.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error('[nearby-venues] Places HTTP error', res.status);
    return [];
  }
  const data = (await res.json()) as { results?: GooglePlaceResult[]; status?: string; error_message?: string };
  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error('[nearby-venues] Places status', data.status, data.error_message);
  }
  return data.results ?? [];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed', venues: [] }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const key = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!key?.trim()) {
    return new Response(
      JSON.stringify({
        error: 'GOOGLE_PLACES_API_KEY is not configured',
        venues: [],
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = (await req.json()) as NearbyBody;
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return new Response(JSON.stringify({ error: 'Invalid lat/lng', venues: [] }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let radius = Math.round(Number(body.radius) || 2000);
    if (radius < 100) radius = 100;
    if (radius > 50000) radius = 50000;

    const [musicClubs, bars] = await Promise.all([
      fetchNearby(key, lat, lng, radius, { type: 'night_club' }),
      fetchNearby(key, lat, lng, radius, { type: 'bar' }),
    ]);

    const byId = new Map<string, GooglePlaceResult>();
    for (const r of [...musicClubs, ...bars]) {
      const id = r.place_id;
      if (id && !byId.has(id)) byId.set(id, r);
    }

    const venues = [...byId.values()].map(mapVenue);

    return new Response(JSON.stringify({ venues }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[nearby-venues]', e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : 'Unknown error',
        venues: [],
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
