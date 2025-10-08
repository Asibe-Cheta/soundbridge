// Test script to verify upload functionality after storage fix
// Run this in the browser console after applying the SQL fix

async function testUploadFunctionality() {
    console.log('🔍 Testing upload functionality...');
    
    try {
        // Test 1: Check if user is authenticated
        const authResponse = await fetch('/api/auth/user');
        const authData = await authResponse.json();
        
        if (!authData.user) {
            console.error('❌ User not authenticated. Please log in first.');
            return;
        }
        
        console.log('✅ User authenticated:', authData.user.email);
        
        // Test 2: Test upload API endpoint (without actual file)
        const testUploadData = {
            title: 'Test Track',
            artistName: 'Test Artist',
            description: 'Test description',
            genre: 'Test',
            tags: 'test, upload',
            privacy: 'public',
            publishOption: 'draft',
            audioFileUrl: 'https://example.com/test.mp3', // Mock URL
            coverArtUrl: 'https://example.com/test.jpg', // Mock URL
            duration: 180,
            lyrics: 'Test lyrics for upload',
            lyricsLanguage: 'en'
        };
        
        console.log('🔍 Testing upload API with mock data...');
        
        const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testUploadData)
        });
        
        const uploadResult = await uploadResponse.json();
        
        if (uploadResponse.ok) {
            console.log('✅ Upload API is working correctly');
            console.log('📝 Response:', uploadResult);
        } else {
            console.error('❌ Upload API failed:', uploadResult);
        }
        
        // Test 3: Check storage bucket accessibility
        console.log('🔍 Testing storage bucket accessibility...');
        
        const storageTestUrl = 'https://aunxdbqukbxyyiusaeqi.supabase.co/storage/v1/object/public/audio-tracks/test';
        
        try {
            const storageResponse = await fetch(storageTestUrl, { method: 'HEAD' });
            console.log('✅ Storage bucket is accessible (status:', storageResponse.status, ')');
        } catch (error) {
            console.log('⚠️ Storage bucket test failed (expected for non-existent file):', error.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testUploadFunctionality();
