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
      professional_headline,
      genres,
      website,
      phone,
      experience_level,
      profile_completed
    } = body;

    // Validate professional_headline length (must be <= 120 characters)
    if (professional_headline !== undefined && professional_headline !== null) {
      if (typeof professional_headline !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Professional headline must be a string' },
          { status: 400 }
        );
      }
      const trimmedHeadline = professional_headline.trim();
      if (trimmedHeadline.length > 120) {
        return NextResponse.json(
          { success: false, error: 'Professional headline must be 120 characters or less' },
          { status: 400 }
        );
      }
    }

    // Validate that bio and professional_headline are not swapped
    // If both are provided and they're identical, that's suspicious
    if (bio !== undefined && professional_headline !== undefined) {
      if (bio === professional_headline && bio && bio.trim().length > 0) {
        console.warn('⚠️ Warning: bio and professional_headline are identical - possible data issue');
        // Don't block, but log the warning
      }
    }

    // Update the user's profile
    const updateData: any = {};

    if (display_name !== undefined) updateData.display_name = display_name;
    if (username !== undefined) updateData.username = username;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (location !== undefined) updateData.location = location;
    if (bio !== undefined) updateData.bio = bio;
    if (professional_headline !== undefined) {
      // Trim and validate professional_headline
      updateData.professional_headline = professional_headline 
        ? professional_headline.trim().substring(0, 120) // Enforce 120 char limit
        : null;
    }
    if (genres !== undefined) updateData.genres = genres;
    if (website !== undefined) updateData.website = website;
    if (phone !== undefined) updateData.phone = phone;
    if (experience_level !== undefined) updateData.experience_level = experience_level;
    if (profile_completed !== undefined) updateData.profile_completed = profile_completed;

    // Always update timestamp
    updateData.updated_at = new Date().toISOString();

    console.log('📝 Updating profile with data:', updateData);
    
    // First, check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId as any)
      .maybeSingle() as { data: any; error: any };

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
      const { data, error: updateError } = await (supabase
        .from('profiles') as any)
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
      const { data, error: createError } = await (supabase
        .from('profiles') as any)
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
