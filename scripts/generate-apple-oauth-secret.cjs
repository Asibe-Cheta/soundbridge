/**
 * Prints the Apple OAuth client secret (JWT) for Supabase "Secret Key (for OAuth)".
 *
 * Requires: jsonwebtoken (repo root: npm install, devDependency jsonwebtoken)
 *
 * Run from repo root:
 *   export APPLE_TEAM_ID=... APPLE_KEY_ID=... APPLE_SERVICE_ID=live.soundbridge.web
 *   node scripts/generate-apple-oauth-secret.cjs /path/to/AuthKey_XXX.p8
 *
 * Regenerate before expiry (~6 months). Do not commit .p8 or the JWT.
 */

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const p8Path = process.argv[2];
if (!p8Path) {
  console.error('Usage: node scripts/generate-apple-oauth-secret.cjs /path/to/AuthKey_XXX.p8');
  process.exit(1);
}

const teamId = process.env.APPLE_TEAM_ID || '';
const keyId = process.env.APPLE_KEY_ID || '';
const serviceId = process.env.APPLE_SERVICE_ID || '';

if (!teamId || !keyId || !serviceId) {
  console.error(
    'Set APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_SERVICE_ID (e.g. live.soundbridge.web), then re-run.'
  );
  process.exit(1);
}

const resolved = path.resolve(p8Path);
const privateKey = fs.readFileSync(resolved, 'utf8');

const now = Math.floor(Date.now() / 1000);
const exp = now + 180 * 24 * 60 * 60; // 180 days (regenerate before expiry; Apple allows up to ~6 months)

const secret = jwt.sign(
  {
    iss: teamId,
    iat: now,
    exp,
    aud: 'https://appleid.apple.com',
    sub: serviceId,
  },
  privateKey,
  { algorithm: 'ES256', keyid: keyId }
);

console.log(secret);
