const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createStoragePoliciesV2() {
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

    // Create a helper function to execute SQL with service role
    console.log('\n🔧 Creating helper function...');
    const createHelperFunction = `
      CREATE OR REPLACE FUNCTION create_storage_policy(
        policy_name text,
        operation text,
        policy_definition text
      ) RETURNS void AS $$
      BEGIN
        EXECUTE format('CREATE POLICY IF NOT EXISTS %I ON storage.objects FOR %s %s', 
          policy_name, 
          operation,
          CASE 
            WHEN operation = 'INSERT' THEN 'WITH CHECK (' || policy_definition || ')'
            ELSE 'USING (' || policy_definition || ')'
          END
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: functionError } = await supabase.rpc('exec_sql', { sql: createHelperFunction });
    
    if (functionError) {
      console.log('⚠️  Could not create helper function, trying direct approach...');
      
      // Try direct SQL execution
      const policies = [
        {
          name: 'audio_tracks_insert_policy',
          operation: 'INSERT',
          definition: "bucket_id = 'audio-tracks' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text"
        },
        {
          name: 'audio_tracks_select_policy',
          operation: 'SELECT',
          definition: "bucket_id = 'audio-tracks' AND auth.role() = 'authenticated'"
        },
        {
          name: 'audio_tracks_update_policy',
          operation: 'UPDATE',
          definition: "bucket_id = 'audio-tracks' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text"
        },
        {
          name: 'audio_tracks_delete_policy',
          operation: 'DELETE',
          definition: "bucket_id = 'audio-tracks' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text"
        }
      ];

      console.log('\n📝 Creating policies manually...');
      console.log('Since automated creation failed, please create these policies manually in your Supabase dashboard:');
      
      policies.forEach((policy, index) => {
        console.log(`\n${index + 1}. ${policy.name}:`);
        console.log(`   Operation: ${policy.operation}`);
        console.log(`   Definition: ${policy.definition}`);
      });

      console.log('\n🎯 Manual Steps:');
      console.log('1. Go to Supabase Dashboard > Storage > audio-tracks bucket > Policies');
      console.log('2. Click "New Policy" for each policy above');
      console.log('3. Use the policy definitions provided');
      
      return;
    }

    console.log('✅ Helper function created');

    // Now create the policies using the helper function
    const policies = [
      {
        name: 'audio_tracks_insert_policy',
        operation: 'INSERT',
        definition: "bucket_id = 'audio-tracks' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text"
      },
      {
        name: 'audio_tracks_select_policy',
        operation: 'SELECT',
        definition: "bucket_id = 'audio-tracks' AND auth.role() = 'authenticated'"
      },
      {
        name: 'audio_tracks_update_policy',
        operation: 'UPDATE',
        definition: "bucket_id = 'audio-tracks' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text"
      },
      {
        name: 'audio_tracks_delete_policy',
        operation: 'DELETE',
        definition: "bucket_id = 'audio-tracks' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text"
      }
    ];

    for (let i = 0; i < policies.length; i++) {
      const policy = policies[i];
      console.log(`\n📝 Creating policy ${i + 1}/${policies.length}: ${policy.name}`);
      
      const { error: policyError } = await supabase.rpc('create_storage_policy', {
        policy_name: policy.name,
        operation: policy.operation,
        policy_definition: policy.definition
      });
      
      if (policyError) {
        console.error(`❌ Failed to create policy ${policy.name}:`, policyError);
      } else {
        console.log(`✅ Policy ${policy.name} created successfully`);
      }
    }

    console.log('\n🎉 Storage policies setup complete!');
    console.log('You should now be able to upload audio files from your application.');

  } catch (error) {
    console.error('❌ Error creating storage policies:', error);
  }
}

createStoragePoliciesV2();
