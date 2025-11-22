/**
 * DEBUG ENDPOINT - Remove after fixing 2FA
 * Tests if a secret can generate valid TOTP codes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import speakeasy from 'speakeasy';
import { decryptSecret } from '@/src/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { secret, code } = body;

    if (!secret || !code) {
      return NextResponse.json(
        { success: false, error: 'Secret and code required' },
        { status: 400 }
      );
    }

    // Try to verify with the provided secret
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: code,
      window: 4, // Large window for testing
      step: 30,
    });

    // Generate what the current code should be
    const currentCode = speakeasy.totp({
      secret: secret,
      encoding: 'base32',
      step: 30,
    });

    // Also check database secret
    const { data: secretRecord } = await supabase
      .from('two_factor_secrets')
      .select('encrypted_secret')
      .eq('user_id', user.id)
      .maybeSingle();

    let dbSecret = null;
    let dbCode = null;
    if (secretRecord) {
      try {
        dbSecret = decryptSecret(secretRecord.encrypted_secret);
        dbCode = speakeasy.totp({
          secret: dbSecret,
          encoding: 'base32',
          step: 30,
        });
      } catch (e) {
        // Ignore
      }
    }

    return NextResponse.json({
      success: true,
      test: {
        providedSecret: secret.substring(0, 12) + '...',
        providedCode: code,
        verified: verified,
        expectedCode: currentCode,
        secretLength: secret.length,
      },
      database: {
        hasSecret: !!secretRecord,
        dbCode: dbCode,
        dbSecretPrefix: dbSecret ? dbSecret.substring(0, 12) + '...' : null,
        secretsMatch: secret === dbSecret,
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

