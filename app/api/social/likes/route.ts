import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { socialService } from '@/src/lib/social-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content_id, content_type } = body;

    if (!content_id || !content_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await socialService.toggleLike(user.id, {
      content_id,
      content_type
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const content_id = searchParams.get('content_id');
    const content_type = searchParams.get('content_type') as 'track' | 'event' | 'comment';

    // If no specific content_id, return all liked content for the user
    if (!content_id || !content_type) {
      const { data: likes, error } = await supabase
        .from('likes')
        .select('content_id, content_type')
        .eq('user_id', user.id);

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch likes' }, { status: 500 });
      }

      return NextResponse.json({ data: likes || [] });
    }

    const result = await socialService.getLikes(content_id, content_type);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('Error getting likes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
