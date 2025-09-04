import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Profile update API called');
    
    // Get the user ID from the request body or headers
    const body = await request.json();
    const userId = body.userId;
    
    if (!userId) {
      console.error('❌ No user ID provided');
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    console.log('✅ User ID provided:', userId);
    const supabase = createServiceClient();
    console.log('📝 Profile update data:', body);
    const { 
      display_name, 
      username,
      avatar_url, 
      location, 
      bio, 
      genres, 
      profile_completed 
    } = body;

    // Update the user's profile
    const updateData: any = {};
    
    if (display_name) updateData.display_name = display_name;
    if (username) updateData.username = username;
    if (avatar_url) updateData.avatar_url = avatar_url;
    if (location) updateData.location = location;
    if (bio) updateData.bio = bio;
    if (genres) updateData.genres = genres;
    if (profile_completed !== undefined) updateData.profile_completed = profile_completed;

    console.log('📝 Updating profile with data:', updateData);
    
    // First, check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking profile:', checkError);
      return NextResponse.json(
        { success: false, error: `Failed to check profile: ${checkError.message}` },
        { status: 500 }
      );
    }

    let updatedProfile;
    if (existingProfile) {
      // Profile exists, update it
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating profile:', updateError);
        return NextResponse.json(
          { success: false, error: `Failed to update profile: ${updateError.message}` },
          { status: 500 }
        );
      }
      updatedProfile = data;
    } else {
      // Profile doesn't exist, create it
      const { data, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          ...updateData
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating profile:', createError);
        return NextResponse.json(
          { success: false, error: `Failed to create profile: ${createError.message}` },
          { status: 500 }
        );
      }
      updatedProfile = data;
    }

    console.log('✅ Profile updated successfully:', updatedProfile);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
