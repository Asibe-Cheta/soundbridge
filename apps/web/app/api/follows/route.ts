import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

async function resolveFollowingId(request: NextRequest): Promise<string | null> {
  const { searchParams } = new URL(request.url);
  const fromQuery = searchParams.get('following_id');
  if (fromQuery) return fromQuery;

  const body = await request.clone().json().catch(() => ({}));
  if (body && typeof body.following_id === 'string' && body.following_id.trim()) {
    return body.following_id.trim();
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders },
      );
    }

    const body = await request.json().catch(() => ({}));
    const following_id =
      typeof body.following_id === 'string' ? body.following_id.trim() : '';

    if (!following_id) {
      return NextResponse.json(
        { error: 'Following ID is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: existingFollow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', following_id)
      .maybeSingle();

    if (existingFollow) {
      return NextResponse.json(
        { success: true, isFollowing: true, data: existingFollow },
        { headers: corsHeaders },
      );
    }

    const { data: follow, error } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating follow:', error);
      return NextResponse.json(
        { error: 'Failed to follow creator' },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      {
        success: true,
        isFollowing: true,
        data: follow,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Unexpected error following creator:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders },
      );
    }

    const following_id = await resolveFollowingId(request);

    if (!following_id) {
      return NextResponse.json(
        { error: 'Following ID is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', following_id);

    if (error) {
      console.error('Error deleting follow:', error);
      return NextResponse.json(
        { error: 'Failed to unfollow creator' },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json({ success: true, isFollowing: false }, { headers: corsHeaders });
  } catch (error) {
    console.error('Unexpected error unfollowing creator:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders },
      );
    }

    const { searchParams } = new URL(request.url);
    const following_id = searchParams.get('following_id');

    if (!following_id) {
      return NextResponse.json(
        { error: 'Following ID is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: existingFollow, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', following_id)
      .maybeSingle();

    if (error) {
      console.error('Error checking follow status:', error);
      return NextResponse.json(
        { error: 'Failed to check follow status' },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      {
        isFollowing: !!existingFollow,
        data: existingFollow,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Unexpected error checking follow status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
