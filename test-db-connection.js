const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aunxdbqukbxyyiusaeqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0NzQ5NzQsImV4cCI6MjA1MTA1MDk3NH0.aunxdbqukbxyyiusaeqi';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAudioTracks() {
  try {
    console.log('🔍 Checking audio_tracks table...\n');
    
    const { data: tracks, error } = await supabase
      .from('audio_tracks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`📊 Found ${tracks.length} tracks:\n`);
    
    tracks.forEach((track, index) => {
      console.log(`🎵 Track ${index + 1}:`);
      console.log(`   ID: ${track.id}`);
      console.log(`   Title: ${track.title}`);
      console.log(`   Artist Name: "${track.artist_name}"`);
      console.log(`   Creator ID: ${track.creator_id}`);
      console.log(`   Cover Art: ${track.cover_art_url ? 'Yes' : 'No'}`);
      console.log(`   File URL: ${track.file_url ? 'Yes' : 'No'}`);
      console.log(`   Created: ${track.created_at}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAudioTracks();
