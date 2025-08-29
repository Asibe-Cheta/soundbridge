// Test authentication state
const BASE_URL = 'http://localhost:3000';

async function testAuth() {
  console.log('🔐 Testing Authentication State...\n');
  
  try {
    // Test if we can access the upload page
    const response = await fetch(`${BASE_URL}/upload`);
    const html = await response.text();
    
    console.log(`📄 Upload page status: ${response.status}`);
    
    // Check if the page contains authentication required message
    if (html.includes('Authentication Required')) {
      console.log('❌ Authentication Required message found');
      console.log('   This means the user is not authenticated');
    } else if (html.includes('Upload Audio')) {
      console.log('✅ Upload page content found');
      console.log('   This means the user is authenticated');
    } else {
      console.log('⚠️  Unknown page content');
    }
    
    // Test the auth API endpoint
    console.log('\n🔍 Testing Auth API...');
    const authResponse = await fetch(`${BASE_URL}/api/test-auth`);
    const authData = await authResponse.json();
    console.log(`   Auth API status: ${authResponse.status}`);
    console.log(`   Auth data:`, authData);
    
  } catch (error) {
    console.log('❌ Error testing auth:', error.message);
  }
  
  console.log('\n📝 Next Steps:');
  console.log('1. Open browser console on upload page');
  console.log('2. Look for "UploadPage Auth State:" logs');
  console.log('3. Check if user is null or loading is true');
  console.log('4. Try refreshing the page');
}

testAuth();
