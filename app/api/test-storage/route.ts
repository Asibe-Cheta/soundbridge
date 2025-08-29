import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    console.log('🧪 Testing storage functionality...');
    
    // Create a route handler client that can access cookies
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get user from request cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.log('✅ User authenticated:', user.id);

    // Check if avatars bucket exists
    console.log('🔍 Checking if avatars bucket exists...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return NextResponse.json(
        { success: false, error: 'Storage service unavailable' },
        { status: 500 }
      );
    }
    
    const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');
    if (!avatarsBucket) {
      console.error('❌ Avatars bucket not found. Available buckets:', buckets.map(b => b.name));
      return NextResponse.json(
        { success: false, error: 'Storage bucket not configured' },
        { status: 500 }
      );
    }
    
    console.log('✅ Avatars bucket found:', avatarsBucket);

    // Try to list files in the bucket (this tests read access)
    console.log('🔍 Testing read access to avatars bucket...');
    const { data: files, error: listError } = await supabase.storage
      .from('avatars')
      .list();

    if (listError) {
      console.error('❌ Error listing files:', listError);
      return NextResponse.json(
        { success: false, error: `Read access failed: ${listError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Read access successful. Files in bucket:', files);

    // Try to upload a small test file
    console.log('📤 Testing upload access...');
    const testContent = 'This is a test file for storage access';
    const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
    const testFileName = `test-${user.id}-${Date.now()}.txt`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(testFileName, testFile, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
      return NextResponse.json(
        { success: false, error: `Upload access failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Upload test successful:', uploadData);

    // Clean up - delete the test file
    console.log('🧹 Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([testFileName]);

    if (deleteError) {
      console.warn('⚠️ Could not delete test file:', deleteError);
    } else {
      console.log('✅ Test file cleaned up');
    }

    return NextResponse.json({
      success: true,
      message: 'Storage test successful',
      bucket: avatarsBucket,
      files: files,
      uploadTest: uploadData
    });

  } catch (error) {
    console.error('❌ Storage test error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
