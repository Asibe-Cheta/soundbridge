// Test script to verify audio file accessibility after storage fix
// Run this in the browser console after applying the SQL fix

async function testAudioFileAccess() {
    const testUrl = 'https://aunxdbqukbxyyiusaeqi.supabase.co/storage/v1/object/public/audio-tracks/bd8a455d-a54d-45c5-968d-e4cf5e8d928e/1758848530266.mp3';
    
    console.log('🔍 Testing audio file accessibility...');
    console.log('📁 URL:', testUrl);
    
    try {
        // Test HEAD request (what the audio player does)
        const response = await fetch(testUrl, { method: 'HEAD' });
        console.log('✅ Response status:', response.status);
        console.log('✅ Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            console.log('🎉 SUCCESS: Audio file is now accessible!');
            
            // Test actual audio loading
            const audio = new Audio(testUrl);
            audio.addEventListener('loadedmetadata', () => {
                console.log('🎵 Audio metadata loaded successfully');
                console.log('🎵 Duration:', audio.duration, 'seconds');
            });
            audio.addEventListener('error', (e) => {
                console.error('❌ Audio loading error:', e);
            });
            audio.load();
            
        } else {
            console.error('❌ FAILED: Audio file still not accessible');
            console.error('❌ Status:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('❌ Network error:', error);
    }
}

// Run the test
testAudioFileAccess();
