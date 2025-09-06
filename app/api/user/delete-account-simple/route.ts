import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createServiceClient } from '@/src/lib/supabase';
import { cookies } from 'next/headers';

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Simple delete account request received');
    
    const supabase = createServerComponentClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Try to delete from the most essential tables only
    const deletions = [];

    // 1. Try to delete audio tracks
    try {
      console.log('🗑️ Attempting to delete audio tracks...');
      const { error: tracksError } = await supabase
        .from('audio_tracks')
        .delete()
        .eq('creator_id', user.id);
      
      if (tracksError) {
        console.log('⚠️ Could not delete audio tracks:', tracksError.message);
        deletions.push(`audio_tracks: ${tracksError.message}`);
      } else {
        console.log('✅ Successfully deleted audio tracks');
        deletions.push('audio_tracks: success');
      }
    } catch (err) {
      console.log('⚠️ Error deleting audio tracks:', err);
      deletions.push(`audio_tracks: ${err}`);
    }

    // 2. Try to delete events
    try {
      console.log('🗑️ Attempting to delete events...');
      const { error: eventsError } = await supabase
        .from('events')
        .delete()
        .eq('creator_id', user.id);
      
      if (eventsError) {
        console.log('⚠️ Could not delete events:', eventsError.message);
        deletions.push(`events: ${eventsError.message}`);
      } else {
        console.log('✅ Successfully deleted events');
        deletions.push('events: success');
      }
    } catch (err) {
      console.log('⚠️ Error deleting events:', err);
      deletions.push(`events: ${err}`);
    }

    // 3. Try to delete profile (most important)
    try {
      console.log('🗑️ Attempting to delete profile...');
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      
      if (profileError) {
        console.error('❌ Could not delete profile:', profileError.message);
        return NextResponse.json(
          { error: `Failed to delete profile: ${profileError.message}` },
          { status: 500 }
        );
      } else {
        console.log('✅ Successfully deleted profile');
        deletions.push('profile: success');
      }
    } catch (err) {
      console.error('❌ Error deleting profile:', err);
      return NextResponse.json(
        { error: `Failed to delete profile: ${err}` },
        { status: 500 }
      );
    }

    // 4. Try to delete from auth (optional)
    try {
      console.log('🗑️ Attempting to delete from auth...');
      const serviceSupabase = createServiceClient();
      const { error: deleteUserError } = await serviceSupabase.auth.admin.deleteUser(user.id);
      
      if (deleteUserError) {
        console.log('⚠️ Could not delete from auth:', deleteUserError.message);
        deletions.push(`auth: ${deleteUserError.message}`);
      } else {
        console.log('✅ Successfully deleted from auth');
        deletions.push('auth: success');
      }
    } catch (err) {
      console.log('⚠️ Error deleting from auth:', err);
      deletions.push(`auth: ${err}`);
    }

    console.log('✅ Account deletion completed with results:', deletions);
    
    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
      deletions: deletions
    });

  } catch (error) {
    console.error('❌ Unexpected error deleting account:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error}` },
      { status: 500 }
    );
  }
}
