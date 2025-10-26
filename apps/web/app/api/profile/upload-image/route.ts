import { NextRequest, NextResponse } from 'next/server';
import { createApiClientWithCookies } from '@/src/lib/supabase-api';
import { createServiceClient } from '@/src/lib/supabase';

export async function POST(request: Request) {
  try {
    console.log('📤 Starting profile image upload...');
    
    // Create a route handler client that can access cookies
    const supabase = await createApiClientWithCookies();

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

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('❌ No file provided');
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('📁 File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('❌ Invalid file type:', file.type);
      return NextResponse.json(
        { success: false, error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size);
      return NextResponse.json(
        { success: false, error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Check if avatars bucket exists using service role client
    console.log('🔍 Checking avatars bucket...');
    const serviceRoleClient = createServiceClient();
    
    const { data: buckets, error: bucketsError } = await serviceRoleClient.storage.listBuckets();
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
    const fileExtension = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExtension}`;

    console.log('📝 Generated filename:', fileName);

    // Upload file to Supabase Storage
    console.log('📤 Uploading file to storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ File uploaded successfully:', uploadData);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;
    console.log('🔗 Public URL:', publicUrl);

    // Update user's profile with the new avatar URL
    console.log('📝 Updating user profile...');
    
    // First, try to update existing profile
    let { data: profileData, error: profileError } = await (supabase
      .from('profiles') as any)
      .update({ 
        avatar_url: publicUrl
      })
      .eq('id', user.id)
      .select()
      .single();

          // If profile doesn't exist, create it
      if (profileError && profileError.code === 'PGRST116') {
        console.log('📝 Profile not found, creating new profile...');
        
        // Generate username from email
        const emailUsername = user.email?.split('@')[0] || 'user';
        const username = `${emailUsername}_${Date.now().toString().slice(-6)}`;
        
        const { data: newProfileData, error: createError } = await (supabase
          .from('profiles') as any)
          .insert({
            id: user.id,
            username: username,
            display_name: user.email?.split('@')[0] || 'User',
            bio: null,
            avatar_url: publicUrl
          })
          .select()
          .single();

      if (createError) {
        console.error('❌ Profile creation failed:', createError);
        return NextResponse.json(
          { success: false, error: `Profile creation failed: ${createError.message}` },
          { status: 500 }
        );
      }

      profileData = newProfileData;
      profileError = null;
    } else if (profileError) {
      console.error('❌ Profile update failed:', profileError);
      return NextResponse.json(
        { success: false, error: `Profile update failed: ${profileError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Profile updated successfully:', profileData);

    return NextResponse.json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatarUrl: publicUrl,
      profile: profileData
    });

  } catch (error) {
    console.error('❌ Profile upload error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    console.log('📤 Getting profile data...');
    
    // Create a route handler client that can access cookies
    const supabase = await createApiClientWithCookies();

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

    // Get user's profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id as any)
      .single() as { data: any; error: any };

    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, return empty profile
      console.log('📝 Profile not found, returning empty profile');
      return NextResponse.json({
        success: true,
        profile: {
          id: user.id,
          username: null,
          display_name: null,
          bio: null,
          avatar_url: null
        }
      });
    } else if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile data' },
        { status: 500 }
      );
    }

    console.log('✅ Profile data retrieved:', profile);

    return NextResponse.json({
      success: true,
      profile: profile
    });

  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    console.log('📝 Updating profile data...');
    
    // Create a route handler client that can access cookies
    const supabase = await createApiClientWithCookies();

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

    // Parse the request body
    const body = await request.json();
    console.log('📝 Profile update data:', body);

    // Update the profile
    const { data: profileData, error: updateError } = await (supabase
      .from('profiles') as any)
      .update({
        display_name: body.display_name,
        username: body.username,
        bio: body.bio,
        location: body.location,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Profile update failed:', updateError);
      return NextResponse.json(
        { success: false, error: `Profile update failed: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Profile updated successfully:', profileData);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: profileData
    });

  } catch (error) {
    console.error('❌ Profile update error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}