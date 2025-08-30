// Test script to check if event-images bucket exists and has correct permissions
// Run this in the browser console on your homepage

async function testStorageBucket() {
  try {
    console.log('🔍 Testing event-images bucket...');
    
    // Test if we can list files in the bucket
    const { data: files, error: listError } = await supabase.storage
      .from('event-images')
      .list();
    
    if (listError) {
      console.error('❌ Error listing files:', listError);
      if (listError.message.includes('not found')) {
        console.error('❌ The event-images bucket does not exist!');
        console.log('💡 Please create the event-images bucket in your Supabase Storage dashboard');
      }
      return false;
    }
    
    console.log('✅ event-images bucket exists and is accessible');
    console.log('📁 Files in bucket:', files);
    
    // Test if we can upload a small test file
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const testPath = `${Date.now()}_test.txt`;
    
    console.log('🔄 Testing upload to event-images bucket...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(testPath, testFile);
    
    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
      return false;
    }
    
    console.log('✅ Upload test successful:', uploadData);
    
    // Clean up test file
    const { error: deleteError } = await supabase.storage
      .from('event-images')
      .remove([testPath]);
    
    if (deleteError) {
      console.warn('⚠️ Could not delete test file:', deleteError);
    } else {
      console.log('✅ Test file cleaned up');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
testStorageBucket().then(success => {
  if (success) {
    console.log('🎉 Storage bucket test passed! The issue might be elsewhere.');
  } else {
    console.log('💥 Storage bucket test failed! Check the bucket configuration.');
  }
});
