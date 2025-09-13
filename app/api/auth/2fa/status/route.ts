import { NextRequest, NextResponse } from 'next/server';
import { createApiClientWithCookies } from '@/src/lib/supabase-api';

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 2FA Status API called');
    
    // Create a route handler client that can access cookies
    const supabase = await createApiClientWithCookies();

    // Get user from request cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Here you would check the database to see if 2FA is enabled for this user
    // For now, we'll return a default status
    // In a real implementation, you'd query your database for the user's 2FA status

    return NextResponse.json({
      success: true,
      enabled: false, // This would come from your database
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
    
    // Create a route handler client that can access cookies
    const supabase = await createApiClientWithCookies();

    // Get user from request cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser();
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

    // Here you would update the database to enable/disable 2FA for this user
    // For now, we'll just return success
    console.log(`✅ 2FA ${enabled ? 'enabled' : 'disabled'} for user:`, user.id);

    return NextResponse.json({
      success: true,
      enabled: enabled,
      message: `2FA ${enabled ? 'enabled' : 'disabled'} successfully`
    });

  } catch (error) {
    console.error('❌ 2FA enable/disable error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
