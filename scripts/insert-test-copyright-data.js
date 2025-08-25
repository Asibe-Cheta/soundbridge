// Insert Test Copyright Data
// This script adds sample data to test the copyright protection system

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertTestData() {
  console.log('📝 Inserting test copyright data...\n');

  try {
    // Insert test whitelist entries
    console.log('✅ Adding whitelist entries...');
    const whitelistData = [
      {
        fingerprint_hash: 'test_whitelist_hash_001',
        track_title: 'Amazing Grace (Public Domain)',
        artist_name: 'Traditional',
        rights_holder: 'Public Domain',
        license_type: 'public_domain',
        license_details: { source: 'Traditional hymn', year: 1779 }
      },
      {
        fingerprint_hash: 'test_whitelist_hash_002',
        track_title: 'Happy Birthday (Public Domain)',
        artist_name: 'Traditional',
        rights_holder: 'Public Domain',
        license_type: 'public_domain',
        license_details: { source: 'Traditional song', year: 1893 }
      }
    ];

    for (const entry of whitelistData) {
      const { error } = await supabase
        .from('copyright_whitelist')
        .insert(entry);
      
      if (error) {
        console.log(`⚠️  Whitelist entry already exists or error: ${error.message}`);
      } else {
        console.log(`✅ Added whitelist: ${entry.track_title}`);
      }
    }

    // Insert test blacklist entries
    console.log('\n🚫 Adding blacklist entries...');
    const blacklistData = [
      {
        fingerprint_hash: 'test_blacklist_hash_001',
        track_title: 'Bohemian Rhapsody',
        artist_name: 'Queen',
        rights_holder: 'Queen Productions Ltd.',
        release_date: '1975-10-31',
        country_of_origin: 'UK',
        added_reason: 'Famous copyrighted song for testing'
      },
      {
        fingerprint_hash: 'test_blacklist_hash_002',
        track_title: 'Imagine',
        artist_name: 'John Lennon',
        rights_holder: 'Lennon Estate',
        release_date: '1971-10-11',
        country_of_origin: 'UK',
        added_reason: 'Famous copyrighted song for testing'
      }
    ];

    for (const entry of blacklistData) {
      const { error } = await supabase
        .from('copyright_blacklist')
        .insert(entry);
      
      if (error) {
        console.log(`⚠️  Blacklist entry already exists or error: ${error.message}`);
      } else {
        console.log(`✅ Added blacklist: ${entry.track_title}`);
      }
    }

    // Insert copyright settings
    console.log('\n⚙️  Adding copyright settings...');
    const settingsData = {
      setting_key: 'default_settings',
      setting_value: {
        enableAutomatedChecking: true,
        confidenceThreshold: 0.7,
        enableCommunityReporting: true,
        enableDMCARequests: true,
        autoFlagThreshold: 0.8,
        autoBlockThreshold: 0.95,
        requireManualReview: false,
        whitelistEnabled: true,
        blacklistEnabled: true
      },
      description: 'Default copyright protection settings for testing'
    };

    const { error: settingsError } = await supabase
      .from('copyright_settings')
      .upsert(settingsData, { onConflict: 'setting_key' });

    if (settingsError) {
      console.log(`⚠️  Settings error: ${settingsError.message}`);
    } else {
      console.log('✅ Copyright settings configured');
    }

    console.log('\n🎉 Test data insertion complete!');
    console.log('\n📋 What was added:');
    console.log('- 2 whitelist entries (public domain songs)');
    console.log('- 2 blacklist entries (famous copyrighted songs)');
    console.log('- Default copyright settings');
    console.log('\n🧪 Now you can test:');
    console.log('1. Upload a track - it should be checked against whitelist/blacklist');
    console.log('2. Try uploading content similar to the blacklisted songs');
    console.log('3. Check the copyright protection records in the database');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the data insertion
insertTestData();
