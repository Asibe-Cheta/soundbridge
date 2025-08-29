// Script to update existing tracks with artist names from creator profiles
const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = 'https://aunxdbqukbxyyiusaeqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0NzQ5NzQsImV4cCI6MjA1MTA1MDk3NH0.aunxdbqukbxyyiusaeqi';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateArtistNames() {
  try {
    console.log('🔧 Updating artist names for existing tracks...\n');
    
    // First, get all tracks that have NULL artist_name
    const { data: tracks, error: tracksError } = await supabase
      .from('audio_tracks')
      .select('id, creator_id, title')
      .is('artist_name', null);

    if (tracksError) {
      console.error('❌ Error fetching tracks:', tracksError);
      return;
    }

    console.log(`📊 Found ${tracks.length} tracks with NULL artist_name\n`);

    if (tracks.length === 0) {
      console.log('✅ All tracks already have artist names!');
      return;
    }

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
        // Set a default artist name
        const { error: updateError } = await supabase
          .from('audio_tracks')
          .update({ artist_name: 'Unknown Artist' })
          .eq('id', track.id);
        
        if (updateError) {
          console.log(`   ❌ Failed to update track: ${updateError.message}`);
        } else {
          console.log(`   ✅ Updated to: Unknown Artist`);
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
      }
    }

    console.log('\n🎉 Artist name update completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateArtistNames();
