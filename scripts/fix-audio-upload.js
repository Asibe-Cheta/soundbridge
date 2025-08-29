const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.log('Please make sure you have:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAudioUpload() {
  try {
    console.log('🔧 Fixing audio upload configuration...');

    // Check existing buckets
    console.log('📋 Checking existing buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }

    console.log('📦 Available buckets:', buckets.map(b => b.name));

    // Check if audio-tracks bucket exists
    const audioTracksBucket = buckets.find(bucket => bucket.name === 'audio-tracks');
    
    if (!audioTracksBucket) {
      console.log('📦 Creating audio-tracks bucket...');
      
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('audio-tracks', {
        public: false, // Private bucket for audio files
        allowedMimeTypes: [
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/x-wav',
          'audio/m4a',
          'audio/x-m4a',
          'audio/aac',
          'audio/ogg',
          'audio/webm',
          'audio/flac'
        ],
        fileSizeLimit: 52428800 // 50MB
      });

      if (createError) {
        console.error('❌ Error creating audio-tracks bucket:', createError);
        return;
      }

      console.log('✅ Audio-tracks bucket created successfully:', newBucket);
    } else {
      console.log('✅ Audio-tracks bucket already exists:', audioTracksBucket);
      
      // Check if the bucket has the correct MIME types
      if (!audioTracksBucket.allowedMimeTypes || !audioTracksBucket.allowedMimeTypes.includes('audio/mpeg')) {
        console.log('⚠️  Audio-tracks bucket missing audio/mpeg MIME type');
        console.log('Current allowed MIME types:', audioTracksBucket.allowedMimeTypes);
        
        // Note: Supabase doesn't allow updating bucket configuration via API
        console.log('🔧 Please manually update the audio-tracks bucket in your Supabase dashboard:');
        console.log('1. Go to Storage in your Supabase dashboard');
        console.log('2. Click on the audio-tracks bucket');
        console.log('3. Add these MIME types: audio/mpeg, audio/mp3, audio/wav, audio/m4a, audio/aac, audio/ogg, audio/webm, audio/flac');
      }
    }

    // Check if cover-art bucket exists
    const coverArtBucket = buckets.find(bucket => bucket.name === 'cover-art');
    
    if (!coverArtBucket) {
      console.log('📦 Creating cover-art bucket...');
      
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('cover-art', {
        public: true, // Public bucket for cover art
        allowedMimeTypes: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'image/avif'
        ],
        fileSizeLimit: 5242880 // 5MB
      });

      if (createError) {
        console.error('❌ Error creating cover-art bucket:', createError);
        return;
      }

      console.log('✅ Cover-art bucket created successfully:', newBucket);
    } else {
      console.log('✅ Cover-art bucket already exists:', coverArtBucket);
    }

    // Test upload to verify configuration
    console.log('🧪 Testing audio upload...');
    
    // Create a test MP3 file (just a small dummy file)
    const testContent = 'test audio content';
    const testFile = new File([testContent], 'test.mp3', { type: 'audio/mpeg' });
    
    const testFileName = `test/${Date.now()}_test.mp3`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-tracks')
      .upload(testFileName, testFile);

    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError);
      console.log('This indicates the bucket configuration needs to be fixed.');
      console.log('Please check the MIME type configuration in your Supabase dashboard.');
    } else {
      console.log('✅ Test upload successful:', uploadData);
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('audio-tracks')
        .remove([testFileName]);
      
      if (deleteError) {
        console.log('⚠️  Could not clean up test file:', deleteError);
      } else {
        console.log('🧹 Test file cleaned up');
      }
    }

    console.log('\n🎉 Audio upload configuration check complete!');
    console.log('If you still get MIME type errors, please:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to Storage');
    console.log('3. Click on the audio-tracks bucket');
    console.log('4. Ensure these MIME types are allowed:');
    console.log('   - audio/mpeg');
    console.log('   - audio/mp3');
    console.log('   - audio/wav');
    console.log('   - audio/m4a');
    console.log('   - audio/aac');
    console.log('   - audio/ogg');
    console.log('   - audio/webm');
    console.log('   - audio/flac');

  } catch (error) {
    console.error('❌ Error fixing audio upload:', error);
  }
}

fixAudioUpload();
