import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { clearCommunityEntryAttributionClient } from '@/src/lib/community-entry';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: 'follow' | 'explore';
      creatorId?: string;
    };

    if (body.action !== 'follow' && body.action !== 'explore') {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('community_entry_creator_id, community_entry_shown_at')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile?.community_entry_creator_id) {
      return NextResponse.json(
        { success: false, error: 'No community entry pending' },
        { status: 400, headers: corsHeaders },
      );
    }

    const creatorId = body.creatorId || profile.community_entry_creator_id;
    if (creatorId !== profile.community_entry_creator_id) {
      return NextResponse.json(
        { success: false, error: 'Creator mismatch' },
        { status: 400, headers: corsHeaders },
      );
    }

    if (body.action === 'follow' && creatorId !== user.id) {
      const { error: followError } = await supabase.from('follows').insert({
        follower_id: user.id,
        following_id: creatorId,
      });
      if (followError && followError.code !== '23505') {
        console.error('[community-entry] follow failed:', followError.message);
        return NextResponse.json(
          { success: false, error: 'Failed to follow creator' },
          { status: 500, headers: corsHeaders },
        );
      }
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        community_entry_shown_at: profile.community_entry_shown_at ?? now,
        updated_at: now,
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to record welcome completion' },
        { status: 500, headers: corsHeaders },
      );
    }

    const { data: creator } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', creatorId)
      .maybeSingle();

    const username = creator?.username;
    const redirectTo =
      body.action === 'follow' && username
        ? `/creator/${encodeURIComponent(username)}`
        : '/feed';

    const response = NextResponse.json(
      {
        success: true,
        redirectTo,
      },
      { headers: corsHeaders },
    );

    return response;
  } catch (error) {
    console.error('[community-entry] complete error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
