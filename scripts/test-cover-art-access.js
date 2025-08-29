const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCoverArtAccess() {
  try {
    console.log('🧪 Testing cover art access...\n');
    
    // First, let's check what files are in the cover-art bucket
    console.log('📁 Checking cover-art bucket contents...');
    const { data: files, error: listError } = await supabase.storage
      .from('cover-art')
      .list();
    
    if (listError) {
      console.error('❌ Error listing cover-art bucket:', listError);
      return;
    }
    
    console.log(`📊 Found ${files.length} files in cover-art bucket:`);
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name} (${file.metadata?.size || 'unknown size'})`);
    });
    
    if (files.length === 0) {
      console.log('❌ No files found in cover-art bucket');
      return;
    }
    
    // Test the first file
    const testFile = files[0];
    console.log(`\n🔍 Testing access to: ${testFile.name}`);
    
    // Try to get the public URL
    const { data: urlData } = await supabase.storage
      .from('cover-art')
      .getPublicUrl(testFile.name);
    
    console.log('📋 Public URL:', urlData.publicUrl);
    
    // Test if the URL is accessible
    console.log('\n🌐 Testing URL accessibility...');
    try {
      const response = await fetch(urlData.publicUrl);
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.log('✅ Image is publicly accessible!');
      } else {
        console.log('❌ Image is not publicly accessible');
        console.log('This is likely the issue - the cover art bucket needs public access enabled');
      }
    } catch (fetchError) {
      console.error('❌ Error fetching image:', fetchError.message);
    }
    
    // Check bucket settings
    console.log('\n🔧 Checking bucket settings...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }
    
    const coverArtBucket = buckets.find(bucket => bucket.name === 'cover-art');
    if (coverArtBucket) {
      console.log('📋 Cover-art bucket settings:');
      console.log(`  - Public: ${coverArtBucket.public}`);
      console.log(`  - File size limit: ${coverArtBucket.file_size_limit}`);
      console.log(`  - Allowed MIME types: ${coverArtBucket.allowed_mime_types?.join(', ') || 'All'}`);
      
      if (!coverArtBucket.public) {
        console.log('\n❌ ISSUE FOUND: Cover-art bucket is not public!');
        console.log('📝 To fix this:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to Storage > cover-art bucket');
        console.log('3. Go to Settings tab');
        console.log('4. Enable "Public bucket" option');
        console.log('5. Save changes');
      } else {
        console.log('✅ Cover-art bucket is public');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCoverArtAccess();
