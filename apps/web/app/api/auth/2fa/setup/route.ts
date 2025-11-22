import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { encryptSecret } from '@/src/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 2FA Setup API called');
    
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

    // Check if user already has 2FA setup
    const { data: existingSecret } = await supabase
      .from('two_factor_secrets')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    // If a secret exists, delete it to allow fresh setup
    // This handles cases where setup was started but never completed
    if (existingSecret) {
      console.log('⚠️ Existing 2FA secret found, deleting to allow fresh setup...');
      
      // Delete existing secret
      await supabase
        .from('two_factor_secrets')
        .delete()
        .eq('user_id', user.id);
      
      // Also delete any backup codes (they're invalid if secret is being reset)
      await supabase
        .from('two_factor_backup_codes')
        .delete()
        .eq('user_id', user.id);
      
      console.log('✅ Cleared existing 2FA data for fresh setup');
    }

    // Generate a secret key for the user
    const secret = speakeasy.generateSecret({
      name: `SoundBridge (${user.email})`,
      issuer: 'SoundBridge',
      length: 32
    });

    if (!secret.base32) {
      throw new Error('Failed to generate TOTP secret');
    }

    // Encrypt and store the secret in the database
    const encryptedSecret = encryptSecret(secret.base32);

    const { error: insertError } = await supabase
      .from('two_factor_secrets')
      .insert({
        user_id: user.id,
        encrypted_secret: encryptedSecret,
        method: 'totp',
      });

    if (insertError) {
      console.error('❌ Failed to store 2FA secret:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to store 2FA secret' },
        { status: 500 }
      );
    }

    // Generate QR code data URL
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // CRITICAL: Extract and verify the secret from otpauth_url
    // The QR code uses the secret from the URL, so we MUST use the same one
    const otpauthMatch = secret.otpauth_url?.match(/secret=([A-Z2-7=]+)/);
    const secretFromUrl = otpauthMatch ? otpauthMatch[1] : null;
    
    // Use the secret from the URL (what's actually in the QR code) as the source of truth
    // If URL secret exists and differs, prefer it; otherwise use base32
    const secretToUse = secretFromUrl || secret.base32;
    
    // Remove padding from both for comparison
    const base32NoPadding = secret.base32?.replace(/=+$/, '') || '';
    const urlSecretNoPadding = secretFromUrl?.replace(/=+$/, '') || '';
    const secretsMatch = base32NoPadding === urlSecretNoPadding;
    
    console.log('✅ 2FA secret generated and stored for user:', user.id, {
      base32Length: secret.base32?.length,
      base32Prefix: secret.base32?.substring(0, 12) + '...',
      base32Full: secret.base32,
      otpauthUrlSecret: secretFromUrl ? secretFromUrl.substring(0, 12) + '...' : 'not found',
      otpauthUrlFull: secretFromUrl,
      secretToUsePrefix: secretToUse.substring(0, 12) + '...',
      secretToUseFull: secretToUse,
      secretsMatch: secretsMatch,
      otpauthUrl: secret.otpauth_url,
    });

    if (!secretsMatch && secretFromUrl) {
      console.warn('⚠️ Secret mismatch detected! Using URL secret (from QR code) instead of base32.');
      console.warn('Base32 secret:', secret.base32);
      console.warn('URL secret:', secretFromUrl);
      
      // Update the database with the URL secret (what's actually in the QR code)
      const encryptedUrlSecret = encryptSecret(secretFromUrl);
      await supabase
        .from('two_factor_secrets')
        .update({ encrypted_secret: encryptedUrlSecret })
        .eq('user_id', user.id);
      console.log('✅ Updated database with URL secret');
    }

    // Generate a test code to verify the secret works
    const testCode = speakeasy.totp({
      secret: secretToUse,
      encoding: 'base32',
      step: 30,
    });
    console.log('🔍 Test code generated with secretToUse:', testCode);

    return NextResponse.json({
      success: true,
      secret: secretToUse, // Return the secret that's actually in the QR code
      qrCode: qrCodeUrl,
      manualEntryKey: secretToUse
    });

  } catch (error) {
    console.error('❌ 2FA setup error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
