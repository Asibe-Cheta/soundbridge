// Test script to verify upload functionality
const { createClient } = require('@supabase/supabase-js');

async function testUploadSetup() {
  console.log('🧪 Testing upload setup...');
  
  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  try {
    // 1. Test authentication
    console.log('1️⃣ Testing authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('❌ Auth error:', authError.message);
      return;
    }
    if (!user) {
      console.error('❌ No authenticated user');
      return;
    }
    console.log('✅ User authenticated:', user.id);
    
    // 2. Test storage buckets
    console.log('2️⃣ Testing storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error('❌ Buckets error:', bucketsError.message);
      return;
    }
    
    const audioBucket = buckets.find(b => b.id === 'audio-tracks');
    const coverBucket = buckets.find(b => b.id === 'cover-art');
    
    console.log('📦 Audio bucket:', audioBucket ? '✅ Found' : '❌ Missing');
    console.log('📦 Cover bucket:', coverBucket ? '✅ Found' : '❌ Missing');
    
    if (!audioBucket || !coverBucket) {
      console.error('❌ Required storage buckets missing');
      return;
    }
    
    // 3. Test file upload (small test file)
    console.log('3️⃣ Testing file upload...');
    const testFile = new File(['test audio content'], 'test.mp3', { type: 'audio/mpeg' });
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-tracks')
      .upload(`${user.id}/test_${Date.now()}.mp3`, testFile);
    
    if (uploadError) {
      console.error('❌ Upload error:', uploadError.message);
      return;
    }
    
    console.log('✅ Test upload successful:', uploadData.path);
    
    // 4. Test database table
    console.log('4️⃣ Testing database table...');
    const { data: tracks, error: tracksError } = await supabase
      .from('audio_tracks')
      .select('id')
      .limit(1);
    
    if (tracksError) {
      console.error('❌ Database error:', tracksError.message);
      return;
    }
    
    console.log('✅ Database table accessible');
    
    // 5. Clean up test file
    console.log('5️⃣ Cleaning up test file...');
    await supabase.storage
      .from('audio-tracks')
      .remove([uploadData.path]);
    
    console.log('✅ Test file cleaned up');
    console.log('🎉 All tests passed! Upload should work.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testUploadSetup();