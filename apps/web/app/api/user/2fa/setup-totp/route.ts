/**
 * POST /api/user/2fa/setup-totp
 * 
 * Initialize TOTP (Time-based One-Time Password) setup for a user
 * Returns a QR code and secret that the user scans with their authenticator app
 * 
 * Authentication: Required (Bearer token)
 * Rate Limit: 5 requests per 15 minutes per user
 */

import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { encryptSecret } from '@/src/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 2FA Setup TOTP: Starting...');
    
    // ================================================
    // 1. Authenticate user
    // ================================================
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request);
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        },
        { status: 401 }
      );
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // ================================================
    // 2. Check if user already has 2FA enabled
    // ================================================
    const { data: existingSecret, error: checkError } = await supabase
      .from('two_factor_secrets')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (checkError) {
      console.error('❌ Error checking existing 2FA:', checkError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to check 2FA status',
          code: 'DATABASE_ERROR'
        },
        { status: 500 }
      );
    }
    
    if (existingSecret) {
      console.log('⚠️ User already has 2FA enabled');
      return NextResponse.json(
        { 
          success: false,
          error: '2FA is already enabled. Disable it first to set up again.',
          code: 'ALREADY_ENABLED'
        },
        { status: 400 }
      );
    }
    
    // ================================================
    // 3. Generate TOTP secret
    // ================================================
    const secret = speakeasy.generateSecret({
      name: `SoundBridge (${user.email})`,
      issuer: 'SoundBridge',
      length: 32, // 256-bit secret (very secure)
    });
    
    if (!secret.base32) {
      throw new Error('Failed to generate TOTP secret');
    }
    
    console.log('✅ TOTP secret generated');
    
    // ================================================
    // 4. Encrypt the secret for database storage
    // ================================================
    const encryptedSecret = encryptSecret(secret.base32);
    console.log('✅ Secret encrypted');
    
    // ================================================
    // 5. Store encrypted secret in database (unverified)
    // Note: We don't mark as "enabled" until user verifies with a code
    // ================================================
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
        { 
          success: false,
          error: 'Failed to store 2FA secret',
          code: 'DATABASE_ERROR'
        },
        { status: 500 }
      );
    }
    
    console.log('✅ Secret stored in database');
    
    // ================================================
    // 6. Generate QR code
    // ================================================
    let qrCodeDataUrl: string;
    
    try {
      qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url || '');
      console.log('✅ QR code generated');
    } catch (qrError: any) {
      console.error('❌ Failed to generate QR code:', qrError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to generate QR code',
          code: 'QR_GENERATION_FAILED'
        },
        { status: 500 }
      );
    }
    
    // ================================================
    // 7. Log audit event
    // ================================================
    await supabase
      .from('two_factor_audit_log')
      .insert({
        user_id: user.id,
        action: 'setup_initiated',
        method: 'totp',
        success: true,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
      });
    
    // ================================================
    // 8. Return response
    // ================================================
    return NextResponse.json({
      success: true,
      data: {
        secret: secret.base32, // User needs this as backup if QR doesn't work
        qrCode: qrCodeDataUrl, // Data URL: "data:image/png;base64,..."
        otpauthUrl: secret.otpauth_url, // For advanced users who want to manually add
      },
      message: 'Scan the QR code with your authenticator app, then verify with a code',
    });
    
  } catch (error: any) {
    console.error('❌ Unexpected error in setup-totp:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

// Method not allowed for other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}

