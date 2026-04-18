/**
 * Supabase Edge Function: nearby-venues
 * Proxies Google Places Nearby Search + Photo URL so GOOGLE_PLACES_API_KEY never ships to mobile.
 * POST JSON: { lat, lng, radius? } (radius in meters, default 2000, max 50000)
 * Two Nearby Search passes: night_club + bar; merged and deduped by place_id.
 *
 * Response venues match mobile contract: id (gp_<place_id>), photo_url, address, rating_count,
 * distance_km, venue_type, google_place_id, plus name, lat, lng, rating, types.
 */

const PLACES_NEARBY_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

type NearbyBody = {
  lat?: number;
  lng?: number;
  radius?: number;
};

type GooglePhoto = {
  photo_reference?: string;
  height?: number;
  width?: number;
};

type GooglePlaceResult = {
  place_id?: string;
  name?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  photos?: GooglePhoto[];
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

function humanizeVenueType(t: string | undefined): string | null {
  if (!t) return null;
  return t
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Places Photo API URL (server-side; key never sent to client in JSON — mobile loads this URL). */
function buildPhotoUrl(photoReference: string | undefined, apiKey: string, maxWidth = 400): string | null {
  if (!photoReference?.trim()) return null;
  const params = new URLSearchParams({
    maxwidth: String(maxWidth),
    photo_reference: photoReference,
    key: apiKey,
  });
  return `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`;
}

type VenueOut = {
  id: string;
  google_place_id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  rating: number | null;
  rating_count: number | null;
  distance_km: number | null;
  venue_type: string | null;
  photo_url: string | null;
  types: string[];
};

function mapVenue(
  r: GooglePlaceResult,
  originLat: number,
  originLng: number,
  apiKey: string
): VenueOut | null {
  const placeId = r.place_id?.trim() ?? '';
  if (!placeId) return null;

  const loc = r.geometry?.location;
  const vlat = loc?.lat;
  const vlng = loc?.lng;
  if (!Number.isFinite(vlat) || !Number.isFinite(vlng)) return null;

  const photoRef = r.photos?.[0]?.photo_reference;

  return {
    id: `gp_${placeId}`,
    google_place_id: placeId,
    name: r.name ?? '',
    lat: vlat as number,
    lng: vlng as number,
    address: r.vicinity ?? null,
    rating: r.rating ?? null,
    rating_count: r.user_ratings_total ?? null,
    distance_km: haversineKm(originLat, originLng, vlat as number, vlng as number),
    venue_type: humanizeVenueType(r.types?.[0]),
    photo_url: buildPhotoUrl(photoRef, apiKey),
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

    const venues: VenueOut[] = [];
    for (const r of byId.values()) {
      const m = mapVenue(r, lat, lng, key);
      if (m) venues.push(m);
    }

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
