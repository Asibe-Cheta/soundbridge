/**
 * Test script to verify database tables exist
 * Run this with: node scripts/test-database-tables.js
 */

const { createClient } = require('@supabase/supabase-js');

const testDatabaseTables = async () => {
  console.log('🧪 Testing Database Tables...\n');

  // Check if environment variables are set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase environment variables');
    console.log('💡 Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    return;
  }

  console.log('✅ Supabase environment variables found');
  console.log(`📝 URL: ${supabaseUrl.substring(0, 30)}...`);

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test each table
  const tables = [
    'creator_bank_accounts',
    'creator_revenue', 
    'tip_analytics',
    'creator_tips',
    'revenue_transactions'
  ];

  for (const tableName of tables) {
    try {
      console.log(`\n🔍 Testing table: ${tableName}`);
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log(`   ❌ Table '${tableName}' does not exist`);
          console.log(`   💡 Run the database setup script to create it`);
        } else {
          console.log(`   ⚠️  Error querying table: ${error.message}`);
        }
      } else {
        console.log(`   ✅ Table '${tableName}' exists and is accessible`);
        console.log(`   📊 Sample records: ${data ? data.length : 0}`);
      }
    } catch (err) {
      console.log(`   ❌ Exception testing table: ${err.message}`);
    }
  }

  // Test the revenue summary function
  console.log(`\n🔍 Testing function: get_creator_revenue_summary`);
  try {
    const { data, error } = await supabase
      .rpc('get_creator_revenue_summary', { user_uuid: '00000000-0000-0000-0000-000000000000' });

    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log(`   ❌ Function 'get_creator_revenue_summary' does not exist`);
        console.log(`   💡 Run the database setup script to create it`);
      } else {
        console.log(`   ⚠️  Error calling function: ${error.message}`);
      }
    } else {
      console.log(`   ✅ Function 'get_creator_revenue_summary' exists and is callable`);
    }
  } catch (err) {
    console.log(`   ❌ Exception testing function: ${err.message}`);
  }

  console.log('\n📋 Summary:');
  console.log('   If any tables are missing, run the database setup script:');
  console.log('   database/setup_bank_accounts.sql');
  console.log('\n💡 To run the script:');
  console.log('   1. Go to Supabase Dashboard');
  console.log('   2. Navigate to SQL Editor');
  console.log('   3. Copy and paste the setup script');
  console.log('   4. Click Run');
};

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Run the test
testDatabaseTables().catch(console.error);
