'use client';

import { useState, useEffect } from 'react';

interface LocationData {
  country: string;
  countryCode: string;
  city?: string;
  region?: string;
  currency: string;
  currencySymbol: string;
  isDetected: boolean;
}

interface UseLocationReturn {
  location: LocationData | null;
  isLoading: boolean;
  error: string | null;
  detectLocation: () => Promise<void>;
}

// Currency mapping for supported countries
const CURRENCY_MAP: Record<string, { currency: string; symbol: string }> = {
  'GB': { currency: 'GBP', symbol: '£' },
  'UK': { currency: 'GBP', symbol: '£' },
  'NG': { currency: 'NGN', symbol: '₦' },
  'US': { currency: 'USD', symbol: '$' },
  'CA': { currency: 'CAD', symbol: 'C$' },
  'AU': { currency: 'AUD', symbol: 'A$' },
  'EU': { currency: 'EUR', symbol: '€' },
  'DE': { currency: 'EUR', symbol: '€' },
  'FR': { currency: 'EUR', symbol: '€' },
  'IT': { currency: 'EUR', symbol: '€' },
  'ES': { currency: 'EUR', symbol: '€' },
  'NL': { currency: 'EUR', symbol: '€' },
  'BE': { currency: 'EUR', symbol: '€' },
  'AT': { currency: 'EUR', symbol: '€' },
  'IE': { currency: 'EUR', symbol: '€' },
  'FI': { currency: 'EUR', symbol: '€' },
  'PT': { currency: 'EUR', symbol: '€' },
  'GR': { currency: 'EUR', symbol: '€' },
  'CY': { currency: 'EUR', symbol: '€' },
  'MT': { currency: 'EUR', symbol: '€' },
  'SI': { currency: 'EUR', symbol: '€' },
  'SK': { currency: 'EUR', symbol: '€' },
  'EE': { currency: 'EUR', symbol: '€' },
  'LV': { currency: 'EUR', symbol: '€' },
  'LT': { currency: 'EUR', symbol: '€' },
  'LU': { currency: 'EUR', symbol: '€' },
};

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectLocation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try IP-based geolocation first (more reliable)
      const ipResponse = await fetch('https://ipapi.co/json/');
      
      if (ipResponse.ok) {
        const ipData = await ipResponse.json();
        
        const countryCode = ipData.country_code?.toUpperCase();
        const currencyInfo = CURRENCY_MAP[countryCode];
        
        if (currencyInfo) {
          setLocation({
            country: ipData.country_name || 'Unknown',
            countryCode: countryCode,
            city: ipData.city,
            region: ipData.region,
            currency: currencyInfo.currency,
            currencySymbol: currencyInfo.symbol,
            isDetected: true,
          });
          return;
        }
      }

      // Fallback to browser geolocation
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: false,
          });
        });

        // Use reverse geocoding to get country info
        const { latitude, longitude } = position.coords;
        const reverseGeocodeResponse = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );

        if (reverseGeocodeResponse.ok) {
          const geoData = await reverseGeocodeResponse.json();
          const countryCode = geoData.countryCode?.toUpperCase();
          const currencyInfo = CURRENCY_MAP[countryCode];

          if (currencyInfo) {
            setLocation({
              country: geoData.countryName || 'Unknown',
              countryCode: countryCode,
              city: geoData.city,
              region: geoData.principalSubdivision,
              currency: currencyInfo.currency,
              currencySymbol: currencyInfo.symbol,
              isDetected: true,
            });
            return;
          }
        }
      }

      // Default to GBP if detection fails
      setLocation({
        country: 'United Kingdom',
        countryCode: 'GB',
        currency: 'GBP',
        currencySymbol: '£',
        isDetected: false,
      });

    } catch (err) {
      console.error('Location detection failed:', err);
      setError('Failed to detect location');
      
      // Default to GBP on error
      setLocation({
        country: 'United Kingdom',
        countryCode: 'GB',
        currency: 'GBP',
        currencySymbol: '£',
        isDetected: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-detect location on mount
  useEffect(() => {
    detectLocation();
  }, []);

  return {
    location,
    isLoading,
    error,
    detectLocation,
  };
}
