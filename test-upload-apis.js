// Test script for upload APIs
const BASE_URL = 'http://localhost:3000';

async function testAPI(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    console.log(`✅ ${method} ${endpoint}: ${response.status}`);
    console.log(`   Response:`, data);
    return { status: response.status, data };
  } catch (error) {
    console.log(`❌ ${method} ${endpoint}: Error`);
    console.log(`   Error:`, error.message);
    return { status: 'error', error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing Upload APIs...\n');
  
  // Test public endpoints
  console.log('📋 Testing Public Endpoints:');
  await testAPI('/api/events');
  await testAPI('/api/search');
  await testAPI('/api/creators');
  
  console.log('\n🔐 Testing Protected Endpoints (should return 401):');
  await testAPI('/api/upload');
  await testAPI('/api/events', 'POST', { title: 'Test Event' });
  await testAPI('/api/profile/upload-image');
  
  console.log('\n✅ Upload API Tests Complete!');
  console.log('\n📝 Manual Testing Required:');
  console.log('1. Go to http://localhost:3000/upload');
  console.log('2. Test audio file upload with drag & drop');
  console.log('3. Test cover art upload');
  console.log('4. Fill in metadata and publish');
  console.log('5. Go to http://localhost:3000/events/create');
  console.log('6. Test event creation with image upload');
}

runTests();
