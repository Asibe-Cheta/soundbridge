const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateCoverArt() {
  try {
    console.log('🔍 Fetching tracks without cover art...');
    
    // Get tracks that don't have cover art
    const { data: tracks, error } = await supabase
      .from('audio_tracks')
      .select('id, title, creator_id, cover_art_url')
      .is('cover_art_url', null);

    if (error) {
      console.error('❌ Error fetching tracks:', error);
      return;
    }

    console.log(`📊 Found ${tracks.length} tracks without cover art`);

    if (tracks.length === 0) {
      console.log('✅ All tracks already have cover art!');
      return;
    }

    console.log('\n📋 Tracks without cover art:');
    tracks.forEach((track, index) => {
      console.log(`${index + 1}. ID: ${track.id} - "${track.title}" (Creator: ${track.creator_id})`);
    });

    console.log('\n💡 To add cover art to these tracks:');
    console.log('1. Upload an image to your Supabase Storage "cover-art" bucket');
    console.log('2. Get the public URL of the uploaded image');
    console.log('3. Use the update command below with the track ID and image URL');
    console.log('\nExample:');
    console.log('node scripts/update-cover-art.js update <track_id> <image_url>');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function updateSpecificTrack(trackId, imageUrl) {
  try {
    console.log(`🔄 Updating track ${trackId} with cover art: ${imageUrl}`);
    
    const { data, error } = await supabase
      .from('audio_tracks')
      .update({ cover_art_url: imageUrl })
      .eq('id', trackId)
      .select();

    if (error) {
      console.error('❌ Error updating track:', error);
      return;
    }

    console.log('✅ Track updated successfully!');
    console.log('Updated track:', data[0]);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  updateCoverArt();
} else if (args[0] === 'update' && args.length === 3) {
  const trackId = args[1];
  const imageUrl = args[2];
  updateSpecificTrack(trackId, imageUrl);
} else {
  console.log('Usage:');
  console.log('  node scripts/update-cover-art.js                    # List tracks without cover art');
  console.log('  node scripts/update-cover-art.js update <id> <url>  # Update specific track');
}
