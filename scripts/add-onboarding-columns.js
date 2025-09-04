const { createClient } = require('@supabase/supabase-js');

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

async function addOnboardingColumns() {
  try {
    console.log('🚀 Adding onboarding columns to profiles table...');
    
    // Add columns one by one using direct SQL execution
    const columns = [
      {
        name: 'onboarding_completed',
        sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;'
      },
      {
        name: 'onboarding_step',
        sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT \'role_selection\';'
      },
      {
        name: 'selected_role',
        sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selected_role TEXT;'
      },
      {
        name: 'profile_completed',
        sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;'
      },
      {
        name: 'first_action_completed',
        sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_action_completed BOOLEAN DEFAULT FALSE;'
      },
      {
        name: 'onboarding_skipped',
        sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN DEFAULT FALSE;'
      },
      {
        name: 'onboarding_completed_at',
        sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;'
      }
    ];
    
    for (const column of columns) {
      console.log(`📝 Adding column: ${column.name}`);
      
      try {
        // Use the REST API to execute SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({ sql: column.sql })
        });
        
        if (response.ok) {
          console.log(`✅ Column ${column.name} added successfully`);
        } else {
          console.log(`⚠️  Column ${column.name} might already exist or there was an issue`);
        }
      } catch (error) {
        console.log(`⚠️  Column ${column.name} - ${error.message}`);
      }
    }
    
    // Update existing users to have onboarding_completed = true
    console.log('\n🔄 Updating existing users...');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_step: 'completed',
        onboarding_completed_at: new Date().toISOString()
      })
      .is('onboarding_completed', null);
    
    if (updateError) {
      console.log('⚠️  Could not update existing users:', updateError.message);
    } else {
      console.log('✅ Existing users updated to skip onboarding');
    }
    
    // Test the columns by selecting from profiles
    console.log('\n🔍 Testing the new columns...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id, onboarding_completed, onboarding_step, selected_role')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error testing columns:', testError.message);
    } else {
      console.log('✅ Columns are working correctly');
      console.log('📊 Sample data:', testData[0] || 'No profiles found');
    }
    
    console.log('\n🎉 Onboarding columns setup completed!');
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
addOnboardingColumns();

