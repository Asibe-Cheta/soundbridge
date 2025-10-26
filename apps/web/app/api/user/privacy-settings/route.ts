import { NextRequest, NextResponse } from 'next/server';
import { createApiClientWithCookies } from '@/src/lib/supabase-api';

export async function GET(request: NextRequest) {
  try {
    console.log('🔒 Privacy Settings GET API called');
    
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

    // Get privacy settings from database
    const { data: privacySettings, error: privacyError } = await supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', user.id as any)
      .single() as { data: any; error: any };

    if (privacyError && privacyError.code !== 'PGRST116') {
      console.error('❌ Error fetching privacy settings:', privacyError);
      // Return default settings if there's an error
      const defaultSettings = {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
        allowMessages: 'everyone',
        allowComments: 'everyone',
        showOnlineStatus: true,
        showListeningActivity: true
      };
      
      return NextResponse.json({
        success: true,
        settings: defaultSettings
      });
    }

    const settings = privacySettings ? {
      profileVisibility: privacySettings.profile_visibility || 'public',
      showEmail: privacySettings.show_email || false,
      showPhone: privacySettings.show_phone || false,
      allowMessages: privacySettings.allow_messages || 'everyone',
      allowComments: privacySettings.allow_comments || 'everyone',
      showOnlineStatus: privacySettings.show_online_status !== false,
      showListeningActivity: privacySettings.show_listening_activity !== false
    } : {
      profileVisibility: 'public',
      showEmail: false,
      showPhone: false,
      allowMessages: 'everyone',
      allowComments: 'everyone',
      showOnlineStatus: true,
      showListeningActivity: true
    };

    return NextResponse.json({
      success: true,
      settings: settings
    });

  } catch (error) {
    console.error('❌ Privacy settings GET error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔒 Privacy Settings POST API called');
    
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
    const { 
      profileVisibility, 
      showEmail, 
      showPhone, 
      allowMessages, 
      allowComments, 
      showOnlineStatus, 
      showListeningActivity 
    } = body;

    // Validate input
    if (profileVisibility && !['public', 'private', 'followers'].includes(profileVisibility)) {
      return NextResponse.json(
        { success: false, error: 'Invalid profile visibility setting' },
        { status: 400 }
      );
    }

    if (allowMessages && !['everyone', 'followers', 'creators_only', 'none'].includes(allowMessages)) {
      return NextResponse.json(
        { success: false, error: 'Invalid messaging privacy setting' },
        { status: 400 }
      );
    }

    if (allowComments && !['everyone', 'followers', 'none'].includes(allowComments)) {
      return NextResponse.json(
        { success: false, error: 'Invalid comments privacy setting' },
        { status: 400 }
      );
    }

    // Update privacy settings in database
    const { data: updatedSettings, error: updateError } = await (supabase
      .from('user_privacy_settings') as any)
      .upsert({
        user_id: user.id,
        profile_visibility: profileVisibility,
        show_email: showEmail,
        show_phone: showPhone,
        allow_messages: allowMessages,
        allow_comments: allowComments,
        show_online_status: showOnlineStatus,
        show_listening_activity: showListeningActivity,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating privacy settings:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update privacy settings' },
        { status: 500 }
      );
    }

    console.log('✅ Privacy settings updated:', {
      profileVisibility,
      showEmail,
      showPhone,
      allowMessages,
      allowComments,
      showOnlineStatus,
      showListeningActivity
    });

    return NextResponse.json({
      success: true,
      message: 'Privacy settings updated successfully',
      settings: {
        profileVisibility: updatedSettings.profile_visibility,
        showEmail: updatedSettings.show_email,
        showPhone: updatedSettings.show_phone,
        allowMessages: updatedSettings.allow_messages,
        allowComments: updatedSettings.allow_comments,
        showOnlineStatus: updatedSettings.show_online_status,
        showListeningActivity: updatedSettings.show_listening_activity
      }
    });

  } catch (error) {
    console.error('❌ Privacy settings POST error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
