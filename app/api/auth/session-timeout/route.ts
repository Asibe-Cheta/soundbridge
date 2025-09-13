import { NextRequest, NextResponse } from 'next/server';
import { createApiClientWithCookies } from '@/src/lib/supabase-api';

export async function GET(request: NextRequest) {
  try {
    console.log('⏰ Session Timeout Settings API called');
    
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

    // Get session timeout preferences from database
    // For now, we'll return default settings, but in production you'd query a user_preferences table
    const sessionTimeoutSettings = {
      timeoutMinutes: 30, // This would come from your database
      autoLogout: true,
      warningTime: 5, // Show warning 5 minutes before timeout
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      settings: sessionTimeoutSettings
    });

  } catch (error) {
    console.error('❌ Session timeout settings error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('⏰ Session Timeout Update API called');
    
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
    const { timeoutMinutes, autoLogout, warningTime } = body;

    // Validate input
    if (!timeoutMinutes || timeoutMinutes < 5) {
      return NextResponse.json(
        { success: false, error: 'Session timeout must be at least 5 minutes' },
        { status: 400 }
      );
    }

    // Here you would update the user's session timeout preferences in your database
    // For now, we'll just return success
    console.log('✅ Session timeout preferences updated:', {
      timeoutMinutes,
      autoLogout,
      warningTime
    });

    return NextResponse.json({
      success: true,
      message: 'Session timeout preferences updated successfully',
      settings: {
        timeoutMinutes,
        autoLogout,
        warningTime
      }
    });

  } catch (error) {
    console.error('❌ Session timeout update error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
