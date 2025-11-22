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

    // Prioritize client-provided secret if available (this is what the user's authenticator app is using)
    // Only fall back to database secret if client secret is not provided
    let decryptedSecret: string;
    let secretSource: 'client' | 'database';

    if (clientSecret && typeof clientSecret === 'string') {
      // Use client-provided secret (this matches what the user scanned in their authenticator app)
      console.log('✅ Using client-provided secret (matches authenticator app)');
      decryptedSecret = clientSecret;
      secretSource = 'client';
      
      // Also update the database with this secret (in case it's different from what's stored)
      try {
        const encryptedSecret = encryptSecret(clientSecret);
        // Delete any existing secret first
        await supabase
          .from('two_factor_secrets')
          .delete()
          .eq('user_id', user.id);
        
        // Insert the new secret
        await supabase
          .from('two_factor_secrets')
          .insert({
            user_id: user.id,
            encrypted_secret: encryptedSecret,
            method: 'totp',
          });
        console.log('✅ Updated database with client secret');
      } catch (storeError) {
        console.warn('⚠️ Failed to update secret in database (continuing anyway):', storeError);
      }
    } else {
      // Fallback: try to retrieve from database
      const { data: secretRecord, error: fetchError } = await supabase
        .from('two_factor_secrets')
        .select('encrypted_secret')
        .eq('user_id', user.id)
        .maybeSingle();

      if (secretRecord && !fetchError) {
        console.log('✅ Found secret in database (no client secret provided)');
        try {
          decryptedSecret = decryptSecret(secretRecord.encrypted_secret);
          secretSource = 'database';
          console.log('✅ Secret decrypted from database');
        } catch (decryptError: any) {
          console.error('❌ Failed to decrypt secret from database:', decryptError);
          return NextResponse.json(
            { success: false, error: 'Failed to decrypt 2FA secret. Please start a fresh setup.' },
            { status: 500 }
          );
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
    }

    // Verify the token
    console.log('🔍 Verifying TOTP code:', {
      userId: user.id,
      code: token,
      codeLength: token.length,
      secretLength: decryptedSecret.length,
      secretSource: secretSource,
      secretPrefix: decryptedSecret.substring(0, 12) + '...',
      secretSuffix: '...' + decryptedSecret.substring(decryptedSecret.length - 8),
    });

    // Generate what the current code should be for debugging
    const currentCode = speakeasy.totp({
      secret: decryptedSecret,
      encoding: 'base32',
      step: 30,
    });
    
    console.log('🔍 Current expected TOTP code:', currentCode);

    // Try to verify with multiple time windows for better tolerance
    const verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: token,
      window: 2, // Allow 2 time windows (±1 minute tolerance)
      step: 30, // 30-second time steps (standard)
    });

    // If verification fails, try with a larger window (for clock skew)
    let verifiedWithLargeWindow = false;
    if (!verified) {
      console.log('⚠️ Initial verification failed, trying with larger window...');
      verifiedWithLargeWindow = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: 'base32',
        token: token,
        window: 4, // Allow 4 time windows (±2 minutes tolerance)
        step: 30,
      });
    }

    const isVerified = verified || verifiedWithLargeWindow;

    if (!isVerified) {
      console.error('❌ 2FA token verification failed for user:', user.id, {
        providedCode: token,
        expectedCode: currentCode,
        secretLength: decryptedSecret.length,
        secretPrefix: decryptedSecret.substring(0, 12) + '...',
        timeWindow: verified ? 'standard' : verifiedWithLargeWindow ? 'large' : 'none',
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
        { 
          success: false, 
          error: 'Invalid verification code. Please make sure you\'re using the current code from your authenticator app.',
          code: 'INVALID_CODE'
        },
        { status: 400 }
      );
    }

    console.log('✅ 2FA token verified for user:', user.id, {
      usedLargeWindow: !verified && verifiedWithLargeWindow,
    });

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
