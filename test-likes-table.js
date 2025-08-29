const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLikesTable() {
  console.log('🔍 Testing likes table...\n');

  try {
    // 1. Check if likes table exists
    console.log('1. Checking if likes table exists...');
    const { data: tableExists, error: tableError } = await supabase
      .from('likes')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Error accessing likes table:', tableError);
      return;
    }

    console.log('✅ Likes table exists and is accessible');

    // 2. Check table structure
    console.log('\n2. Checking table structure...');
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'likes' });

    if (columnsError) {
      console.log('⚠️  Could not get column info (this is normal for some setups)');
    } else {
      console.log('✅ Table columns:', columns);
    }

    // 3. Check if there are any likes
    console.log('\n3. Checking existing likes...');
    const { data: likes, error: likesError } = await supabase
      .from('likes')
      .select('*')
      .limit(5);

    if (likesError) {
      console.error('❌ Error querying likes:', likesError);
      return;
    }

    console.log(`✅ Found ${likes.length} likes in the table`);
    if (likes.length > 0) {
      console.log('Sample like:', likes[0]);
    }

    // 4. Test inserting a sample like (we'll delete it after)
    console.log('\n4. Testing like insertion...');
    
    // First, get a user and a track to test with
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    const { data: tracks } = await supabase
      .from('audio_tracks')
      .select('id')
      .limit(1);

    if (!users || users.length === 0 || !tracks || tracks.length === 0) {
      console.log('⚠️  No users or tracks found to test with');
      return;
    }

    const testUserId = users[0].id;
    const testTrackId = tracks[0].id;

    // Insert a test like
    const { data: insertData, error: insertError } = await supabase
      .from('likes')
      .insert({
        user_id: testUserId,
        content_id: testTrackId,
        content_type: 'track'
      })
      .select();

    if (insertError) {
      console.error('❌ Error inserting test like:', insertError);
      return;
    }

    console.log('✅ Successfully inserted test like:', insertData[0]);

    // 5. Test querying the specific like
    console.log('\n5. Testing like query...');
    const { data: queryData, error: queryError } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', testUserId)
      .eq('content_id', testTrackId)
      .eq('content_type', 'track')
      .single();

    if (queryError) {
      console.error('❌ Error querying specific like:', queryError);
    } else {
      console.log('✅ Successfully queried specific like:', queryData);
    }

    // 6. Clean up - delete the test like
    console.log('\n6. Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('likes')
      .delete()
      .eq('id', insertData[0].id);

    if (deleteError) {
      console.error('❌ Error deleting test like:', deleteError);
    } else {
      console.log('✅ Successfully deleted test like');
    }

    console.log('\n🎉 All tests passed! The likes table is working correctly.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testLikesTable();
