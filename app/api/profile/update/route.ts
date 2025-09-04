import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
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

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      );
    }

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
