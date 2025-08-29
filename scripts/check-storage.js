const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndCreateBucket() {
  try {
    console.log('🔍 Checking existing buckets...');
    
    // List all buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }
    
    console.log('📋 Available buckets:', buckets.map(b => b.name));
    
    // Check if avatars bucket exists
    const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');
    
    if (avatarsBucket) {
      console.log('✅ Avatars bucket already exists:', avatarsBucket);
      return;
    }
    
    console.log('📦 Creating avatars bucket...');
    
    // Create the avatars bucket
    const { data: newBucket, error: createError } = await supabase.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    });
    
    if (createError) {
      console.error('❌ Error creating bucket:', createError);
      return;
    }
    
    console.log('✅ Avatars bucket created successfully:', newBucket);
    
    // Test upload
    console.log('🧪 Testing upload...');
    const testContent = 'test';
    const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload('test.txt', testFile);
    
    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
    } else {
      console.log('✅ Upload test successful:', uploadData);
      
      // Clean up
      await supabase.storage.from('avatars').remove(['test.txt']);
      console.log('🧹 Test file cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAndCreateBucket();
