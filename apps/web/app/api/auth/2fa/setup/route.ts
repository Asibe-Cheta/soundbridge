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

    if (existingSecret) {
      return NextResponse.json(
        { success: false, error: '2FA is already enabled. Disable it first to set up again.' },
        { status: 400 }
      );
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

    console.log('✅ 2FA secret generated and stored for user:', user.id);

    return NextResponse.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    });

  } catch (error) {
    console.error('❌ 2FA setup error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
