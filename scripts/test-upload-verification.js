// Test Upload Verification Script
// Run this to check if uploads and copyright protection are working

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUploads() {
  console.log('🔍 Checking uploads and copyright protection...\n');

  try {
    // Check audio tracks
    console.log('📊 Audio Tracks:');
    const { data: tracks, error: tracksError } = await supabase
      .from('audio_tracks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (tracksError) {
      console.error('❌ Error fetching audio tracks:', tracksError);
    } else {
      console.log(`✅ Found ${tracks.length} audio tracks`);
      tracks.forEach((track, index) => {
        console.log(`  ${index + 1}. ${track.title} (${track.genre || 'No genre'}) - ${track.created_at}`);
      });
    }

    // Check copyright protection records
    console.log('\n🛡️ Copyright Protection Records:');
    const { data: copyrightRecords, error: copyrightError } = await supabase
      .from('copyright_protection')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (copyrightError) {
      console.error('❌ Error fetching copyright records:', copyrightError);
    } else {
      console.log(`✅ Found ${copyrightRecords.length} copyright protection records`);
      copyrightRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. Track ID: ${record.track_id} - Status: ${record.status} - Confidence: ${record.confidence_score}`);
      });
    }

    // Check copyright violations
    console.log('\n🚨 Copyright Violations:');
    const { data: violations, error: violationsError } = await supabase
      .from('copyright_violations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (violationsError) {
      console.error('❌ Error fetching violations:', violationsError);
    } else {
      console.log(`✅ Found ${violations.length} copyright violations`);
      violations.forEach((violation, index) => {
        console.log(`  ${index + 1}. Track ID: ${violation.track_id} - Type: ${violation.violation_type} - Status: ${violation.status}`);
      });
    }

    // Check DMCA requests
    console.log('\n📋 DMCA Requests:');
    const { data: dmcaRequests, error: dmcaError } = await supabase
      .from('dmca_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (dmcaError) {
      console.error('❌ Error fetching DMCA requests:', dmcaError);
    } else {
      console.log(`✅ Found ${dmcaRequests.length} DMCA requests`);
      dmcaRequests.forEach((request, index) => {
        console.log(`  ${index + 1}. Track ID: ${request.track_id} - Requester: ${request.requester_name} - Status: ${request.status}`);
      });
    }

    // Check whitelist/blacklist
    console.log('\n📝 Whitelist/Blacklist:');
    const { data: whitelist, error: whitelistError } = await supabase
      .from('copyright_whitelist')
      .select('*')
      .limit(3);

    const { data: blacklist, error: blacklistError } = await supabase
      .from('copyright_blacklist')
      .select('*')
      .limit(3);

    if (whitelistError) {
      console.error('❌ Error fetching whitelist:', whitelistError);
    } else {
      console.log(`✅ Found ${whitelist.length} whitelist entries`);
    }

    if (blacklistError) {
      console.error('❌ Error fetching blacklist:', blacklistError);
    } else {
      console.log(`✅ Found ${blacklist.length} blacklist entries`);
    }

    console.log('\n🎉 Verification complete!');
    console.log('\n📋 Summary:');
    console.log(`- Audio Tracks: ${tracks?.length || 0}`);
    console.log(`- Copyright Records: ${copyrightRecords?.length || 0}`);
    console.log(`- Violations: ${violations?.length || 0}`);
    console.log(`- DMCA Requests: ${dmcaRequests?.length || 0}`);
    console.log(`- Whitelist: ${whitelist?.length || 0}`);
    console.log(`- Blacklist: ${blacklist?.length || 0}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the verification
checkUploads();
