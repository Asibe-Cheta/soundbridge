const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixStoragePolicies() {
  try {
    console.log('🔧 Fixing storage policies...\n');
    
    // First, let's check if the cover-art bucket exists
    console.log('📁 Checking cover-art bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }
    
    const coverArtBucket = buckets.find(bucket => bucket.name === 'cover-art');
    if (!coverArtBucket) {
      console.error('❌ cover-art bucket not found!');
      console.log('Available buckets:', buckets.map(b => b.name));
      return;
    }
    
    console.log('✅ cover-art bucket found');
    
    // Now let's apply the RLS policies
    console.log('\n🔐 Applying RLS policies...');
    
    // Drop existing policies first
    const dropPolicies = [
      'DROP POLICY IF EXISTS "cover_art_select_policy" ON storage.objects;',
      'DROP POLICY IF EXISTS "cover_art_insert_policy" ON storage.objects;',
      'DROP POLICY IF EXISTS "cover_art_update_policy" ON storage.objects;',
      'DROP POLICY IF EXISTS "cover_art_delete_policy" ON storage.objects;'
    ];
    
    for (const policy of dropPolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql: policy });
      if (error) {
        console.log(`⚠️  Warning dropping policy: ${error.message}`);
      }
    }
    
    // Create new policies
    const policies = [
      {
        name: 'cover_art_select_policy',
        sql: `CREATE POLICY "cover_art_select_policy" ON storage.objects FOR SELECT USING (bucket_id = 'cover-art');`
      },
      {
        name: 'cover_art_insert_policy', 
        sql: `CREATE POLICY "cover_art_insert_policy" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cover-art' AND auth.role() = 'authenticated');`
      },
      {
        name: 'cover_art_update_policy',
        sql: `CREATE POLICY "cover_art_update_policy" ON storage.objects FOR UPDATE USING (bucket_id = 'cover-art' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);`
      },
      {
        name: 'cover_art_delete_policy',
        sql: `CREATE POLICY "cover_art_delete_policy" ON storage.objects FOR DELETE USING (bucket_id = 'cover-art' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);`
      }
    ];
    
    for (const policy of policies) {
      console.log(`Creating ${policy.name}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
      if (error) {
        console.error(`❌ Error creating ${policy.name}:`, error.message);
      } else {
        console.log(`✅ Created ${policy.name}`);
      }
    }
    
    console.log('\n🎉 Storage policies updated successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Try uploading a track with cover art again');
    console.log('2. Check the browser console for any remaining errors');
    
  } catch (error) {
    console.error('❌ Error fixing storage policies:', error);
  }
}

fixStoragePolicies();
