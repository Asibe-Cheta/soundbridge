import { NextRequest, NextResponse } from 'next/server';
import { createApiClientWithCookies } from '@/src/lib/supabase-api';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createApiClientWithCookies();
    const { following_id } = await request.json();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!following_id) {
      return NextResponse.json(
        { error: 'Following ID is required' },
        { status: 400 }
      );
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id as any)
      .eq('following_id', following_id as any)
      .single() as { data: any; error: any };

    if (existingFollow) {
      return NextResponse.json(
        { error: 'Already following this creator' },
        { status: 400 }
      );
    }

    // Create the follow relationship
    const { data: follow, error } = await (supabase
      .from('follows') as any)
      .insert({
        follower_id: user.id,
        following_id: following_id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating follow:', error);
      return NextResponse.json(
        { error: 'Failed to follow creator' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: follow
    });

  } catch (error) {
    console.error('Unexpected error following creator:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createApiClientWithCookies();
    const { searchParams } = new URL(request.url);
    const following_id = searchParams.get('following_id');

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!following_id) {
      return NextResponse.json(
        { error: 'Following ID is required' },
        { status: 400 }
      );
    }

    // Delete the follow relationship
    const { error } = await (supabase
      .from('follows') as any)
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', following_id);

    if (error) {
      console.error('Error deleting follow:', error);
      return NextResponse.json(
        { error: 'Failed to unfollow creator' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Unexpected error unfollowing creator:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createApiClientWithCookies();
    const { searchParams } = new URL(request.url);
    const following_id = searchParams.get('following_id');

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!following_id) {
      return NextResponse.json(
        { error: 'Following ID is required' },
        { status: 400 }
      );
    }

    // Check if following
    const { data: existingFollow, error } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id as any)
      .eq('following_id', following_id as any)
      .single() as { data: any; error: any };

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking follow status:', error);
      return NextResponse.json(
        { error: 'Failed to check follow status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      isFollowing: !!existingFollow,
      data: existingFollow
    });

  } catch (error) {
    console.error('Unexpected error checking follow status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
