const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Sample audio tracks for search testing
const sampleAudioTracks = [
  {
    title: 'Lagos Nights',
    description: 'A vibrant afrobeats track celebrating the energy of Lagos nightlife',
    genre: 'afrobeats',
    duration: 225, // 3:45
    play_count: 12000,
    like_count: 450,
    tags: ['afrobeats', 'lagos', 'nightlife', 'vibrant']
  },
  {
    title: 'Gospel Fusion',
    description: 'Contemporary gospel music with modern production',
    genre: 'gospel',
    duration: 252, // 4:12
    play_count: 8000,
    like_count: 320,
    tags: ['gospel', 'worship', 'contemporary', 'spiritual']
  },
  {
    title: 'UK Drill Mix',
    description: 'Hard-hitting UK drill with authentic London sound',
    genre: 'uk-drill',
    duration: 208, // 3:28
    play_count: 15000,
    like_count: 680,
    tags: ['uk-drill', 'london', 'hard-hitting', 'authentic']
  },
  {
    title: 'Afro Fusion',
    description: 'Blend of traditional African rhythms with modern beats',
    genre: 'afrobeats',
    duration: 235, // 3:55
    play_count: 9000,
    like_count: 380,
    tags: ['afrobeats', 'fusion', 'traditional', 'modern']
  },
  {
    title: 'Praise & Worship',
    description: 'Uplifting gospel track perfect for church services',
    genre: 'gospel',
    duration: 270, // 4:30
    play_count: 6000,
    like_count: 250,
    tags: ['gospel', 'praise', 'worship', 'church']
  },
  {
    title: 'Lagos Anthem',
    description: 'The official anthem of Lagos with infectious energy',
    genre: 'afrobeats',
    duration: 195, // 3:15
    play_count: 18000,
    like_count: 720,
    tags: ['afrobeats', 'lagos', 'anthem', 'energy']
  },
  {
    title: 'Highlife Classics',
    description: 'Traditional highlife music from Ghana',
    genre: 'highlife',
    duration: 240, // 4:00
    play_count: 5000,
    like_count: 180,
    tags: ['highlife', 'ghana', 'traditional', 'classic']
  },
  {
    title: 'Jazz in the Park',
    description: 'Smooth jazz for relaxing afternoons',
    genre: 'jazz',
    duration: 300, // 5:00
    play_count: 4000,
    like_count: 150,
    tags: ['jazz', 'smooth', 'relaxing', 'instrumental']
  },
  {
    title: 'Hip Hop Battle',
    description: 'Intense hip hop track for rap battles',
    genre: 'hip-hop',
    duration: 180, // 3:00
    play_count: 11000,
    like_count: 420,
    tags: ['hip-hop', 'battle', 'intense', 'rap']
  },
  {
    title: 'The Lagos Life Podcast',
    description: 'Weekly podcast about life in Lagos',
    genre: 'podcast',
    duration: 2520, // 42:00
    play_count: 8000,
    like_count: 200,
    tags: ['podcast', 'lagos', 'lifestyle', 'weekly']
  },
  {
    title: 'Faith & Beats',
    description: 'Gospel podcast exploring faith through music',
    genre: 'podcast',
    duration: 2100, // 35:00
    play_count: 6000,
    like_count: 180,
    tags: ['podcast', 'gospel', 'faith', 'music']
  },
  {
    title: 'UK Underground',
    description: 'Deep dive into the UK underground music scene',
    genre: 'podcast',
    duration: 1680, // 28:00
    play_count: 12000,
    like_count: 350,
    tags: ['podcast', 'uk', 'underground', 'music']
  }
];

// Sample creators for search testing
const sampleCreators = [
  {
    username: 'kwame-asante',
    display_name: 'Kwame Asante',
    bio: 'Afrobeats artist from London, bringing the sounds of Africa to the UK',
    location: 'London, UK',
    country: 'UK',
    role: 'creator'
  },
  {
    username: 'sarah-johnson',
    display_name: 'Sarah Johnson',
    bio: 'Gospel singer and worship leader with over 10 years of experience',
    location: 'Birmingham, UK',
    country: 'UK',
    role: 'creator'
  },
  {
    username: 'tommy-b',
    display_name: 'Tommy B',
    bio: 'UK Drill artist representing the authentic London sound',
    location: 'Manchester, UK',
    country: 'UK',
    role: 'creator'
  },
  {
    username: 'ada-grace',
    display_name: 'Ada Grace',
    bio: 'Gospel artist and podcast host from Lagos',
    location: 'Lagos, Nigeria',
    country: 'Nigeria',
    role: 'creator'
  },
  {
    username: 'dj-emeka',
    display_name: 'DJ Emeka',
    bio: 'Afrobeats DJ and producer from Abuja',
    location: 'Abuja, Nigeria',
    country: 'Nigeria',
    role: 'creator'
  },
  {
    username: 'grace-community',
    display_name: 'Grace Community',
    bio: 'Gospel choir and worship group from London',
    location: 'London, UK',
    country: 'UK',
    role: 'creator'
  },
  {
    username: 'michael-okafor',
    display_name: 'Michael Okafor',
    bio: 'Afrobeats fusion artist blending traditional and modern sounds',
    location: 'Lagos, Nigeria',
    country: 'Nigeria',
    role: 'creator'
  },
  {
    username: 'wizkid-jr',
    display_name: 'Wizkid Jr',
    bio: 'Young afrobeats artist following in the footsteps of the greats',
    location: 'Lagos, Nigeria',
    country: 'Nigeria',
    role: 'creator'
  }
];

// Sample events for search testing
const sampleEvents = [
  {
    title: 'Afrobeats Carnival',
    description: 'The biggest afrobeats festival in Lagos featuring top artists',
    event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
    location: 'Tafawa Balewa Square, Lagos',
    venue: 'Tafawa Balewa Square',
    latitude: 6.5244,
    longitude: 3.3792,
    category: 'Afrobeat',
    price_ngn: 15000,
    max_attendees: 5000,
    current_attendees: 2500
  },
  {
    title: 'Gospel Night Live',
    description: 'An evening of powerful gospel music and worship',
    event_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    location: 'Royal Festival Hall, London',
    venue: 'Royal Festival Hall',
    latitude: 51.5074,
    longitude: -0.1278,
    category: 'Gospel',
    price_gbp: 45,
    max_attendees: 2000,
    current_attendees: 1800
  },
  {
    title: 'UK Drill Showcase',
    description: 'Showcase of the best UK drill artists',
    event_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    location: 'O2 Academy, Birmingham',
    venue: 'O2 Academy Birmingham',
    latitude: 52.4862,
    longitude: -1.8904,
    category: 'Hip-Hop',
    price_gbp: 35,
    max_attendees: 1000,
    current_attendees: 950
  },
  {
    title: 'Worship Experience',
    description: 'A powerful worship experience with contemporary gospel music',
    event_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    location: 'House on the Rock, Abuja',
    venue: 'House on the Rock',
    latitude: 9.0820,
    longitude: 8.6753,
    category: 'Gospel',
    price_ngn: 0, // Free
    max_attendees: 3000,
    current_attendees: 2000
  },
  {
    title: 'Highlife Festival',
    description: 'Celebration of traditional highlife music',
    event_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days from now
    location: 'Victoria Island, Lagos',
    venue: 'Victoria Island Beach',
    latitude: 6.4281,
    longitude: 3.4219,
    category: 'Other',
    price_ngn: 8000,
    max_attendees: 1500,
    current_attendees: 1200
  },
  {
    title: 'Jazz in the Park',
    description: 'Relaxing jazz music in the beautiful Hyde Park',
    event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
    location: 'Hyde Park, London',
    venue: 'Hyde Park',
    latitude: 51.5074,
    longitude: -0.1657,
    category: 'Jazz',
    price_gbp: 0, // Free
    max_attendees: 5000,
    current_attendees: 3100
  },
  {
    title: 'Hip Hop Battle',
    description: 'Underground hip hop battle competition',
    event_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    location: 'Warehouse, Manchester',
    venue: 'Warehouse',
    latitude: 53.4808,
    longitude: -2.2426,
    category: 'Hip-Hop',
    price_gbp: 25,
    max_attendees: 800,
    current_attendees: 750
  }
];

async function insertSampleSearchData() {
  try {
    console.log('Starting to insert sample search data...');

    // First, get an existing user to use as creator
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'creator')
      .limit(1)
      .single();

    if (!existingUser) {
      console.error('No existing creator found. Please create a user first.');
      return;
    }

    const creatorId = existingUser.id;

    // Insert sample creators
    console.log('Inserting sample creators...');
    for (const creator of sampleCreators) {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          ...creator,
          id: creatorId, // Use the same creator for all tracks/events
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error inserting creator:', creator.display_name, error);
      } else {
        console.log('✅ Inserted creator:', creator.display_name);
      }
    }

    // Insert sample audio tracks
    console.log('Inserting sample audio tracks...');
    for (const track of sampleAudioTracks) {
      const { data, error } = await supabase
        .from('audio_tracks')
        .insert({
          ...track,
          creator_id: creatorId,
          file_url: 'https://example.com/audio/sample.mp3', // Placeholder
          cover_art_url: 'https://example.com/images/cover.jpg', // Placeholder
          is_public: true,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error inserting track:', track.title, error);
      } else {
        console.log('✅ Inserted track:', track.title);
      }
    }

    // Insert sample events
    console.log('Inserting sample events...');
    for (const event of sampleEvents) {
      const { data, error } = await supabase
        .from('events')
        .insert({
          ...event,
          creator_id: creatorId,
          image_url: 'https://example.com/images/event.jpg', // Placeholder
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error inserting event:', event.title, error);
      } else {
        console.log('✅ Inserted event:', event.title);
      }
    }

    console.log('🎉 Sample search data insertion completed!');
    console.log(`Inserted ${sampleCreators.length} creators`);
    console.log(`Inserted ${sampleAudioTracks.length} audio tracks`);
    console.log(`Inserted ${sampleEvents.length} events`);

  } catch (error) {
    console.error('Error inserting sample search data:', error);
  }
}

// Run the script
insertSampleSearchData(); 