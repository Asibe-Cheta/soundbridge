import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    console.log('🔧 Updating artist names for existing tracks...');
    
    // First, get all tracks that have NULL artist_name, empty artist_name, or "Unknown Artist"
    const { data: tracks, error: tracksError } = await supabase
      .from('audio_tracks')
      .select('id, creator_id, title, artist_name')
      .or('artist_name.is.null,artist_name.eq.,artist_name.eq.Unknown Artist');

    if (tracksError) {
      console.error('❌ Error fetching tracks:', tracksError);
      return NextResponse.json(
        { error: 'Failed to fetch tracks', details: tracksError.message },
        { status: 500 }
      );
    }

    console.log(`📊 Found ${tracks?.length || 0} tracks with missing artist names`);

    if (!tracks || tracks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All tracks already have artist names!',
        updated: 0
      });
    }

    let updatedCount = 0;

    // For each track, get the creator's profile and update the artist_name
    for (const track of tracks) {
      console.log(`🎵 Processing track: ${track.title}`);
      
      // Get the creator's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, full_name, username')
        .eq('id', track.creator_id)
        .single();

      if (profileError) {
        console.log(`   ⚠️  Could not find profile for creator ${track.creator_id}`);
        
        // Try to get the auth user data to create a profile or use their info
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(track.creator_id);
        
        if (authError || !authUser.user) {
          console.log(`   ⚠️  Could not find auth user for creator ${track.creator_id}`);
          // Set a default artist name
          const { error: updateError } = await supabase
            .from('audio_tracks')
            .update({ artist_name: 'Unknown Artist' })
            .eq('id', track.id);
          
          if (updateError) {
            console.log(`   ❌ Failed to update track: ${updateError.message}`);
          } else {
            console.log(`   ✅ Updated to: Unknown Artist`);
            updatedCount++;
          }
          continue;
        }
        
        // Use auth user data to create artist name
        const userEmail = authUser.user.email || '';
        const userMetadata = authUser.user.user_metadata || {};
        const artistName = userMetadata.full_name || 
                          userMetadata.display_name || 
                          userEmail.split('@')[0] || 
                          'Unknown Artist';
        
        console.log(`   👤 Using auth user data: ${artistName}`);
        
        // Update the track with the artist name from auth user
        const { error: updateError } = await supabase
          .from('audio_tracks')
          .update({ artist_name: artistName })
          .eq('id', track.id);

        if (updateError) {
          console.log(`   ❌ Failed to update track: ${updateError.message}`);
        } else {
          console.log(`   ✅ Updated successfully to: ${artistName}`);
          updatedCount++;
        }
        continue;
      }

      // Use display_name, full_name, or username as artist name
      const artistName = profile.display_name || profile.full_name || profile.username || 'Unknown Artist';
      
      console.log(`   👤 Creator: ${artistName}`);
      
      // Update the track with the artist name
      const { error: updateError } = await supabase
        .from('audio_tracks')
        .update({ artist_name: artistName })
        .eq('id', track.id);

      if (updateError) {
        console.log(`   ❌ Failed to update track: ${updateError.message}`);
      } else {
        console.log(`   ✅ Updated successfully`);
        updatedCount++;
      }
    }

    console.log(`\n🎉 Artist name update completed! Updated ${updatedCount} tracks.`);

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} tracks with artist names`,
      updated: updatedCount
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
