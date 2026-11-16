/**
 * Geocoding utility for converting addresses to coordinates
 * Uses Google Maps Geocoding API
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  success: boolean;
  error?: string;
}

/**
 * Geocode an address string to get latitude and longitude
 * @param address Full address string (e.g., "10 Downing Street, London, Greater London, SW1A 2AA, United Kingdom")
 * @returns GeocodeResult with coordinates or error
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return {
      latitude: 0,
      longitude: 0,
      formattedAddress: address,
      success: false,
      error: 'Google Maps API key not configured'
    };
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;

      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address,
        success: true
      };
    } else if (data.status === 'ZERO_RESULTS') {
      return {
        latitude: 0,
        longitude: 0,
        formattedAddress: address,
        success: false,
        error: 'No results found for this address'
      };
    } else {
      return {
        latitude: 0,
        longitude: 0,
        formattedAddress: address,
        success: false,
        error: `Geocoding error: ${data.status}`
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      latitude: 0,
      longitude: 0,
      formattedAddress: address,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to geocode address'
    };
  }
}

/**
 * Build a full address string from address fields
 * @param addressFields Object with address field values
 * @param countryName Country name to append
 * @returns Full address string
 */
export function buildAddressString(
  addressFields: Record<string, string>,
  countryName: string
): string {
  const addressParts = Object.entries(addressFields)
    .filter(([_, value]) => value && value.trim())
    .map(([_, value]) => value.trim());

  if (addressParts.length === 0) {
    return countryName;
  }

  return `${addressParts.join(', ')}, ${countryName}`;
}

export interface ProfileGeocodeResult {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
}

export type GeocodeFailureReason =
  | 'empty_input'
  | 'no_api_key'
  | 'network_error'
  | 'http_error'
  | 'ambiguous_or_no_results'
  | 'missing_locality_or_country';

type GeocodeOutcome =
  | { ok: true; result: ProfileGeocodeResult }
  | { ok: false; reason: GeocodeFailureReason };

async function geocodeCityForProfileWithReason(input: string): Promise<GeocodeOutcome> {
  const trimmed = input?.trim();
  if (!trimmed) return { ok: false, reason: 'empty_input' };

  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!apiKey) return { ok: false, reason: 'no_api_key' };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}&key=${apiKey}`;
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) return { ok: false, reason: 'http_error' };

    const data = await response.json();

    if (data?.status !== 'OK' || !Array.isArray(data.results) || data.results.length !== 1) {
      // ZERO_RESULTS, REQUEST_DENIED, more than one candidate (ambiguous), etc.
      return { ok: false, reason: 'ambiguous_or_no_results' };
    }

    const result = data.results[0];
    const components: Array<{ long_name: string; types: string[] }> = result.address_components || [];
    const locality = components.find((c) => c.types.includes('locality'));
    const country = components.find((c) => c.types.includes('country'));
    const location = result.geometry?.location;

    if (!locality || !country || typeof location?.lat !== 'number' || typeof location?.lng !== 'number') {
      return { ok: false, reason: 'missing_locality_or_country' };
    }

    return {
      ok: true,
      result: {
        latitude: location.lat,
        longitude: location.lng,
        city: locality.long_name,
        country: country.long_name,
      },
    };
  } catch {
    return { ok: false, reason: 'network_error' };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Geocode a user-typed profile location into city-centre coordinates, city and
 * country, for matching nearby-event notifications. Server-only: reads
 * GOOGLE_GEOCODING_API_KEY, never NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, so the key
 * never reaches the client bundle.
 *
 * Fails soft by design: a missing key, network error, timeout, zero results,
 * or an ambiguous match (more than one candidate, or no locality/country in
 * the one candidate) all return null. Callers must leave the profile's typed
 * location text and any existing city/latitude/longitude/country untouched
 * when this returns null. Use resolveLocationUpdate below for profile writes;
 * this plain function stays for direct, reason-agnostic callers and tests.
 */
export async function geocodeCityForProfile(input: string): Promise<ProfileGeocodeResult | null> {
  const outcome = await geocodeCityForProfileWithReason(input);
  return outcome.ok ? outcome.result : null;
}

export interface LocationUpdateFields {
  location: string | null;
  city?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
}

/**
 * Shared by every profile write path so geocode-on-change behaves identically
 * everywhere instead of being reimplemented (and able to drift) per endpoint.
 *
 * Returns null when newLocation is undefined (the caller didn't touch
 * location at all, so nothing should be merged into the update). Otherwise
 * always returns at least { location }; city/latitude/longitude/country are
 * only included when the typed location actually changed AND geocoding
 * succeeded, so a failed or skipped geocode never overwrites prior values.
 *
 * On failure, logs one server-side line with profileId + a reason code only
 * (never the typed location text or any other profile data), so failure
 * frequency is visible without logging anything sensitive.
 */
export async function resolveLocationUpdate(
  profileId: string,
  previousLocation: string | null | undefined,
  newLocation: string | null | undefined
): Promise<LocationUpdateFields | null> {
  if (newLocation === undefined) return null;

  const trimmedNew = (newLocation ?? '').trim();
  const trimmedPrev = (previousLocation ?? '').trim();

  if (trimmedNew === trimmedPrev || !trimmedNew) {
    return { location: newLocation ?? null };
  }

  const fields: LocationUpdateFields = { location: newLocation ?? null };
  const outcome = await geocodeCityForProfileWithReason(trimmedNew);
  if (outcome.ok) {
    fields.city = outcome.result.city;
    fields.latitude = outcome.result.latitude;
    fields.longitude = outcome.result.longitude;
    fields.country = outcome.result.country;
  } else {
    console.warn(`[geocode] skipped for profile ${profileId}, reason: ${outcome.reason}`);
  }

  return fields;
}
