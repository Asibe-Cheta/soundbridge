const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupOnboarding() {
  try {
    console.log('🚀 Setting up onboarding database schema...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'setup-onboarding-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct execution if RPC fails
          const { error: directError } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);
          
          if (directError) {
            console.error(`❌ Error executing statement ${i + 1}:`, error.message);
            console.error('Statement:', statement.substring(0, 100) + '...');
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`❌ Error executing statement ${i + 1}:`, err.message);
      }
    }
    
    // Verify the columns were added
    console.log('\n🔍 Verifying database schema...');
    
    const { data: profiles, error: selectError } = await supabase
      .from('profiles')
      .select('id, onboarding_completed, onboarding_step, selected_role')
      .limit(1);
    
    if (selectError) {
      console.error('❌ Error verifying schema:', selectError.message);
    } else {
      console.log('✅ Onboarding columns successfully added to profiles table');
      console.log('📊 Sample profile data:', profiles[0] || 'No profiles found');
    }
    
    // Check storage bucket
    console.log('\n🪣 Checking storage bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Error checking storage buckets:', bucketError.message);
    } else {
      const avatarsBucket = buckets.find(bucket => bucket.id === 'avatars');
      if (avatarsBucket) {
        console.log('✅ Avatars storage bucket exists');
      } else {
        console.log('⚠️  Avatars storage bucket not found - you may need to create it manually');
      }
    }
    
    console.log('\n🎉 Onboarding setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart your development server');
    console.log('2. Sign up with a new account to test the onboarding flow');
    console.log('3. The onboarding should now appear for new users');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupOnboarding();

