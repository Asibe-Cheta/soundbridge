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

// This endpoint handles both singular and plural bookmark requests
// POST /api/social/bookmarks - Toggle bookmark (for mobile app compatibility)
// GET /api/social/bookmarks - Get all bookmarks

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
    const content_type = searchParams.get('content_type') as 'track' | 'event' | 'post' | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await socialService.getBookmarks(user.id, content_type || undefined);
    
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400, headers: corsHeaders });
    }

    // Apply pagination
    const bookmarks = result.data || [];
    const paginatedBookmarks = bookmarks.slice(offset, offset + limit);

    return NextResponse.json({ 
      success: true,
      data: paginatedBookmarks,
      pagination: {
        total: bookmarks.length,
        limit,
        offset,
        has_more: offset + limit < bookmarks.length
      }
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error getting bookmarks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

