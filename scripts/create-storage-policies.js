const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createStoragePolicies() {
  try {
    console.log('🔧 Creating storage policies with service role...');

    // First, let's check if the audio-tracks bucket exists
    console.log('\n📋 Checking audio-tracks bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }

    const audioTracksBucket = buckets.find(bucket => bucket.name === 'audio-tracks');
    if (!audioTracksBucket) {
      console.error('❌ audio-tracks bucket not found!');
      console.log('Available buckets:', buckets.map(b => b.name));
      return;
    }

    console.log('✅ audio-tracks bucket found');

    // Now let's create the storage policies using SQL with service role
    console.log('\n🔧 Creating storage policies...');

    const policies = [
      // Policy for authenticated users to upload audio files
      `CREATE POLICY IF NOT EXISTS "audio_tracks_insert_policy" ON storage.objects
       FOR INSERT WITH CHECK (
         bucket_id = 'audio-tracks' 
         AND auth.role() = 'authenticated'
         AND (storage.foldername(name))[1] = auth.uid()::text
       );`,
      
      // Policy for authenticated users to read audio files
      `CREATE POLICY IF NOT EXISTS "audio_tracks_select_policy" ON storage.objects
       FOR SELECT USING (
         bucket_id = 'audio-tracks' 
         AND auth.role() = 'authenticated'
       );`,
      
      // Policy for users to update their own audio files
      `CREATE POLICY IF NOT EXISTS "audio_tracks_update_policy" ON storage.objects
       FOR UPDATE USING (
         bucket_id = 'audio-tracks' 
         AND auth.role() = 'authenticated'
         AND (storage.foldername(name))[1] = auth.uid()::text
       );`,
      
      // Policy for users to delete their own audio files
      `CREATE POLICY IF NOT EXISTS "audio_tracks_delete_policy" ON storage.objects
       FOR DELETE USING (
         bucket_id = 'audio-tracks' 
         AND auth.role() = 'authenticated'
         AND (storage.foldername(name))[1] = auth.uid()::text
       );`
    ];

    // Execute each policy
    for (let i = 0; i < policies.length; i++) {
      const policy = policies[i];
      console.log(`\n📝 Creating policy ${i + 1}/${policies.length}...`);
      
      const { error: policyError } = await supabase.rpc('exec_sql', { sql: policy });
      
      if (policyError) {
        console.error(`❌ Failed to create policy ${i + 1}:`, policyError);
        console.log('Policy SQL:', policy);
      } else {
        console.log(`✅ Policy ${i + 1} created successfully`);
      }
    }

    // Test the policies by trying to upload a file
    console.log('\n🧪 Testing upload with policies...');
    const testContent = 'test audio content';
    const testFile = new File([testContent], 'test.mp3', { type: 'audio/mpeg' });
    const testFileName = `test/${Date.now()}_test.mp3`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-tracks')
      .upload(testFileName, testFile);

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
    } else {
      console.log('✅ Upload test successful:', uploadData);
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('audio-tracks')
        .remove([testFileName]);
      
      if (deleteError) {
        console.log('⚠️  Could not clean up test file:', deleteError);
      } else {
        console.log('🧹 Test file cleaned up');
      }
    }

    console.log('\n🎉 Storage policies setup complete!');
    console.log('You should now be able to upload audio files from your application.');

  } catch (error) {
    console.error('❌ Error creating storage policies:', error);
  }
}

createStoragePolicies();
