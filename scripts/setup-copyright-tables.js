const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupCopyrightTables() {
  try {
    console.log('🔧 Setting up copyright protection tables...');

    // Create copyright_whitelist table
    console.log('\n📋 Creating copyright_whitelist table...');
    const createWhitelistTable = `
      CREATE TABLE IF NOT EXISTS copyright_whitelist (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        fingerprint_hash TEXT NOT NULL UNIQUE,
        track_title TEXT,
        artist_name TEXT,
        album_name TEXT,
        genre TEXT,
        duration INTEGER,
        file_size INTEGER,
        added_by UUID REFERENCES auth.users(id),
        added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        notes TEXT,
        is_active BOOLEAN DEFAULT true
      );
    `;

    const { error: whitelistError } = await supabase.rpc('exec_sql', { sql: createWhitelistTable });
    if (whitelistError) {
      console.log('⚠️  Could not create whitelist table via RPC, providing manual SQL...');
      console.log('Manual SQL for copyright_whitelist:');
      console.log(createWhitelistTable);
    } else {
      console.log('✅ copyright_whitelist table created');
    }

    // Create copyright_blacklist table
    console.log('\n📋 Creating copyright_blacklist table...');
    const createBlacklistTable = `
      CREATE TABLE IF NOT EXISTS copyright_blacklist (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        fingerprint_hash TEXT NOT NULL UNIQUE,
        track_title TEXT NOT NULL,
        artist_name TEXT NOT NULL,
        album_name TEXT,
        record_label TEXT,
        copyright_owner TEXT,
        duration INTEGER,
        file_size INTEGER,
        added_by UUID REFERENCES auth.users(id),
        added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        violation_type TEXT DEFAULT 'copyright',
        severity_level TEXT DEFAULT 'high',
        is_active BOOLEAN DEFAULT true,
        notes TEXT
      );
    `;

    const { error: blacklistError } = await supabase.rpc('exec_sql', { sql: createBlacklistTable });
    if (blacklistError) {
      console.log('⚠️  Could not create blacklist table via RPC, providing manual SQL...');
      console.log('Manual SQL for copyright_blacklist:');
      console.log(createBlacklistTable);
    } else {
      console.log('✅ copyright_blacklist table created');
    }

    // Create copyright_protection table
    console.log('\n📋 Creating copyright_protection table...');
    const createProtectionTable = `
      CREATE TABLE IF NOT EXISTS copyright_protection (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE,
        creator_id UUID REFERENCES auth.users(id),
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'flagged', 'blocked', 'manual_review')),
        check_type TEXT DEFAULT 'automated' CHECK (check_type IN ('automated', 'manual', 'ai_enhanced')),
        fingerprint_hash TEXT,
        confidence_score DECIMAL(5,4) DEFAULT 0.0,
        matched_track_info JSONB,
        violation_details JSONB,
        reviewed_by UUID REFERENCES auth.users(id),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        notes TEXT
      );
    `;

    const { error: protectionError } = await supabase.rpc('exec_sql', { sql: createProtectionTable });
    if (protectionError) {
      console.log('⚠️  Could not create protection table via RPC, providing manual SQL...');
      console.log('Manual SQL for copyright_protection:');
      console.log(createProtectionTable);
    } else {
      console.log('✅ copyright_protection table created');
    }

    // Create indexes for better performance
    console.log('\n📋 Creating indexes...');
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_copyright_whitelist_hash ON copyright_whitelist(fingerprint_hash);
      CREATE INDEX IF NOT EXISTS idx_copyright_blacklist_hash ON copyright_blacklist(fingerprint_hash);
      CREATE INDEX IF NOT EXISTS idx_copyright_protection_track_id ON copyright_protection(track_id);
      CREATE INDEX IF NOT EXISTS idx_copyright_protection_status ON copyright_protection(status);
      CREATE INDEX IF NOT EXISTS idx_copyright_protection_creator_id ON copyright_protection(creator_id);
    `;

    const { error: indexError } = await supabase.rpc('exec_sql', { sql: createIndexes });
    if (indexError) {
      console.log('⚠️  Could not create indexes via RPC, providing manual SQL...');
      console.log('Manual SQL for indexes:');
      console.log(createIndexes);
    } else {
      console.log('✅ Indexes created');
    }

    // Create RLS policies
    console.log('\n🔒 Creating RLS policies...');
    const createPolicies = `
      -- Enable RLS on all tables
      ALTER TABLE copyright_whitelist ENABLE ROW LEVEL SECURITY;
      ALTER TABLE copyright_blacklist ENABLE ROW LEVEL SECURITY;
      ALTER TABLE copyright_protection ENABLE ROW LEVEL SECURITY;

      -- Policies for copyright_whitelist
      CREATE POLICY "whitelist_select_policy" ON copyright_whitelist
        FOR SELECT USING (auth.role() = 'authenticated');

      CREATE POLICY "whitelist_insert_policy" ON copyright_whitelist
        FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = added_by);

      -- Policies for copyright_blacklist
      CREATE POLICY "blacklist_select_policy" ON copyright_blacklist
        FOR SELECT USING (auth.role() = 'authenticated');

      CREATE POLICY "blacklist_insert_policy" ON copyright_blacklist
        FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = added_by);

      -- Policies for copyright_protection
      CREATE POLICY "protection_select_policy" ON copyright_protection
        FOR SELECT USING (auth.role() = 'authenticated' AND (auth.uid() = creator_id OR auth.uid() = reviewed_by));

      CREATE POLICY "protection_insert_policy" ON copyright_protection
        FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = creator_id);

      CREATE POLICY "protection_update_policy" ON copyright_protection
        FOR UPDATE USING (auth.role() = 'authenticated' AND (auth.uid() = creator_id OR auth.uid() = reviewed_by));
    `;

    const { error: policyError } = await supabase.rpc('exec_sql', { sql: createPolicies });
    if (policyError) {
      console.log('⚠️  Could not create policies via RPC, providing manual SQL...');
      console.log('Manual SQL for policies:');
      console.log(createPolicies);
    } else {
      console.log('✅ RLS policies created');
    }

    console.log('\n🎉 Copyright protection tables setup complete!');
    console.log('You should now be able to upload tracks without copyright service errors.');

  } catch (error) {
    console.error('❌ Error setting up copyright tables:', error);
  }
}

setupCopyrightTables();
