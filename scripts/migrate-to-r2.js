#!/usr/bin/env node
/**
 * Wrapper: run R2 migration from repo root.
 * Implementation lives in apps/web/scripts/migrate-to-r2.js
 *
 *   node scripts/migrate-to-r2.js
 *   node scripts/migrate-to-r2.js --dry-run
 *   node scripts/migrate-to-r2.js --limit=50
 */

const { spawnSync } = require('child_process');
const path = require('path');

const webDir = path.join(__dirname, '..', 'apps', 'web');
const extra = process.argv.slice(2);
const result = spawnSync('npm', ['run', 'migrate-files', '--', ...extra], {
  cwd: webDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
