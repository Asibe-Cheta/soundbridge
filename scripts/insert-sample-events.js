const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sampleEvents = [
  {
    title: 'Gospel Night Live',
    description: 'Experience an unforgettable evening of gospel music featuring some of the most talented artists from across the UK and Nigeria. This special event brings together traditional gospel choirs with contemporary gospel fusion, creating a powerful and uplifting atmosphere.',
    event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    location: 'London, UK',
    venue: 'Royal Festival Hall',
    category: 'Gospel',
    price_gbp: 25.00,
    price_ngn: null,
    max_attendees: 1500,
    current_attendees: 1200,
    image_url: 'https://picsum.photos/800/400?random=gospel-event'
  },
  {
    title: 'Afrobeats Carnival',
    description: 'Join us for the biggest Afrobeats celebration in Lagos! Featuring top Nigerian artists, international DJs, and an amazing atmosphere. Don\'t miss this cultural extravaganza.',
    event_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    location: 'Lagos, Nigeria',
    venue: 'Tafawa Balewa Square',
    category: 'Afrobeat',
    price_gbp: null,
    price_ngn: 10000.00,
    max_attendees: 5000,
    current_attendees: 3500,
    image_url: 'https://picsum.photos/800/400?random=afrobeats'
  },
  {
    title: 'UK Drill Showcase',
    description: 'The hottest UK Drill artists come together for an explosive night of music. Experience the raw energy and authentic sound of London\'s drill scene.',
    event_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    location: 'Birmingham, UK',
    venue: 'O2 Academy',
    category: 'Hip-Hop',
    price_gbp: 20.00,
    price_ngn: null,
    max_attendees: 800,
    current_attendees: 600,
    image_url: 'https://picsum.photos/800/400?random=drill'
  },
  {
    title: 'Worship Experience',
    description: 'A powerful evening of worship and praise featuring contemporary Christian music, prayer, and spiritual fellowship. Open to all who seek spiritual connection.',
    event_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
    location: 'Abuja, Nigeria',
    venue: 'House on the Rock',
    category: 'Christian',
    price_gbp: null,
    price_ngn: 0.00,
    max_attendees: 2000,
    current_attendees: 1800,
    image_url: 'https://picsum.photos/800/400?random=worship'
  },
  {
    title: 'Jazz Fusion Night',
    description: 'An intimate evening of jazz fusion featuring local and international jazz artists. Perfect for music lovers who appreciate sophisticated sounds and smooth melodies.',
    event_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    location: 'Manchester, UK',
    venue: 'Blue Note Club',
    category: 'Jazz',
    price_gbp: 35.00,
    price_ngn: null,
    max_attendees: 300,
    current_attendees: 250,
    image_url: 'https://picsum.photos/800/400?random=jazz'
  },
  {
    title: 'Highlife Festival',
    description: 'Celebrate the rich tradition of Highlife music with live performances, traditional dances, and cultural displays. A family-friendly event showcasing Nigerian heritage.',
    event_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days from now
    location: 'Lagos, Nigeria',
    venue: 'National Theatre',
    category: 'Other',
    price_gbp: null,
    price_ngn: 5000.00,
    max_attendees: 1500,
    current_attendees: 1200,
    image_url: 'https://picsum.photos/800/400?random=highlife'
  },
  {
    title: 'Hip Hop Battle',
    description: 'Witness the most intense hip hop battles in London. MCs from across the UK compete for glory, respect, and prizes. Raw talent meets fierce competition.',
    event_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days from now
    location: 'London, UK',
    venue: 'Underground Arena',
    category: 'Hip-Hop',
    price_gbp: 15.00,
    price_ngn: null,
    max_attendees: 600,
    current_attendees: 450,
    image_url: 'https://picsum.photos/800/400?random=hiphop'
  },
  {
    title: 'Gospel Choir Competition',
    description: 'Choirs from across Nigeria compete in this prestigious gospel choir competition. Experience the power of collective voices in harmony and worship.',
    event_date: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(), // 18 days from now
    location: 'Abuja, Nigeria',
    venue: 'Cathedral Hall',
    category: 'Gospel',
    price_gbp: null,
    price_ngn: 3000.00,
    max_attendees: 800,
    current_attendees: 650,
    image_url: 'https://picsum.photos/800/400?random=choir'
  }
];

async function insertSampleEvents() {
  try {
    console.log('Starting to insert sample events...');

    // First, let's get a user to use as the creator
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error('No users found. Please create a user profile first.');
      return;
    }

    const creatorId = users[0].id;
    console.log(`Using creator ID: ${creatorId}`);

    // Insert events
    for (const event of sampleEvents) {
      const { data, error } = await supabase
        .from('events')
        .insert([{
          ...event,
          creator_id: creatorId
        }])
        .select();

      if (error) {
        console.error(`Error inserting event "${event.title}":`, error);
      } else {
        console.log(`✅ Successfully inserted: ${event.title}`);
      }
    }

    console.log('Sample events insertion completed!');
  } catch (error) {
    console.error('Error inserting sample events:', error);
  }
}

// Run the script
insertSampleEvents(); 