/**
 * Fresh-MFA ("step-up") gate for sensitive admin routes — bank-details
 * reveal, payout execution, manual-complete. Separate from requireAdmin,
 * which only checks role/is_admin and has no MFA concept at all.
 *
 * Kill-switch: ADMIN_MFA_STEP_UP_ENFORCED must be exactly 'true' for this to
 * block anything. Unset or any other value = inert (requireFreshMfa always
 * returns ok). Flip it on only after enrolling your own account via the
 * existing /api/user/2fa/setup-totp + verify-setup flow — there is no
 * separate "enrolled" flag to check; producing a valid code at step-up time
 * is itself the proof of enrollment.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const STEP_UP_WINDOW_MINUTES = 10;

export type FreshMfaResult = { ok: true } | { ok: false; status: number; error: string };

export function isAdminMfaEnforced(): boolean {
  return process.env.ADMIN_MFA_STEP_UP_ENFORCED === 'true';
}

export async function requireFreshMfa(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<FreshMfaResult> {
  if (!isAdminMfaEnforced()) {
    return { ok: true };
  }

  const { data, error } = await serviceClient
    .from('admin_step_up_sessions')
    .select('expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[admin-mfa] step-up lookup failed:', error);
    return { ok: false, status: 500, error: 'Could not verify MFA step-up status' };
  }

  if (!data || new Date(data.expires_at).getTime() <= Date.now()) {
    return { ok: false, status: 403, error: 'mfa_step_up_required' };
  }

  return { ok: true };
}

export async function recordFreshMfa(serviceClient: SupabaseClient, userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + STEP_UP_WINDOW_MINUTES * 60 * 1000).toISOString();
  await serviceClient.from('admin_step_up_sessions').upsert({
    user_id: userId,
    verified_at: new Date().toISOString(),
    expires_at: expiresAt,
  });
}
