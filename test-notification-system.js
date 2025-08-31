// Comprehensive Notification System Test
// Run this in the browser console on localhost:3000

async function testNotificationSystem() {
  console.log('🔍 Starting comprehensive notification system test...');
  
  try {
    // Test 1: Check authentication
    console.log('📋 Test 1: Checking authentication...');
    const authResponse = await fetch('/api/auth/user');
    const authResult = await authResponse.json();
    console.log('📋 Auth response:', authResult);
    
    if (!authResult.user?.id) {
      console.error('❌ Authentication failed - no user ID found');
      console.log('🔧 Please make sure you are logged in');
      return;
    }
    
    const userId = authResult.user.id;
    console.log('✅ User authenticated:', userId);
    
    // Test 2: Check if we can fetch notifications
    console.log('📋 Test 2: Fetching notifications...');
    const response = await fetch('/api/notifications');
    const result = await response.json();
    console.log('📋 Notifications response:', result);
    
    // Test 3: Check unread count
    console.log('🔢 Test 3: Checking unread count...');
    const countResponse = await fetch('/api/notifications?count=true');
    const countResult = await countResponse.json();
    console.log('🔢 Unread count response:', countResult);
    
    // Test 4: Create a test notification
    console.log('📝 Test 4: Creating test notification...');
    const testResponse = await fetch('/api/test-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        title: 'Test Notification',
        message: 'This is a test notification to verify the system works'
      })
    });
    const testResult = await testResponse.json();
    console.log('📝 Test notification result:', testResult);
    
    // Test 5: Check notifications again after creating test
    console.log('📋 Test 5: Checking notifications after test creation...');
    const response2 = await fetch('/api/notifications');
    const result2 = await response2.json();
    console.log('📋 Notifications after test:', result2);
    
    // Test 6: Check unread count again
    console.log('🔢 Test 6: Checking unread count after test...');
    const countResponse2 = await fetch('/api/notifications?count=true');
    const countResult2 = await countResponse2.json();
    console.log('🔢 Unread count after test:', countResult2);
    
    // Test 7: Test real-time subscription
    console.log('🔔 Test 7: Testing real-time subscription...');
    const { createBrowserClient } = await import('@/src/lib/supabase');
    const supabase = createBrowserClient();
    
    const subscription = supabase
      .channel('test-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔔 Real-time test received:', payload);
        }
      )
      .subscribe((status) => {
        console.log('🔔 Real-time test status:', status);
      });
    
    // Clean up subscription after 5 seconds
    setTimeout(() => {
      subscription.unsubscribe();
      console.log('🔔 Test subscription cleaned up');
    }, 5000);
    
    console.log('✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testNotificationSystem();
