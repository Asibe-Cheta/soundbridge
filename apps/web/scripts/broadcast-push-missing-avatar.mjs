#!/usr/bin/env node
/**
 * One-time broadcast: Expo push to users with push token, no avatar, onboarding complete.
 *
 * Run from apps/web (uses this package's node_modules):
 *   npm run push:broadcast-missing-avatar:dry
 *   npm run push:broadcast-missing-avatar
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * EXPO_ACCESS_TOKEN required for live send only (dry-run can omit it).
 */

import { createClient } from '@supabase/supabase-js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;
const PAGE_SIZE = 1000;

function isBlankAvatar(avatarUrl) {
  if (avatarUrl == null) return true;
  if (typeof avatarUrl !== 'string') return true;
  return avatarUrl.trim() === '';
}

function isExpoPushToken(token) {
  return typeof token === 'string' && token.startsWith('ExponentPushToken[');
}

async function fetchAllTargets(supabase) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, expo_push_token, avatar_url')
      .not('expo_push_token', 'is', null)
      .eq('onboarding_completed', true)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Supabase: ${error.message}`);
    if (!data?.length) break;

    for (const row of data) {
      if (!isBlankAvatar(row.avatar_url)) continue;
      if (!row.expo_push_token) continue;
      rows.push({ id: row.id, expo_push_token: row.expo_push_token });
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

function buildMessages(targets) {
  const messages = [];
  const skipped = [];
  for (const { id, expo_push_token } of targets) {
    if (!isExpoPushToken(expo_push_token)) {
      skipped.push({ id, reason: 'invalid_token_format' });
      continue;
    }
    messages.push({
      to: expo_push_token,
      title: 'Your profile is missing something',
      body: 'Creators with profile photos get 3x more follows, tips and gig requests. Add yours now — it takes 10 seconds.',
      data: {
        type: 'profile_setup',
        url: `soundbridge://profile/${id}`,
      },
      sound: 'default',
    });
  }
  return { messages, skipped };
}

async function sendBatch(token, batch) {
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(batch),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`Expo HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  return json;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const expoToken = process.env.EXPO_ACCESS_TOKEN?.trim();

  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('Loading targets…');
  const targets = await fetchAllTargets(supabase);
  const { messages, skipped } = buildMessages(targets);

  console.log(`Targets (raw rows matching filters): ${targets.length}`);
  console.log(`Valid Expo messages: ${messages.length}`);
  if (skipped.length) console.log(`Skipped invalid tokens: ${skipped.length}`);

  if (dryRun) {
    console.log('\nDRY_RUN — not sending. Sample payloads:');
    console.log(JSON.stringify(messages.slice(0, 3), null, 2));
    process.exit(0);
  }

  if (messages.length === 0) {
    console.log('Nothing to send.');
    process.exit(0);
  }

  if (!expoToken) {
    console.error('Missing EXPO_ACCESS_TOKEN (required for live send)');
    process.exit(1);
  }

  let sent = 0;
  const errors = [];

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const batchNo = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(messages.length / BATCH_SIZE);
    process.stdout.write(`Sending batch ${batchNo}/${totalBatches} (${batch.length} messages)… `);
    try {
      const result = await sendBatch(expoToken, batch);
      sent += batch.length;
      const tickets = result?.data ?? result;
      const errs = Array.isArray(tickets)
        ? tickets.filter((t) => t?.status === 'error')
        : [];
      if (errs.length) {
        console.log(`done (${errs.length} ticket errors in batch)`);
        errors.push(...errs.map((e) => e?.message || e));
      } else {
        console.log('ok');
      }
    } catch (e) {
      console.log('FAILED');
      console.error(e);
      process.exit(1);
    }
  }

  console.log(`\nFinished. Sent ${sent} notification(s).`);
  if (errors.length) {
    console.warn('Some ticket errors:', errors.slice(0, 20));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
