// Test script to seed database with real data for mobile app testing
// This replicates the web app data structure

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aunxdbqukbxyyiusaeqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTA2MTUsImV4cCI6MjA2ODI2NjYxNX0.IP-c4_S7Fkbq6F2UkgzL-TibkoBN49yQ1Cqz4CkMzB0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedTestData() {
  console.log('🌱 Starting database seed for mobile app testing...');
  
  try {
    // 1. Create test creator profiles (matching web app schema)
    const testCreators = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        username: 'dj_alex_test',
        display_name: 'DJ Alex',
        bio: 'Electronic music producer and DJ',
        role: 'creator',
        genre: 'Electronic',
        location: 'London, UK',
        country: 'UK'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002', 
        username: 'sarah_beats_test',
        display_name: 'Sarah Beats',
        bio: 'Hip-hop artist from NYC',
        role: 'creator',
        genre: 'Hip-Hop',
        location: 'New York, USA'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        username: 'mike_music_test',
        display_name: 'Mike Music', 
        bio: 'Indie rock musician',
        role: 'creator',
        genre: 'Rock',
        location: 'Manchester, UK',
        country: 'UK'
      }
    ];

    console.log('📝 Inserting test creator profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .upsert(testCreators, { onConflict: 'id' })
      .select();

    if (profilesError) {
      console.error('❌ Error inserting profiles:', profilesError);
      return;
    }
    console.log('✅ Created', profiles?.length || 0, 'test creator profiles');

    // 2. Create test audio tracks (matching web app schema)
    const testTracks = [
      {
        title: 'Summer Vibes',
        description: 'A chill electronic track perfect for summer',
        creator_id: testCreators[0].id,
        file_url: 'https://example.com/audio/summer-vibes.mp3',
        cover_art_url: 'https://picsum.photos/400/400?random=1',
        duration: 180,
        genre: 'Electronic',
        play_count: 1250,
        like_count: 89,
        is_public: true,
        tags: ['electronic', 'chill', 'summer']
      },
      {
        title: 'Urban Flow',
        description: 'Hip-hop beats with urban vibes',
        creator_id: testCreators[1].id,
        file_url: 'https://example.com/audio/urban-flow.mp3',
        cover_art_url: 'https://picsum.photos/400/400?random=2',
        duration: 220,
        genre: 'Hip-Hop',
        play_count: 890,
        like_count: 67,
        is_public: true,
        tags: ['hip-hop', 'beats', 'urban']
      },
      {
        title: 'Rock Anthem',
        description: 'Powerful indie rock anthem',
        creator_id: testCreators[2].id,
        file_url: 'https://example.com/audio/rock-anthem.mp3',
        cover_art_url: 'https://picsum.photos/400/400?random=3',
        duration: 260,
        genre: 'Rock',
        play_count: 567,
        like_count: 45,
        is_public: true,
        tags: ['rock', 'indie', 'anthem']
      }
    ];

    console.log('🎵 Inserting test audio tracks...');
    const { data: tracks, error: tracksError } = await supabase
      .from('audio_tracks')
      .insert(testTracks)
      .select();

    if (tracksError) {
      console.error('❌ Error inserting tracks:', tracksError);
      return;
    }
    console.log('✅ Created', tracks?.length || 0, 'test audio tracks');

    // 3. Create test events (matching web app schema)
    const testEvents = [
      {
        title: 'Electronic Music Night',
        description: 'Join us for an amazing night of electronic music',
        creator_id: testCreators[0].id,
        event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        location: 'Ministry of Sound, London',
        category: 'Secular',
        price_gbp: 25.00,
        max_attendees: 500,
        current_attendees: 120,
        image_url: 'https://picsum.photos/600/400?random=event1'
      },
      {
        title: 'Hip-Hop Showcase',
        description: 'Showcase of the best hip-hop talent',
        creator_id: testCreators[1].id,
        event_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
        location: 'Brooklyn Bowl, NYC',
        category: 'Hip-Hop',
        price_gbp: 30.00,
        max_attendees: 300,
        current_attendees: 85,
        image_url: 'https://picsum.photos/600/400?random=event2'
      }
    ];

    console.log('🎤 Inserting test events...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .insert(testEvents)
      .select();

    if (eventsError) {
      console.error('❌ Error inserting events:', eventsError);
      return;
    }
    console.log('✅ Created', events?.length || 0, 'test events');

    // 4. Create some test followers to make creator data more realistic
    const testFollows = [
      { follower_id: testCreators[1].id, following_id: testCreators[0].id },
      { follower_id: testCreators[2].id, following_id: testCreators[0].id },
      { follower_id: testCreators[0].id, following_id: testCreators[1].id }
    ];

    console.log('👥 Creating test follows...');
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .insert(testFollows)
      .select();

    if (followsError) {
      console.error('❌ Error inserting follows:', followsError);
      return;
    }
    console.log('✅ Created', follows?.length || 0, 'test follows');

    console.log('🎉 Database seeding completed successfully!');
    console.log('📱 Your mobile app should now display real data instead of mock data');
    console.log('🔄 Refresh your mobile app to see the changes');

  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
  }
}

// Run the seed function
seedTestData();
