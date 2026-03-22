/**
 * Read Wise USD available balance for the configured profile (batch / payouts funding).
 * Tries GET /v1/borderless-accounts?profileId= (per ops runbook), then v4 balances API.
 */

import { getWiseClient } from './client';
import { wiseConfig } from './config';

async function resolveWiseProfileId(): Promise<number> {
  const fromConfig = wiseConfig().profileId;
  if (fromConfig) return fromConfig;
  const client = getWiseClient();
  const profiles = await client.get<Array<{ id: number }>>('/v1/profiles');
  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new Error('Wise profile required. Set WISE_PROFILE_ID.');
  }
  return profiles[0].id;
}

function readUsdAmountFromBalanceEntry(entry: Record<string, unknown>): number | null {
  const cur = String(entry.currency ?? '').toUpperCase();
  if (cur !== 'USD') return null;
  const amt = entry.amount;
  if (amt && typeof amt === 'object' && amt !== null && 'value' in amt) {
    const v = (amt as { value?: unknown }).value;
    const n = typeof v === 'string' ? parseFloat(v) : Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof amt === 'number' && Number.isFinite(amt)) return amt;
  return null;
}

/** borderless-accounts: array of accounts with balances[] */
function extractUsdFromBorderless(data: unknown): number | null {
  if (!Array.isArray(data)) return null;
  for (const acc of data) {
    if (!acc || typeof acc !== 'object') continue;
    const balances = (acc as { balances?: unknown }).balances;
    if (!Array.isArray(balances)) continue;
    for (const b of balances) {
      if (b && typeof b === 'object') {
        const n = readUsdAmountFromBalanceEntry(b as Record<string, unknown>);
        if (n != null) return n;
      }
    }
  }
  return null;
}

/** v4 GET /v4/profiles/{id}/balances — array of balance objects */
function extractUsdFromV4(data: unknown): number | null {
  if (!Array.isArray(data)) return null;
  for (const row of data) {
    if (row && typeof row === 'object') {
      const n = readUsdAmountFromBalanceEntry(row as Record<string, unknown>);
      if (n != null) return n;
    }
  }
  return null;
}

export type WiseUsdBalanceResult =
  | { ok: true; usdAmount: number; profileId: number; source: 'borderless' | 'v4' }
  | { ok: false; error: string; profileId?: number };

/**
 * Available USD in the Wise balance (multi-currency account), for admin dashboard.
 */
export async function getWiseUsdAvailableBalance(): Promise<WiseUsdBalanceResult> {
  let profileId: number;
  try {
    profileId = await resolveWiseProfileId();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Wise profile not configured';
    return { ok: false, error: msg };
  }

  const client = getWiseClient();

  try {
    const borderless = await client.get<unknown>(`/v1/borderless-accounts?profileId=${profileId}`);
    const usd = extractUsdFromBorderless(borderless);
    if (usd != null) return { ok: true, usdAmount: usd, profileId, source: 'borderless' };
  } catch (e) {
    console.warn('[Wise] borderless-accounts failed, trying v4 balances', e);
  }

  try {
    const v4 = await client.get<unknown>(`/v4/profiles/${profileId}/balances?types=STANDARD`);
    const usd = extractUsdFromV4(v4);
    if (usd != null) return { ok: true, usdAmount: usd, profileId, source: 'v4' };
  } catch (e) {
    console.warn('[Wise] v4 balances failed', e);
  }

  return {
    ok: false,
    error:
      'Could not read USD balance from Wise (borderless-accounts and v4 balances both failed). Check token scopes and WISE_PROFILE_ID.',
    profileId,
  };
}
