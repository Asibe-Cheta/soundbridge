const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseSetup() {
  try {
    console.log('🔍 Checking database setup...');

    // Check if audio_tracks table exists
    console.log('\n📋 Checking audio_tracks table...');
    const { data: audioTracksTable, error: tableError } = await supabase
      .from('audio_tracks')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ audio_tracks table error:', tableError);
      console.log('🔧 The audio_tracks table might not exist or have RLS issues.');
    } else {
      console.log('✅ audio_tracks table exists and is accessible');
    }

    // Check if profiles table exists
    console.log('\n📋 Checking profiles table...');
    const { data: profilesTable, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (profilesError) {
      console.error('❌ profiles table error:', profilesError);
    } else {
      console.log('✅ profiles table exists and is accessible');
    }

    // Check RLS policies
    console.log('\n🔒 Checking RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_rls_policies');

    if (policiesError) {
      console.log('⚠️  Could not check RLS policies directly');
      console.log('Let\'s check manually...');
    } else {
      console.log('📋 Current RLS policies:', policies);
    }

    // Test inserting a record (this will show us the exact RLS error)
    console.log('\n🧪 Testing database insert...');
    const testData = {
      title: 'Test Track',
      description: 'Test description',
      creator_id: '08ab428b-c566-4995-8ae1-715272eac707', // Your user ID
      file_url: 'test-url',
      is_public: true
    };

    const { data: insertData, error: insertError } = await supabase
      .from('audio_tracks')
      .insert(testData)
      .select();

    if (insertError) {
      console.error('❌ Insert test failed:', insertError);
      console.log('\n🔧 This is the RLS policy violation!');
      console.log('The error shows exactly what policy is blocking the insert.');
    } else {
      console.log('✅ Insert test successful:', insertData);
      
      // Clean up test data
      if (insertData && insertData[0]) {
        const { error: deleteError } = await supabase
          .from('audio_tracks')
          .delete()
          .eq('id', insertData[0].id);
        
        if (deleteError) {
          console.log('⚠️  Could not clean up test data:', deleteError);
        } else {
          console.log('🧹 Test data cleaned up');
        }
      }
    }

    console.log('\n🎯 Next Steps:');
    console.log('1. If the audio_tracks table doesn\'t exist, we need to create it');
    console.log('2. If RLS policies are missing, we need to add them');
    console.log('3. If the table schema is wrong, we need to fix it');

  } catch (error) {
    console.error('❌ Error checking database setup:', error);
  }
}

checkDatabaseSetup();
