import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('⚙️ Admin Settings API called');
    
    const supabase = createServiceClient();

    // Get system settings
    const { data: settings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('*')
      .single() as { data: any; error: any };

    if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error fetching settings:', settingsError);
    }

    // Get system statistics
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: totalTracks } = await supabase
      .from('audio_tracks')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    const { count: totalEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    const { count: pendingReviews } = await supabase
      .from('admin_review_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get database size (approximate)
    const { data: dbStats } = await supabase
      .rpc('get_database_stats') as { data: any };

    const settingsData = {
      system: {
        maintenance_mode: settings?.maintenance_mode || false,
        auto_moderation: settings?.auto_moderation || false,
        email_notifications: settings?.email_notifications || true,
        max_file_size: settings?.max_file_size || 50, // MB
        allowed_file_types: settings?.allowed_file_types || ['mp3', 'wav', 'flac'],
        max_users_per_event: settings?.max_users_per_event || 1000,
        content_retention_days: settings?.content_retention_days || 365,
        auto_delete_inactive_users: settings?.auto_delete_inactive_users || false,
        inactive_user_threshold_days: settings?.inactive_user_threshold_days || 365
      },
      statistics: {
        total_users: totalUsers || 0,
        total_tracks: totalTracks || 0,
        total_events: totalEvents || 0,
        pending_reviews: pendingReviews || 0,
        database_size_mb: dbStats?.database_size_mb || 0,
        last_backup: settings?.last_backup || null,
        system_uptime: settings?.system_uptime || '99.9%'
      },
      features: {
        user_registration: settings?.user_registration || true,
        content_upload: settings?.content_upload || true,
        event_creation: settings?.event_creation || true,
        messaging: settings?.messaging || true,
        social_features: settings?.social_features || true,
        monetization: settings?.monetization || true
      }
    };

    console.log('✅ Settings data fetched successfully');

    return NextResponse.json({
      success: true,
      data: settingsData
    });

  } catch (error: any) {
    console.error('❌ Error fetching settings data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('⚙️ Admin Settings Update API called');
    
    const body = await request.json();
    const { settings } = body;

    const supabase = createServiceClient();

    // Update or create settings
    const { data: updatedSettings, error: updateError } = await supabase
      .from('admin_settings')
      .upsert({
        id: 1, // Single settings record
        ...settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating settings:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    console.log('✅ Settings updated successfully');

    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: 'Settings updated successfully'
    });

  } catch (error: any) {
    console.error('❌ Error updating settings:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
