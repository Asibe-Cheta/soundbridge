import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders },
      );
    }

    const { id: following_id } = await params;

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
