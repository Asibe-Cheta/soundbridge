import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { socialService } from '@/src/lib/social-service';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json();
    const { content_id, content_type } = body;

    if (!content_id || !content_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders });
    }

    // Validate content type
    if (!['track', 'event', 'post'].includes(content_type)) {
      return NextResponse.json(
        { error: 'Invalid content type. Must be "track", "event", or "post"' },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await socialService.toggleBookmark(user.id, {
      content_id,
      content_type: content_type as 'track' | 'event' | 'post'
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json({ 
      success: true,
      data: result.data 
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { searchParams } = new URL(request.url);
    const content_id = searchParams.get('content_id');
    const content_type = searchParams.get('content_type') as 'track' | 'event' | 'post' | null;

    // If no specific content_id, return all bookmarks for the user
    if (!content_id || !content_type) {
      const result = await socialService.getBookmarks(user.id, content_type || undefined);
      
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400, headers: corsHeaders });
      }

      return NextResponse.json({ 
        success: true,
        data: result.data || [] 
      }, { headers: corsHeaders });
    }

    // Check if specific content is bookmarked
    const { data: bookmark, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', user.id)
      .eq('content_id', content_id)
      .eq('content_type', content_type)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return NextResponse.json({ error: 'Failed to check bookmark status' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ 
      success: true,
      data: bookmark ? true : false 
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error getting bookmarks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

