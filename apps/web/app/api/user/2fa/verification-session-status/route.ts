/**
 * POST /api/user/2fa/verification-session-status
 * Lightweight check: does this pending 2FA verification session still exist and allow code entry?
 * Used by /login to clear stale sessionStorage after DB resets or expiry.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionToken = body.sessionToken as string | undefined;
    const verificationSessionId = body.verificationSessionId as string | undefined;

    if (!sessionToken && !verificationSessionId) {
      return NextResponse.json({ valid: false, reason: 'missing_identifier' });
    }

    const admin = createServiceClient();
    let session: {
      id: string;
      expires_at: string;
      verified: boolean;
      locked_until: string | null;
    } | null = null;

    if (verificationSessionId) {
      const { data } = await admin
        .from('two_factor_verification_sessions')
        .select('id, expires_at, verified, locked_until')
        .eq('id', String(verificationSessionId).trim())
        .maybeSingle();
      session = data;
    } else if (sessionToken && looksLikeUuid(String(sessionToken))) {
      const { data } = await admin
        .from('two_factor_verification_sessions')
        .select('id, expires_at, verified, locked_until')
        .eq('id', String(sessionToken).trim())
        .maybeSingle();
      session = data;
    } else if (sessionToken) {
      const { data } = await admin
        .from('two_factor_verification_sessions')
        .select('id, expires_at, verified, locked_until')
        .eq('session_token', String(sessionToken).trim())
        .maybeSingle();
      session = data;
    }

    if (!session) {
      return NextResponse.json({ valid: false, reason: 'not_found' });
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, reason: 'expired' });
    }

    if (session.verified) {
      return NextResponse.json({ valid: false, reason: 'already_verified' });
    }

    return NextResponse.json({ valid: true });
  } catch (e) {
    console.error('verification-session-status:', e);
    return NextResponse.json({ valid: false, reason: 'error' }, { status: 500 });
  }
}
