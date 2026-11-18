import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { geocodeCityForProfile, resolveLocationUpdate } from '../geocoding';

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_KEY = process.env.GOOGLE_GEOCODING_API_KEY;

function mockFetch(body: unknown, ok = true) {
  global.fetch = (async () => ({
    ok,
    json: async () => body,
  })) as typeof fetch;
}

function mockFetchThrows(error: Error) {
  global.fetch = (async () => {
    throw error;
  }) as typeof fetch;
}

function geocodeResult(overrides: Partial<{ locality: string; country: string; lat: number; lng: number; partial: boolean }> = {}) {
  const locality = overrides.locality ?? 'London';
  const country = overrides.country ?? 'United Kingdom';
  const lat = overrides.lat ?? 51.5072;
  const lng = overrides.lng ?? -0.1276;
  return {
    status: 'OK',
    results: [
      {
        partial_match: overrides.partial ?? undefined,
        geometry: { location: { lat, lng } },
        address_components: [
          { long_name: locality, types: ['locality', 'political'] },
          { long_name: country, types: ['country', 'political'] },
        ],
      },
    ],
  };
}

describe('geocodeCityForProfile', () => {
  beforeEach(() => {
    process.env.GOOGLE_GEOCODING_API_KEY = 'test-key';
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    process.env.GOOGLE_GEOCODING_API_KEY = ORIGINAL_KEY;
  });

  test('normal city resolves to coordinates, city and country', async () => {
    mockFetch(geocodeResult({ locality: 'Manchester', country: 'United Kingdom', lat: 53.4808, lng: -2.2426 }));
    const result = await geocodeCityForProfile('Manchester');
    assert.deepEqual(result, {
      latitude: 53.4808,
      longitude: -2.2426,
      city: 'Manchester',
      country: 'United Kingdom',
    });
  });

  test('misspelling with a single partial-match result still resolves', async () => {
    mockFetch(geocodeResult({ locality: 'London', partial: true }));
    const result = await geocodeCityForProfile('Lonodn');
    assert.deepEqual(result, {
      latitude: 51.5072,
      longitude: -0.1276,
      city: 'London',
      country: 'United Kingdom',
    });
  });

  test('ambiguous city without a country returns null (fails soft)', async () => {
    mockFetch({
      status: 'OK',
      results: [geocodeResult({ locality: 'Springfield', country: 'United States' }).results[0], geocodeResult({ locality: 'Springfield', country: 'Australia' }).results[0]],
    });
    const result = await geocodeCityForProfile('Springfield');
    assert.equal(result, null);
  });

  test('same city qualified with a country resolves to one result', async () => {
    mockFetch(geocodeResult({ locality: 'Springfield', country: 'United States', lat: 39.7817, lng: -89.6501 }));
    const result = await geocodeCityForProfile('Springfield, Illinois, USA');
    assert.deepEqual(result, {
      latitude: 39.7817,
      longitude: -89.6501,
      city: 'Springfield',
      country: 'United States',
    });
  });

  test('empty input returns null without calling the API', async () => {
    let called = false;
    global.fetch = (async () => {
      called = true;
      return { ok: true, json: async () => geocodeResult() };
    }) as typeof fetch;

    const result = await geocodeCityForProfile('   ');
    assert.equal(result, null);
    assert.equal(called, false);
  });

  test('missing API key returns null without calling the API', async () => {
    delete process.env.GOOGLE_GEOCODING_API_KEY;
    let called = false;
    global.fetch = (async () => {
      called = true;
      return { ok: true, json: async () => geocodeResult() };
    }) as typeof fetch;

    const result = await geocodeCityForProfile('London');
    assert.equal(result, null);
    assert.equal(called, false);
  });

  test('API failure (network error) returns null', async () => {
    mockFetchThrows(new Error('network down'));
    const result = await geocodeCityForProfile('London');
    assert.equal(result, null);
  });

  test('API failure (non-OK HTTP response) returns null', async () => {
    mockFetch(geocodeResult(), false);
    const result = await geocodeCityForProfile('London');
    assert.equal(result, null);
  });

  test('zero results returns null', async () => {
    mockFetch({ status: 'ZERO_RESULTS', results: [] });
    const result = await geocodeCityForProfile('asdkjaslkdjaslkd');
    assert.equal(result, null);
  });
});

describe('resolveLocationUpdate', () => {
  beforeEach(() => {
    process.env.GOOGLE_GEOCODING_API_KEY = 'test-key';
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    process.env.GOOGLE_GEOCODING_API_KEY = ORIGINAL_KEY;
  });

  test('location untouched (undefined) returns null, no API call', async () => {
    let called = false;
    global.fetch = (async () => {
      called = true;
      return { ok: true, json: async () => geocodeResult() };
    }) as typeof fetch;

    const result = await resolveLocationUpdate('profile-1', 'London', undefined);
    assert.equal(result, null);
    assert.equal(called, false);
  });

  test('location unchanged skips geocoding', async () => {
    let called = false;
    global.fetch = (async () => {
      called = true;
      return { ok: true, json: async () => geocodeResult() };
    }) as typeof fetch;

    const result = await resolveLocationUpdate('profile-1', 'London', 'London');
    assert.deepEqual(result, { location: 'London' });
    assert.equal(called, false);
  });

  test('location changed and geocode succeeds merges city/lat/lng/country and stamps location_source geocoded', async () => {
    mockFetch(geocodeResult({ locality: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792 }));
    const result = await resolveLocationUpdate('profile-1', 'London', 'Lagos');
    assert.deepEqual(result, {
      location: 'Lagos',
      city: 'Lagos',
      latitude: 6.5244,
      longitude: 3.3792,
      country: 'Nigeria',
      location_source: 'geocoded',
    });
  });

  test('location changed but geocode fails keeps only the typed text and stamps location_source user', async () => {
    mockFetch({ status: 'ZERO_RESULTS', results: [] });
    const result = await resolveLocationUpdate('profile-1', 'London', 'asdkjaslkdjaslkd');
    assert.deepEqual(result, { location: 'asdkjaslkdjaslkd', location_source: 'user' });
  });

  test('location cleared to empty skips geocoding and clears location_source', async () => {
    let called = false;
    global.fetch = (async () => {
      called = true;
      return { ok: true, json: async () => geocodeResult() };
    }) as typeof fetch;

    const result = await resolveLocationUpdate('profile-1', 'London', '');
    assert.deepEqual(result, { location: '', location_source: null });
    assert.equal(called, false);
  });

  test('failure logs profile id and a reason code, never the typed location text', async () => {
    mockFetch({ status: 'ZERO_RESULTS', results: [] });
    const originalWarn = console.warn;
    const calls: unknown[][] = [];
    console.warn = (...args: unknown[]) => {
      calls.push(args);
    };
    try {
      await resolveLocationUpdate('profile-42', 'London', 'a-city-that-does-not-exist-anywhere');
    } finally {
      console.warn = originalWarn;
    }

    assert.equal(calls.length, 1);
    const logged = calls[0].join(' ');
    assert.match(logged, /profile-42/);
    assert.match(logged, /ambiguous_or_no_results/);
    assert.doesNotMatch(logged, /a-city-that-does-not-exist-anywhere/);
  });

  test('success logs nothing', async () => {
    mockFetch(geocodeResult());
    const originalWarn = console.warn;
    let called = false;
    console.warn = () => {
      called = true;
    };
    try {
      await resolveLocationUpdate('profile-1', 'Lagos', 'London');
    } finally {
      console.warn = originalWarn;
    }
    assert.equal(called, false);
  });
});
