/**
 * Grant RevenueCat promotional access via REST API v2 (new secret keys do not support v1).
 * app_user_id = Supabase user id (UUID), one per line in the input file.
 *
 * Run from apps/web (loads repo root or apps/web .env.local):
 *   node scripts/revenuecat-grant-waitlist-premium.js path/to/user-ids.txt
 *
 * Required env:
 *   REVENUECAT_SECRET_API_KEY — must include permission:
 *   **customer_information:customers:read_write** (create a new Secret key in RevenueCat if grant returns 403).
 *
 * Optional:
 *   REVENUECAT_PROJECT_ID — default: first project from GET /v2/projects
 *   REVENUECAT_PREMIUM_ENTITLEMENT_ID — internal id (entl…); overrides lookup resolution
 *   REVENUECAT_ENTITLEMENT_LOOKUP_ORDER — default: premium_features,premium
 *   DRY_RUN=1 — log only
 *   START_TIME_MS — informational only (logged)
 *   END_TIME_MS — entitlement expires_at (ms). Default: 2026-07-01 00:00 UTC (matches DB promo end)
 */

const fs = require('fs');
const path = require('path');

// Repo root .env.local first (where REVENUECAT_SECRET_API_KEY usually lives), then apps/web/.env.local overrides.
const rootEnv = path.join(__dirname, '..', '..', '.env.local');
const webEnv = path.join(__dirname, '..', '.env.local');
require('dotenv').config({ path: rootEnv, override: true });
require('dotenv').config({ path: webEnv, override: true });

const DEFAULT_END_MS = Date.UTC(2026, 6, 1, 0, 0, 0, 0); // 2026-07-01 — 3 months after 2026-04-01
const DEFAULT_START_MS = Date.UTC(2026, 3, 1, 0, 0, 0, 0);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function secretKey() {
  return (
    process.env.REVENUECAT_SECRET_API_KEY?.trim() ||
    process.env.REVENUECAT_API_SECRET_KEY?.trim() ||
    process.env.RC_SECRET_KEY?.trim()
  );
}

async function rcV2(path, init = {}) {
  const key = secretKey();
  const res = await fetch(`https://api.revenuecat.com/v2${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { res, json, text };
}

let cachedProjectId;
let cachedPremiumEntitlementId;

async function resolveProjectId() {
  if (process.env.REVENUECAT_PROJECT_ID?.trim()) return process.env.REVENUECAT_PROJECT_ID.trim();
  if (cachedProjectId) return cachedProjectId;
  const { res, json } = await rcV2('/projects');
  if (!res.ok) throw new Error(`List projects failed: ${res.status} ${JSON.stringify(json)}`);
  const id = json.items?.[0]?.id;
  if (!id) throw new Error('No RevenueCat project found');
  cachedProjectId = id;
  return id;
}

async function resolvePremiumEntitlementId(projectId) {
  if (process.env.REVENUECAT_PREMIUM_ENTITLEMENT_ID?.trim()) {
    return process.env.REVENUECAT_PREMIUM_ENTITLEMENT_ID.trim();
  }
  if (cachedPremiumEntitlementId) return cachedPremiumEntitlementId;
  const { res, json } = await rcV2(`/projects/${encodeURIComponent(projectId)}/entitlements?limit=50`);
  if (!res.ok) throw new Error(`List entitlements failed: ${res.status} ${JSON.stringify(json)}`);
  const order = (
    process.env.REVENUECAT_ENTITLEMENT_LOOKUP_ORDER || 'premium_features,premium'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const items = json.items || [];
  for (const lk of order) {
    const hit = items.find((e) => e.lookup_key === lk);
    if (hit) {
      cachedPremiumEntitlementId = hit.id;
      return hit.id;
    }
  }
  throw new Error(
    `No entitlement matching lookup keys [${order.join(', ')}]. Set REVENUECAT_PREMIUM_ENTITLEMENT_ID or REVENUECAT_ENTITLEMENT_LOOKUP_ORDER.`
  );
}

/** Supabase user exists but never opened the app → no RC customer yet. */
async function ensureRevenueCatCustomer(projectId, appUserId) {
  const getPath = `/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(appUserId)}`;
  const { res: getRes } = await rcV2(getPath);
  if (getRes.ok) return { ok: true };
  if (getRes.status !== 404) {
    return { ok: false, status: getRes.status, note: 'GET customer' };
  }
  const createPath = `/projects/${encodeURIComponent(projectId)}/customers`;
  const { res: cres, text } = await rcV2(createPath, {
    method: 'POST',
    body: JSON.stringify({ id: appUserId, attributes: [] }),
  });
  if (cres.status === 201 || cres.status === 409) return { ok: true };
  return { ok: false, status: cres.status, body: text, note: 'POST customer' };
}

async function grantPromotionalV2(appUserId, expiresAtMs, dryRun) {
  if (dryRun && !secretKey()) {
    console.log('[dry-run] Would POST /v2/.../grant_entitlement', {
      customer_id: appUserId,
      expires_at: expiresAtMs,
    });
    return { ok: true, dryRun: true };
  }

  const projectId = await resolveProjectId();
  const entitlementId = await resolvePremiumEntitlementId(projectId);
  const pathUrl = `/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(
    appUserId
  )}/actions/grant_entitlement`;
  const body = { entitlement_id: entitlementId, expires_at: expiresAtMs };

  if (dryRun) {
    console.log('[dry-run] POST https://api.revenuecat.com/v2' + pathUrl, JSON.stringify(body));
    return { ok: true, dryRun: true };
  }

  let { res, text } = await rcV2(pathUrl, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok && res.status === 404 && String(text).includes('Could not find customer')) {
    console.log('Creating RevenueCat customer then retrying grant:', appUserId);
    const ensured = await ensureRevenueCatCustomer(projectId, appUserId);
    if (!ensured.ok) {
      return {
        ok: false,
        status: ensured.status,
        body: ensured.body || `ensure customer failed (${ensured.note})`,
      };
    }
    const retry = await rcV2(pathUrl, { method: 'POST', body: JSON.stringify(body) });
    res = retry.res;
    text = retry.text;
  }
  if (!res.ok) {
    return { ok: false, status: res.status, body: text };
  }
  return { ok: true, body: text };
}

async function main() {
  const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
  const key = secretKey();
  if (!key && !dryRun) {
    console.error('Missing RevenueCat secret API key (REVENUECAT_SECRET_API_KEY or RC_SECRET_KEY).');
    process.exit(1);
  }
  if (dryRun && !key) {
    console.warn(
      'DRY_RUN without local secret key — logging only. Add key to .env.local for live run.'
    );
  }

  const filePath = process.argv[2];
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('Usage: node scripts/revenuecat-grant-waitlist-premium.js <file-with-one-uuid-per-line>');
    process.exit(1);
  }

  const startMs = process.env.START_TIME_MS
    ? parseInt(process.env.START_TIME_MS, 10)
    : DEFAULT_START_MS;
  const endMs = process.env.END_TIME_MS ? parseInt(process.env.END_TIME_MS, 10) : DEFAULT_END_MS;

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    console.error('Invalid START_TIME_MS or END_TIME_MS');
    process.exit(1);
  }

  console.log('Promo window (UTC):', new Date(startMs).toISOString(), '→', new Date(endMs).toISOString());
  console.log('expires_at (RC):', endMs);
  console.log('Dry run:', dryRun);

  if (!dryRun && key) {
    try {
      const pid = await resolveProjectId();
      const eid = await resolvePremiumEntitlementId(pid);
      console.log('RevenueCat project:', pid, '| Premium entitlement:', eid);
    } catch (e) {
      console.error(e.message || e);
      process.exit(1);
    }
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  let ok = 0;
  let fail = 0;

  for (const line of lines) {
    const id = line.trim();
    if (!id || id.startsWith('#')) continue;
    if (!UUID_RE.test(id)) {
      console.warn('Skip (not a UUID):', id);
      continue;
    }
    const result = await grantPromotionalV2(id, endMs, dryRun);
    if (result.ok) {
      ok += 1;
      console.log('OK', id);
    } else {
      fail += 1;
      console.error('FAIL', id, result.status, result.body?.slice?.(0, 800));
      if (result.status === 403 && String(result.body).includes('read_write')) {
        console.error(
          '\n→ Create a new Secret API key in RevenueCat with **customer_information:customers:read_write** (Project settings → API keys).'
        );
      }
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  console.log('\nDone. ok:', ok, 'fail:', fail);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
