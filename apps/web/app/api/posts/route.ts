/**
 * Posts API Endpoints
 * 
 * POST /api/posts - Create a new post
 * 
 * Request Body:
 * {
 *   "content": "Just wrapped recording my debut EP! 🎵",
 *   "visibility": "connections", // or "public"
 *   "post_type": "update", // "update", "opportunity", "achievement", "collaboration", "event"
 *   "event_id": "optional-event-uuid"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "post-uuid",
 *     "user_id": "user-uuid",
 *     "content": "...",
 *     "visibility": "connections",
 *     "post_type": "update",
 *     "created_at": "...",
 *     "author": { ... }
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Create Post API called');

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request body
    const body = await request.json();
    const { content, visibility = 'connections', post_type = 'update', event_id } = body;

    // Validation
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Content must be 500 characters or less' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['connections', 'public'].includes(visibility)) {
      return NextResponse.json(
        { success: false, error: 'Visibility must be "connections" or "public"' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['update', 'opportunity', 'achievement', 'collaboration', 'event'].includes(post_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post_type' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content: content.trim(),
        visibility,
        post_type,
        event_id: event_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (postError) {
      console.error('❌ Error creating post:', postError);
      return NextResponse.json(
        { success: false, error: 'Failed to create post', details: postError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get author profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, professional_headline')
      .eq('id', user.id)
      .single();

    // Get attachments if any (for future use)
    const { data: attachments } = await supabase
      .from('post_attachments')
      .select('*')
      .eq('post_id', post.id);

    console.log('✅ Post created successfully:', post.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...post,
          author: {
            id: user.id,
            name: profile?.display_name || profile?.username || 'Unknown',
            username: profile?.username,
            avatar_url: profile?.avatar_url,
            role: profile?.professional_headline,
          },
          attachments: attachments || [],
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error creating post:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

