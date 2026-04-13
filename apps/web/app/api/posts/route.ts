/**
 * Posts API Endpoints
 *
 * POST /api/posts - Create a new post
 *
 * Request Body:
 * {
 *   "content": "Just wrapped recording my debut EP!",
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
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

const DB_POST_TYPES = ['update', 'opportunity', 'achievement', 'collaboration', 'event'] as const;
const POST_TYPE_ALIASES: Record<string, (typeof DB_POST_TYPES)[number]> = {
  welcome: 'achievement',
  intro: 'achievement',
  onboarding: 'achievement',
  system: 'achievement',
  milestone: 'achievement',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('[posts] Create Post API called');

    let supabase: Awaited<ReturnType<typeof getSupabaseRouteClient>>['supabase'];
    let user: Awaited<ReturnType<typeof getSupabaseRouteClient>>['user'];
    let authError: Awaited<ReturnType<typeof getSupabaseRouteClient>>['error'];
    try {
      const auth = await getSupabaseRouteClient(request, true);
      supabase = auth.supabase;
      user = auth.user;
      authError = auth.error;
    } catch (configErr: unknown) {
      const msg = configErr instanceof Error ? configErr.message : String(configErr);
      console.error('Create post: Supabase client init failed:', configErr);
      return NextResponse.json(
        { success: false, error: 'Service unavailable', details: msg },
        { status: 503, headers: corsHeaders }
      );
    }

    if (authError || !user) {
      console.error('[posts] Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('[posts] User authenticated:', user.id);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400, headers: corsHeaders }
      );
    }

    const rawContent =
      (typeof body.content === 'string' && body.content) ||
      (typeof body.text === 'string' && body.text) ||
      (typeof body.body === 'string' && body.body) ||
      (typeof body.message === 'string' && body.message) ||
      '';
    const visibility = typeof body.visibility === 'string' ? body.visibility : 'connections';
    const rawPostType =
      (typeof body.post_type === 'string' && body.post_type) ||
      (typeof body.postType === 'string' && body.postType) ||
      'update';
    const postTypeKey = String(rawPostType).toLowerCase();
    const event_id = body.event_id ?? body.eventId;
    const imageUrls = body.image_urls ?? body.imageUrls;

    const post_type =
      POST_TYPE_ALIASES[postTypeKey] ??
      (DB_POST_TYPES.includes(postTypeKey as (typeof DB_POST_TYPES)[number])
        ? (postTypeKey as (typeof DB_POST_TYPES)[number])
        : null);

    const introLike =
      body.intro_post === true ||
      body.is_intro === true ||
      ['welcome', 'intro', 'onboarding', 'system'].includes(postTypeKey);

    // Validation (3,000 char limit per WEB_TEAM_UX_POST; min 10 non-whitespace unless intro-style)
    const trimmed = typeof rawContent === 'string' ? rawContent.trim() : '';
    if (!trimmed) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400, headers: corsHeaders }
      );
    }
    if (!introLike && trimmed.replace(/\s/g, '').length < 10) {
      return NextResponse.json(
        { success: false, error: 'Content must have at least 10 non-whitespace characters' },
        { status: 400, headers: corsHeaders }
      );
    }
    if (trimmed.length > 3000) {
      return NextResponse.json(
        { success: false, error: 'Content must be 3,000 characters or less' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['connections', 'public'].includes(visibility)) {
      return NextResponse.json(
        { success: false, error: 'Visibility must be "connections" or "public"' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!post_type) {
      return NextResponse.json(
        { success: false, error: 'Invalid post_type' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Build insert payload (image_urls optional, max 20)
    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      content: trimmed,
      visibility,
      post_type,
      event_id: (typeof event_id === 'string' && event_id) || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      insertPayload.image_urls = imageUrls.slice(0, 20).map((u) => String(u));
    }

    // Create post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert(insertPayload)
      .select()
      .single();

    if (postError) {
      console.error('[posts] Error creating post:', postError);
      return NextResponse.json(
        { success: false, error: 'Failed to create post', details: postError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get author profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, role, trusted_flagger')
      .eq('id', user.id)
      .single();

    // Get attachments if any (for future use)
    const { data: attachments } = await supabase
      .from('post_attachments')
      .select('*')
      .eq('post_id', post.id);

    console.log('[posts] Post created successfully:', post.id);

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
            role: profile?.role,
            headline: profile?.bio ? String(profile.bio).slice(0, 120) : null,
            is_verified: profile?.trusted_flagger === true,
          },
          attachments: attachments || [],
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[posts] Unexpected error creating post:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: message },
      { status: 500, headers: corsHeaders }
    );
  }
}
