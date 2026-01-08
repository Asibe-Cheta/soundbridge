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
