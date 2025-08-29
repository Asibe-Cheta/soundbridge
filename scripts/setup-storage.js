const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please make sure you have:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  try {
    console.log('🔧 Setting up Supabase storage...');

    // Check if avatars bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }

    const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');
    
    if (!avatarsBucket) {
      console.log('📦 Creating avatars bucket...');
      
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('avatars', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError);
        return;
      }

      console.log('✅ Avatars bucket created successfully');
    } else {
      console.log('✅ Avatars bucket already exists');
    }

    // Set up RLS policies for the avatars bucket
    console.log('🔒 Setting up storage policies...');
    
    // Policy to allow authenticated users to upload their own avatars
    const { error: uploadPolicyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'avatars',
      policy_name: 'Users can upload their own avatars',
      policy_definition: `
        CREATE POLICY "Users can upload their own avatars" ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id = 'avatars' AND 
          auth.uid()::text = (storage.foldername(name))[1]
        )
      `
    });

    if (uploadPolicyError && !uploadPolicyError.message.includes('already exists')) {
      console.error('❌ Error creating upload policy:', uploadPolicyError);
    } else {
      console.log('✅ Upload policy created');
    }

    // Policy to allow public read access to avatars
    const { error: readPolicyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'avatars',
      policy_name: 'Public read access to avatars',
      policy_definition: `
        CREATE POLICY "Public read access to avatars" ON storage.objects
        FOR SELECT USING (bucket_id = 'avatars')
      `
    });

    if (readPolicyError && !readPolicyError.message.includes('already exists')) {
      console.error('❌ Error creating read policy:', readPolicyError);
    } else {
      console.log('✅ Read policy created');
    }

    // Policy to allow users to update their own avatars
    const { error: updatePolicyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'avatars',
      policy_name: 'Users can update their own avatars',
      policy_definition: `
        CREATE POLICY "Users can update their own avatars" ON storage.objects
        FOR UPDATE USING (
          bucket_id = 'avatars' AND 
          auth.uid()::text = (storage.foldername(name))[1]
        )
      `
    });

    if (updatePolicyError && !updatePolicyError.message.includes('already exists')) {
      console.error('❌ Error creating update policy:', updatePolicyError);
    } else {
      console.log('✅ Update policy created');
    }

    console.log('🎉 Storage setup completed successfully!');
    console.log('');
    console.log('You can now upload profile pictures from the profile page.');

  } catch (error) {
    console.error('💥 Setup failed:', error);
  }
}

setupStorage();
