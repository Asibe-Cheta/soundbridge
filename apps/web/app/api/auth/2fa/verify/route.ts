import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import speakeasy from 'speakeasy';

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
    const { token, secret } = body;

    // Validate input
    if (!token || !secret) {
      return NextResponse.json(
        { success: false, error: 'Token and secret are required' },
        { status: 400 }
      );
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps of tolerance
    });

    if (!verified) {
      console.error('❌ 2FA token verification failed for user:', user.id);
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    console.log('✅ 2FA token verified for user:', user.id);

    // Here you would typically store the 2FA secret in your database
    // and mark 2FA as enabled for this user
    // For now, we'll just return success

    return NextResponse.json({
      success: true,
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
