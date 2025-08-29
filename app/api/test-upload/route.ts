import { NextResponse } from 'next/server';
import { createApiClient } from '../../../src/lib/supabase';

export async function POST(request: Request) {
  try {
    console.log('🧪 Testing upload functionality...');
    const supabase = createApiClient();

    // Get user from request
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.log('✅ User authenticated:', user.id);

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    console.log('📁 File received:', {
      name: file?.name,
      size: file?.size,
      type: file?.type
    });
    
    if (!file) {
      console.error('❌ No file provided');
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

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
    
    console.log('✅ Avatars bucket found');

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `test-${user.id}-${Date.now()}.${fileExt}`;

    console.log('📤 Attempting upload to Supabase Storage:', fileName);
    
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ File upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }
    
    console.log('✅ File uploaded successfully:', uploadData);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;
    console.log('🔗 Generated public URL:', fileUrl);

    return NextResponse.json({
      success: true,
      message: 'Upload test successful',
      fileUrl: fileUrl,
      uploadData: uploadData
    });

  } catch (error) {
    console.error('❌ Upload test error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
