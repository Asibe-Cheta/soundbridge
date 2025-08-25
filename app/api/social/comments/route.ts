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
    const { content_id, content_type, content, parent_comment_id } = body;

    if (!content_id || !content_type || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await socialService.createComment(user.id, {
      content_id,
      content_type,
      content,
      parent_comment_id
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const content_id = searchParams.get('content_id');
    const content_type = searchParams.get('content_type') as 'track' | 'event';
    const parent_comment_id = searchParams.get('parent_comment_id');
    const user_id = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const filters = {
      content_id: content_id || undefined,
      content_type,
      parent_comment_id: parent_comment_id || undefined,
      user_id: user_id || undefined,
      limit,
      offset
    };

    const result = await socialService.getComments(filters);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('Error getting comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
