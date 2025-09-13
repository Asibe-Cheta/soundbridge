import { NextRequest, NextResponse } from 'next/server';
import { createApiClientWithCookies } from '@/src/lib/supabase-api';

export async function GET(request: NextRequest) {
  try {
    console.log('🔔 Login Alerts Status API called');
    
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

    // Get login alerts settings from database
    const { data: preferences, error: preferencesError } = await supabase
      .from('user_login_alerts_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (preferencesError && preferencesError.code !== 'PGRST116') {
      console.error('❌ Error fetching login alerts preferences:', preferencesError);
      // Return default settings if there's an error
      const defaultSettings = {
        enabled: true,
        emailNotifications: true,
        pushNotifications: true,
        lastLogin: new Date().toISOString()
      };
      
      return NextResponse.json({
        success: true,
        settings: defaultSettings
      });
    }

    const loginAlertsSettings = {
      enabled: preferences?.login_alerts_enabled ?? true,
      emailNotifications: preferences?.email_notifications ?? true,
      pushNotifications: preferences?.push_notifications ?? true,
      lastLogin: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      settings: loginAlertsSettings
    });

  } catch (error) {
    console.error('❌ Login alerts status error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Login Alerts Update API called');
    
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
    const { enabled, emailNotifications, pushNotifications } = body;

    // Update login alerts preferences in database
    const { data: updatedPreferences, error: updateError } = await supabase
      .from('user_login_alerts_preferences')
      .upsert({
        user_id: user.id,
        login_alerts_enabled: enabled,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating login alerts preferences:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update login alerts preferences' },
        { status: 500 }
      );
    }

    console.log('✅ Login alerts preferences updated:', {
      enabled,
      emailNotifications,
      pushNotifications
    });

    return NextResponse.json({
      success: true,
      message: 'Login alerts preferences updated successfully',
      settings: {
        enabled,
        emailNotifications,
        pushNotifications
      }
    });

  } catch (error) {
    console.error('❌ Login alerts update error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
