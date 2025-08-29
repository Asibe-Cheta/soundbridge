const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCoverArtUpload() {
  try {
    console.log('🧪 Testing cover art upload with service role...\n');
    
    // Create a test image file
    const testImageContent = 'fake image data';
    const testFile = new File([testImageContent], 'test.jpg', { type: 'image/jpeg' });
    const testUserId = 'test-user-id';
    const fileName = `${testUserId}/${Date.now()}_test.jpg`;
    
    console.log('📁 Attempting to upload test image...');
    console.log('File name:', fileName);
    console.log('File type:', testFile.type);
    console.log('File size:', testFile.size);
    
    const { data, error } = await supabase.storage
      .from('cover-art')
      .upload(fileName, testFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Upload failed:', {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error,
        details: error
      });
      
      // Check if it's an RLS issue
      if (error.message.includes('row-level security policy')) {
        console.log('\n🔍 This is an RLS policy issue. The bucket has RLS enabled but the policies are not configured correctly.');
        console.log('\n📝 To fix this, you need to:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to Storage > cover-art bucket');
        console.log('3. Go to the Policies tab');
        console.log('4. Add these policies:');
        console.log('\n   SELECT Policy:');
        console.log('   - Policy name: cover_art_select_policy');
        console.log('   - Operation: SELECT');
        console.log('   - Target roles: authenticated');
        console.log('   - Using expression: bucket_id = \'cover-art\'');
        console.log('\n   INSERT Policy:');
        console.log('   - Policy name: cover_art_insert_policy');
        console.log('   - Operation: INSERT');
        console.log('   - Target roles: authenticated');
        console.log('   - With check expression: bucket_id = \'cover-art\' AND auth.role() = \'authenticated\'');
      }
    } else {
      console.log('✅ Upload successful!');
      console.log('File path:', data.path);
      
      // Clean up the test file
      const { error: deleteError } = await supabase.storage
        .from('cover-art')
        .remove([fileName]);
      
      if (deleteError) {
        console.log('⚠️  Could not clean up test file:', deleteError.message);
      } else {
        console.log('🧹 Test file cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCoverArtUpload();
