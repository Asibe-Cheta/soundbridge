import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 2FA Status API called');
    
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

    // Check if 2FA is enabled by checking for a secret in the database
    const { data: secret, error: secretError } = await supabase
      .from('two_factor_secrets')
      .select('id, method, created_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (secretError) {
      console.error('❌ Error checking 2FA status:', secretError);
      return NextResponse.json(
        { success: false, error: 'Failed to check 2FA status' },
        { status: 500 }
      );
    }

    const isEnabled = !!secret;

    return NextResponse.json({
      success: true,
      enabled: isEnabled,
      message: '2FA status retrieved'
    });

  } catch (error) {
    console.error('❌ 2FA status error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 2FA Enable/Disable API called');
    
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
    const { enabled } = body;

    // Note: This endpoint doesn't actually enable/disable 2FA
    // 2FA is enabled when the user verifies their code during setup
    // This endpoint is just for status updates (legacy compatibility)
    console.log(`✅ 2FA status update requested: ${enabled ? 'enabled' : 'disabled'} for user:`, user.id);

    return NextResponse.json({
      success: true,
      enabled: enabled,
      message: `2FA status updated successfully`
    });

  } catch (error) {
    console.error('❌ 2FA enable/disable error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
