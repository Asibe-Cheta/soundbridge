/**
 * POST /api/admin/mfa/step-up — re-verify a fresh TOTP code right before a
 * sensitive admin action (bank-details reveal, payout execution,
 * manual-complete). On success, records a 10-minute step-up window in
 * admin_step_up_sessions (see src/lib/admin-mfa.ts). Only actually required
 * when ADMIN_MFA_STEP_UP_ENFORCED=true — this endpoint works either way, so
 * it can be wired up and tested before enforcement is switched on.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { decryptSecret } from '@/src/lib/encryption';
import { verifyTotpWithClockSkew, normalizeTotpCodeInput } from '@/src/lib/totp-verify';
import { recordFreshMfa } from '@/src/lib/admin-mfa';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }

  const body = await request.json().catch(() => ({}));
  const code = normalizeTotpCodeInput(String(body.code ?? ''));
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'A 6-digit code is required' }, { status: 400, headers: CORS });
  }

  const { data: secretRecord, error: fetchError } = await admin.serviceClient
    .from('two_factor_secrets')
    .select('encrypted_secret')
    .eq('user_id', admin.userId)
    .maybeSingle();

  if (fetchError || !secretRecord) {
    return NextResponse.json(
      { error: 'No 2FA enrolled on this account — set it up first.', code: 'NOT_ENROLLED' },
      { status: 404, headers: CORS },
    );
  }

  const decryptedSecret = decryptSecret(secretRecord.encrypted_secret);
  if (!verifyTotpWithClockSkew(decryptedSecret, code)) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 401, headers: CORS });
  }

  await recordFreshMfa(admin.serviceClient, admin.userId);

  return NextResponse.json({ success: true, valid_for_minutes: 10 }, { headers: CORS });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
