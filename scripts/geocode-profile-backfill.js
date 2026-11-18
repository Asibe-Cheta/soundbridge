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
// Region bias and single-token country gate: the geocoding call is biased
// toward Nigeria (region=ng) since that's overwhelmingly where this user
// base is. For any input with no comma (a bare city/place name with no
// explicit country qualifier, e.g. "Aubrey" or "Accra"), the result is only
// accepted if it resolved to Nigeria, the United Kingdom, Ghana, or South
// Africa (checked by the resolved country's short code: NG, GB, GH, ZA);
// anything else is marked failed rather than silently accepting an
// ambiguous one-word match to an unrelated country (e.g. "Aubrey" must not
// resolve to Aubrey, United States). A rejected row gets NO coordinates
// written and its location text is left exactly as it was — this script
// never touches the location column at all, only city/latitude/longitude/
// country/location_source. Inputs that already contain a comma (e.g.
// "Lokoja, Kogi State, Nigeria.") are explicit enough that this gate is
// skipped entirely, regardless of resolved country.
//
// network_error outcomes are retried up to 3 times (4 attempts total) with
// exponential backoff (500ms, 1s, 2s) before being recorded as a failure.
//
// "East London" / its current Google label "KuGompo City", South Africa is
// excluded even though ZA is otherwise accepted for single-token inputs:
// too easy to confuse with a Nigeria/UK entry, left unresolved rather than
// guessed.
//
// Usage:
//   node scripts/geocode-profile-backfill.js --plan --limit 25
//                                                          no geocoding, no
//                                                          writes: prints the
//                                                          exact ordered ids
//                                                          (and a pasteable
//                                                          SQL id list) that
//                                                          --apply --limit 25
//                                                          would touch, so a
//                                                          backup table can
//                                                          be created first.
//   node scripts/geocode-profile-backfill.js              dry run: prints the
//                                                          eligible count and
//                                                          geocodes just the
//                                                          first 20 rows as a
//                                                          sample, writes nothing.
//   node scripts/geocode-profile-backfill.js --report     dry run over the
//                                                          FULL eligible set:
//                                                          prints outcome and
//                                                          resolved-country
//                                                          counts, every
//                                                          accepted row
//                                                          outside NG/GB, and
//                                                          20 random NG rows.
//                                                          Writes nothing.
//   node scripts/geocode-profile-backfill.js --apply --backup-table NAME
//                                                          geocodes and
//                                                          writes every
//                                                          eligible row that
//                                                          is ALSO present in
//                                                          the given backup
//                                                          table (by id). Any
//                                                          eligible row not
//                                                          in that table is
//                                                          skipped, not
//                                                          written. --apply
//                                                          refuses to run at
//                                                          all without
//                                                          --backup-table, so
//                                                          every write is
//                                                          always reversible
//                                                          from a table that
//                                                          existed before the
//                                                          run started.
//   node scripts/geocode-profile-backfill.js --apply --backup-table NAME --limit 25
//                                                          same, capped to
//                                                          the first 25 of
//                                                          the backed-up
//                                                          eligible rows.
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

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  return idx === -1 ? null : process.argv[idx + 1];
}

const APPLY = process.argv.includes('--apply');
const REPORT = process.argv.includes('--report');
const PLAN = process.argv.includes('--plan');
const LIMIT = getArgValue('--limit') ? parseInt(getArgValue('--limit'), 10) : null;
const BACKUP_TABLE = getArgValue('--backup-table');

if (APPLY && !BACKUP_TABLE) {
  console.error(
    '--apply requires --backup-table <name>: every write must be reversible. Create the backup table ' +
      '(see scripts/*.sql for the pattern) for the rows this run will touch, then pass its name here. Any ' +
      'eligible row not present in that table is skipped, not written, even if it would otherwise qualify.'
  );
  process.exit(1);
}
const SINGLE_TOKEN_ACCEPTED_CODES = new Set(['NG', 'GB', 'GH', 'ZA']);
const GEOCODE_RATE_LIMIT_MS = 150; // ~6-7 req/sec between rows in --apply

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isEligible(row) {
  const location = (row.location || '').trim();
  if (!location) return false;
  if (row.latitude != null && row.longitude != null) return false;
  const lower = location.toLowerCase();
  const isAmbiguousLondon = lower === 'london' && row.location_source == null;
  if (isAmbiguousLondon) return false;
  // Excluded pre-emptively by typed text now, not just post-geocode: keeps
  // this rule fully expressible in plain SQL (lower(trim(location)) =
  // 'east london'), so a SQL-side backup query can exclude exactly what
  // --apply will skip, with no gap between the two.
  if (lower === 'east london') return false;
  return true;
}

async function fetchEligibleProfiles() {
  // Explicit order so repeated runs (a --plan followed later by --apply with
  // the same --limit) select the exact same rows in the exact same order —
  // PostgREST gives no ordering guarantee without this.
  const params = new URLSearchParams({
    select: 'id,location,location_source,latitude,longitude',
    or: '(location_source.is.null,location_source.eq.user)',
    order: 'id.asc',
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

async function fetchBackupIds(tableName) {
  // Table/column names can't go through encodeURIComponent-style query
  // params safely as identifiers, so this only accepts the exact table name
  // given on the command line and relies on PostgREST rejecting anything
  // that isn't a real, accessible table.
  const baseUrl = `${SUPABASE_URL}/rest/v1/${tableName}?select=id&order=id.asc`;
  const ids = new Set();
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
    if (!res.ok) throw new Error(`Backup table fetch failed for "${tableName}": ${res.status} ${await res.text()}`);
    const page = await res.json();
    for (const row of page) ids.add(row.id);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return ids;
}

async function geocodeOnce(text) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(text)}&region=ng&key=${GEOCODE_KEY}`;
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

    const hasComma = text.includes(',');
    if (!hasComma) {
      // "East London" / its current Google label "KuGompo City", South
      // Africa, is specifically excluded even though ZA is otherwise
      // accepted: too easy to confuse with a Nigeria/UK entry, left
      // unresolved rather than guessed.
      const isExcludedEastLondon =
        country.short_name === 'ZA' && (locality.long_name === 'KuGompo City' || locality.long_name === 'East London');
      if (isExcludedEastLondon) {
        return {
          ok: false,
          reason: 'excluded_east_london_za',
          attemptedCountry: country.long_name,
          attemptedCountryCode: country.short_name,
        };
      }

      if (!SINGLE_TOKEN_ACCEPTED_CODES.has(country.short_name)) {
        return {
          ok: false,
          reason: 'country_not_in_allowed_list',
          attemptedCountry: country.long_name,
          attemptedCountryCode: country.short_name,
        };
      }
    }

    return {
      ok: true,
      city: locality.long_name,
      country: country.long_name,
      countryCode: country.short_name,
      latitude: loc.lat,
      longitude: loc.lng,
    };
  } catch {
    return { ok: false, reason: 'network_error' };
  } finally {
    clearTimeout(timeout);
  }
}

async function geocode(text) {
  const maxAttempts = 4; // 1 initial try + up to 3 retries
  let outcome;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    outcome = await geocodeOnce(text);
    if (outcome.reason !== 'network_error') return outcome;
    if (attempt < maxAttempts) {
      await sleep(500 * 2 ** (attempt - 1)); // 500ms, 1s, 2s
    }
  }
  return outcome;
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

  // Rejected or failed: no coordinates written, location text untouched.
  if (APPLY && row.location_source !== 'user') {
    // Tried and failed: mark 'user' so it stays eligible for a future retry
    // but is no longer indistinguishable from a never-attempted NULL row.
    await updateProfile(row.id, { location_source: 'user' });
  }
  return { row, outcome, sampleLine: `"${row.location}" -> failed (${outcome.reason})` };
}

function pickRandom(array, n) {
  const copy = [...array];
  const picked = [];
  while (copy.length > 0 && picked.length < n) {
    const idx = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(idx, 1)[0]);
  }
  return picked;
}

async function main() {
  const eligible = await fetchEligibleProfiles();
  console.log(`Eligible rows: ${eligible.length}`);

  if (PLAN) {
    // No geocoding, no writes: just the deterministic, ordered selection
    // that --apply --limit N would touch, so a backup table can be created
    // for exactly these ids before --apply ever runs.
    const planned = LIMIT ? eligible.slice(0, LIMIT) : eligible;
    console.log(`Plan: ${planned.length} row(s) that --apply${LIMIT ? ` --limit ${LIMIT}` : ''} would touch, in order.\n`);
    for (const row of planned) console.log(`  ${row.id}: "${row.location}"`);
    console.log(`\nSQL id list:\n(${planned.map((r) => `'${r.id}'`).join(', ')})`);
    return;
  }

  if (REPORT) {
    console.log('Report mode: geocoding every eligible row, writing nothing.\n');
    const outcomeCounts = {};
    const countryCounts = {};
    const acceptedOutsideNgGb = [];
    const acceptedNgRows = [];

    for (const row of eligible) {
      const { outcome } = await processRow(row);
      const key = outcome.ok ? 'geocoded' : `failed: ${outcome.reason}`;
      outcomeCounts[key] = (outcomeCounts[key] || 0) + 1;

      const resolvedCountry = outcome.ok ? outcome.country : outcome.attemptedCountry;
      const resolvedCode = outcome.ok ? outcome.countryCode : outcome.attemptedCountryCode;
      if (resolvedCountry) {
        countryCounts[resolvedCountry] = (countryCounts[resolvedCountry] || 0) + 1;
      }

      if (outcome.ok && resolvedCode === 'NG') {
        acceptedNgRows.push(`${row.id}: "${row.location}" -> ${outcome.city}, ${outcome.country}`);
      } else if (outcome.ok && resolvedCode !== 'GB') {
        acceptedOutsideNgGb.push(`${row.id}: "${row.location}" -> ${outcome.city}, ${outcome.country}`);
      }
    }

    console.log('Counts by outcome:');
    for (const [key, count] of Object.entries(outcomeCounts)) console.log(`  ${key}: ${count}`);

    console.log('\nCounts by resolved country (includes rejected single-token non-allowed matches):');
    for (const [country, count] of Object.entries(countryCounts)) console.log(`  ${country}: ${count}`);

    console.log(`\nAll ACCEPTED rows resolved to a country other than Nigeria or the UK (${acceptedOutsideNgGb.length}):`);
    for (const line of acceptedOutsideNgGb) console.log(`  ${line}`);

    const ngSample = pickRandom(acceptedNgRows, 20);
    console.log(`\n20 random accepted Nigeria rows (of ${acceptedNgRows.length} total):`);
    for (const line of ngSample) console.log(`  ${line}`);

    console.log('\nDry run only (--report), nothing written. Re-run with --apply to geocode and write all eligible rows.');
    return;
  }

  if (!APPLY) {
    const sampleRows = eligible.slice(0, 20);
    console.log(`Dry run: geocoding the first ${sampleRows.length} eligible rows as a sample, writing nothing.\n`);
    for (const row of sampleRows) {
      const { sampleLine } = await processRow(row);
      console.log(`  ${row.id}: ${sampleLine}`);
    }
    console.log('\nRe-run with --report for full-set stats, or --apply to geocode and write all eligible rows.');
    return;
  }

  const backupIds = await fetchBackupIds(BACKUP_TABLE);
  const backedUp = eligible.filter((row) => backupIds.has(row.id));
  const skippedNotBackedUp = eligible.length - backedUp.length;
  console.log(
    `Backup table "${BACKUP_TABLE}" has ${backupIds.size} id(s). ${backedUp.length}/${eligible.length} ` +
      `eligible rows are covered by it; ${skippedNotBackedUp} eligible row(s) NOT in the backup will be ` +
      `skipped entirely (not written), so every write this run makes is reversible from that table.`
  );

  const rowsToProcess = LIMIT ? backedUp.slice(0, LIMIT) : backedUp;
  console.log(`Applying to ${rowsToProcess.length} row(s)${LIMIT ? ` (--limit ${LIMIT})` : ''}.`);
  console.log(
    `Rate-limited to one request every ${GEOCODE_RATE_LIMIT_MS}ms. Resumable: eligibility is re-queried fresh ` +
      `each run, and a successfully geocoded row (real lat/lng + location_source='geocoded') drops out of ` +
      `eligibility, so re-running --apply after an interruption skips everything already done and only ` +
      `continues with what's left (previously-failed rows are retried, which is intended).\n`
  );

  const outcomeCounts = {};
  const countryCounts = {};
  let processed = 0;
  for (const row of rowsToProcess) {
    const { outcome } = await processRow(row);
    const key = outcome.ok ? 'geocoded' : `failed: ${outcome.reason}`;
    outcomeCounts[key] = (outcomeCounts[key] || 0) + 1;
    const resolvedCountry = outcome.ok ? outcome.country : outcome.attemptedCountry;
    if (resolvedCountry) countryCounts[resolvedCountry] = (countryCounts[resolvedCountry] || 0) + 1;

    processed++;
    if (processed % 50 === 0 || processed === rowsToProcess.length) {
      console.log(`  progress: ${processed}/${rowsToProcess.length}`);
    }
    if (processed < rowsToProcess.length) await sleep(GEOCODE_RATE_LIMIT_MS);
  }

  console.log('\nFinal counts by outcome:');
  for (const [key, count] of Object.entries(outcomeCounts)) console.log(`  ${key}: ${count}`);

  console.log('\nFinal counts by resolved country:');
  for (const [country, count] of Object.entries(countryCounts)) console.log(`  ${country}: ${count}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
