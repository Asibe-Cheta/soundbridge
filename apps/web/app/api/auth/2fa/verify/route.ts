import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import speakeasy from 'speakeasy';
import { decryptSecret, encryptSecret } from '@/src/lib/encryption';
import { generateBackupCodesWithHashes } from '@/src/lib/backup-codes';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 2FA Verification API called');
    
    // Use the proper route client that handles both cookies and bearer tokens
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Parse the request body
    const body = await request.json();
    const { token, secret: clientSecret } = body; // Accept secret for backward compatibility

    // Validate input
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Verification code is required' },
        { status: 400 }
      );
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { success: false, error: 'Invalid code format. Must be 6 digits.' },
        { status: 400 }
      );
    }

    // Try to retrieve the encrypted secret from database first
    const { data: secretRecord, error: fetchError } = await supabase
      .from('two_factor_secrets')
      .select('encrypted_secret')
      .eq('user_id', user.id)
      .maybeSingle();

    let decryptedSecret: string;

    if (secretRecord && !fetchError) {
      // Secret exists in database - use it
      console.log('✅ Found secret in database');
      try {
        decryptedSecret = decryptSecret(secretRecord.encrypted_secret);
        console.log('✅ Secret decrypted from database');
      } catch (decryptError: any) {
        console.error('❌ Failed to decrypt secret from database:', decryptError);
        return NextResponse.json(
          { success: false, error: 'Failed to decrypt 2FA secret. Please start a fresh setup.' },
          { status: 500 }
        );
      }
    } else if (clientSecret && typeof clientSecret === 'string') {
      // Fallback: use secret from client (for backward compatibility during transition)
      console.log('⚠️ Using client-provided secret (fallback mode)');
      decryptedSecret = clientSecret;
      
      // Also store it in the database for future use
      try {
        const encryptedSecret = encryptSecret(clientSecret);
        await supabase
          .from('two_factor_secrets')
          .insert({
            user_id: user.id,
            encrypted_secret: encryptedSecret,
            method: 'totp',
          });
        console.log('✅ Stored client secret in database for future use');
      } catch (storeError) {
        console.warn('⚠️ Failed to store secret in database (continuing anyway):', storeError);
      }
    } else {
      // No secret found anywhere
      console.error('❌ No 2FA secret found in database or request');
      return NextResponse.json(
        { 
          success: false, 
          error: 'No 2FA setup found. Please click "Set Up Two-Factor Authentication" again to start fresh.' 
        },
        { status: 404 }
      );
    }

    // Verify the token
    console.log('🔍 Verifying TOTP code:', {
      userId: user.id,
      codeLength: token.length,
      secretLength: decryptedSecret.length,
      secretPrefix: decryptedSecret.substring(0, 8) + '...',
    });

    const verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time windows (±1 minute tolerance)
    });

    if (!verified) {
      console.error('❌ 2FA token verification failed for user:', user.id, {
        code: token,
        secretPrefix: decryptedSecret.substring(0, 8) + '...',
      });
      
      // Log failed verification
      await supabase
        .from('two_factor_audit_log')
        .insert({
          user_id: user.id,
          action: 'setup_verification_failed',
          method: 'totp',
          success: false,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent'),
        });
      
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    console.log('✅ 2FA token verified for user:', user.id);

    // Generate backup codes
    const { codes, hashes } = await generateBackupCodesWithHashes(8);

    // Store backup codes
    const backupCodeRecords = hashes.map(hash => ({
      user_id: user.id,
      code_hash: hash,
      used: false,
    }));

    const { error: backupCodesError } = await supabase
      .from('two_factor_backup_codes')
      .insert(backupCodeRecords);

    if (backupCodesError) {
      console.error('❌ Failed to store backup codes:', backupCodesError);
      return NextResponse.json(
        { success: false, error: 'Failed to store backup codes' },
        { status: 500 }
      );
    }

    // Log successful verification
    await supabase
      .from('two_factor_audit_log')
      .insert({
        user_id: user.id,
        action: 'enabled',
        method: 'totp',
        success: true,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
        metadata: {
          backup_codes_generated: codes.length,
        },
      });

    console.log('✅ 2FA setup completed successfully');

    return NextResponse.json({
      success: true,
      data: {
        backupCodes: codes, // Plain text codes - user must save these!
        message: 'Store these backup codes in a safe place. You won\'t see them again.',
      },
      message: '2FA verification successful'
    });

  } catch (error) {
    console.error('❌ 2FA verification error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
