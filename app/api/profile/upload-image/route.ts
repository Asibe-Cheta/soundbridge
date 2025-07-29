import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '../../../../src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient();

    // Get user from request
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { imageUrl, type } = body;

    if (!imageUrl || !type) {
      return NextResponse.json(
        { success: false, error: 'Image URL and type are required' },
        { status: 400 }
      );
    }

    if (!['avatar', 'banner'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid image type. Must be "avatar" or "banner"' },
        { status: 400 }
      );
    }

    // Update profile with new image URL
    const updateData = type === 'avatar'
      ? { avatar_url: imageUrl }
      : { banner_url: imageUrl };

    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        avatar_url: profile.avatar_url,
        banner_url: profile.banner_url,
        updated_at: profile.updated_at
      }
    });

  } catch (error) {
    console.error('Profile image upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient();

    // Get user from request
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, avatar_url, banner_url, display_name, username')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Profile fetch error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        avatar_url: profile.avatar_url,
        banner_url: profile.banner_url,
        display_name: profile.display_name,
        username: profile.username
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 