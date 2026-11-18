#!/usr/bin/env node
// Backfills city/latitude/longitude for profiles that have real, user-typed
// location text but no coordinates yet (created before resolveLocationUpdate
// existed, or geocoded at save time and failed transiently).
//
// Eligibility (every condition required):
//   - location_source IS NULL OR location_source = 'user'
//   - location is non-empty after trimming
//   - latitude IS NULL OR longitude IS NULL
//   - excludes the ambiguous cohort: location ILIKE 'london' AND
//     location_source IS NULL. By construction every confirmed-default
//     'london' row already has location_source = 'default' (see
//     scripts/backfill-profiles-location-source.sql), so any 'london' row
//     still NULL here is one of the 255 rows with no reliable signal to tell
//     a genuine London user from an unedited default. Never auto-geocode
//     those. 'london' rows with location_source = 'user' (a real save that
//     happened to type London and failed to geocode at the time) are NOT
//     excluded, since that source value proves a real save occurred.
//
// Never touches location_source = 'default', and never retroactively
// reclassifies the other, non-london NULL rows as 'user' on its own —
// eligibility already requires NULL or 'user', so a row only becomes
// eligible by being NULL (as every unreclassified row already is) or by a
// prior --apply run of this same script marking a failed attempt 'user'.
//
// Usage:
//   node scripts/geocode-profile-backfill.js            dry run: prints the
//                                                        eligible count and
//                                                        geocodes just the
//                                                        first 20 rows as a
//                                                        sample, writes nothing.
//   node scripts/geocode-profile-backfill.js --apply     geocodes and writes
//                                                        every eligible row.
//
// Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
// GOOGLE_GEOCODING_API_KEY from apps/web/.env.local.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const path = join(__dirname, '..', 'apps', 'web', '.env.local');
  const text = readFileSync(path, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnvLocal();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const GEOCODE_KEY = env.GOOGLE_GEOCODING_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !GEOCODE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GOOGLE_GEOCODING_API_KEY in apps/web/.env.local'
  );
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');

function isEligible(row) {
  const location = (row.location || '').trim();
  if (!location) return false;
  if (row.latitude != null && row.longitude != null) return false;
  const isAmbiguousLondon = location.toLowerCase() === 'london' && row.location_source == null;
  if (isAmbiguousLondon) return false;
  return true;
}

async function fetchEligibleProfiles() {
  const params = new URLSearchParams({
    select: 'id,location,location_source,latitude,longitude',
    or: '(location_source.is.null,location_source.eq.user)',
  });
  const baseUrl = `${SUPABASE_URL}/rest/v1/profiles?${params.toString()}`;
  const rows = [];
  const pageSize = 1000;
  let offset = 0;
  for (;;) {
    const res = await fetch(baseUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Range: `${offset}-${offset + pageSize - 1}`,
      },
    });
    if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return rows.filter(isEligible);
}

async function geocode(text) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(text)}&key=${GEOCODE_KEY}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return { ok: false, reason: 'http_error' };
    const data = await res.json();
    if (data?.status !== 'OK' || !Array.isArray(data.results) || data.results.length !== 1) {
      return { ok: false, reason: 'ambiguous_or_no_results' };
    }
    const result = data.results[0];
    const components = result.address_components || [];
    const locality = components.find((c) => c.types.includes('locality'));
    const country = components.find((c) => c.types.includes('country'));
    const loc = result.geometry?.location;
    if (!locality || !country || typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') {
      return { ok: false, reason: 'missing_locality_or_country' };
    }
    return { ok: true, city: locality.long_name, country: country.long_name, latitude: loc.lat, longitude: loc.lng };
  } catch {
    return { ok: false, reason: 'network_error' };
  } finally {
    clearTimeout(timeout);
  }
}

async function updateProfile(id, fields) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(`Update failed for ${id}: ${res.status} ${await res.text()}`);
}

async function processRow(row) {
  const outcome = await geocode(row.location);
  if (outcome.ok) {
    if (APPLY) {
      await updateProfile(row.id, {
        city: outcome.city,
        latitude: outcome.latitude,
        longitude: outcome.longitude,
        country: outcome.country,
        location_source: 'geocoded',
        updated_at: new Date().toISOString(),
      });
    }
    return { row, outcome, sampleLine: `"${row.location}" -> ${outcome.city}, ${outcome.country}` };
  }

  if (APPLY && row.location_source !== 'user') {
    // Tried and failed: mark 'user' so it stays eligible for a future retry
    // but is no longer indistinguishable from a never-attempted NULL row.
    await updateProfile(row.id, { location_source: 'user' });
  }
  return { row, outcome, sampleLine: `"${row.location}" -> failed (${outcome.reason})` };
}

async function main() {
  const eligible = await fetchEligibleProfiles();
  console.log(`Eligible rows: ${eligible.length}`);

  if (!APPLY) {
    const sampleRows = eligible.slice(0, 20);
    console.log(`Dry run: geocoding the first ${sampleRows.length} eligible rows as a sample, writing nothing.\n`);
    for (const row of sampleRows) {
      const { sampleLine } = await processRow(row);
      console.log(`  ${row.id}: ${sampleLine}`);
    }
    console.log('\nRe-run with --apply to geocode and write all eligible rows.');
    return;
  }

  let success = 0;
  let failure = 0;
  const samples = [];
  for (const row of eligible) {
    const { outcome, sampleLine } = await processRow(row);
    if (outcome.ok) success++;
    else failure++;
    if (samples.length < 20) samples.push(`${row.id}: ${sampleLine}`);
  }

  console.log(`Resolved: ${success}, failed/ambiguous: ${failure}`);
  console.log('Sample rows:');
  for (const line of samples) console.log(`  ${line}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
