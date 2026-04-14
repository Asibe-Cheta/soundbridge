import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { withAuthTimeout, withQueryTimeout, logPerformance, createErrorResponse } from '@/lib/api-helpers';

// CRITICAL: Force dynamic rendering to prevent Vercel edge caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('Feed API called');

    const { user, error: authError } = await withAuthTimeout(
      getSupabaseRouteClient(request, true),
      5000
    );

    if (authError || !user) {
      console.error('Feed auth failed');
      logPerformance('/api/posts/feed', startTime);
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          data: { posts: [], pagination: { page: 1, limit: 15, total: 0, has_more: false } }
        },
        { status: 401, headers: corsHeaders }
      );
    }

    const service = createServiceClient();

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 50);
    const offset = (page - 1) * limit;
    // 1) Base posts query (mobile source of truth)
    const { data: posts, error: postsError } = await withQueryTimeout(
      service
        .from('posts')
        .select('id, user_id, content, post_type, visibility, event_id, created_at, updated_at, reposted_from_id')
        .is('deleted_at', null)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      12000
    ) as any;

    if (postsError) {
      throw postsError;
    }

    const postRows = posts || [];
    if (postRows.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            posts: [],
            pagination: { page, limit, total: 0, has_more: false },
          },
        },
        { headers: corsHeaders }
      );
    }

    const postIds = postRows.map((p: any) => p.id);
    const userIds = Array.from(new Set(postRows.map((p: any) => p.user_id)));

    // 2) Author profiles
    const { data: authors } = await withQueryTimeout(
      service
        .from('profiles')
        .select('id, username, display_name, avatar_url, role, bio, professional_headline, subscription_tier, is_verified')
        .in('id', userIds),
      8000
    ) as any;

    // 3) Attachments
    const { data: attachments } = await withQueryTimeout(
      service
        .from('post_attachments')
        .select('post_id, attachment_type, file_url')
        .in('post_id', postIds),
      8000
    ) as any;

    // 4) Reactions
    const { data: reactions } = await withQueryTimeout(
      service
        .from('post_reactions')
        .select('post_id, reaction_type, user_id')
        .in('post_id', postIds),
      8000
    ) as any;

    // 5) Comments count
    const { data: comments } = await withQueryTimeout(
      service
        .from('post_comments')
        .select('post_id')
        .in('post_id', postIds),
      8000
    ) as any;

    // 6) Current user's reactions
    const { data: userReactions } = await withQueryTimeout(
      service
        .from('post_reactions')
        .select('post_id, reaction_type')
        .in('post_id', postIds)
        .eq('user_id', user.id),
      8000
    ) as any;

    // 7) Reposted originals
    const repostedFromIds = Array.from(new Set(postRows.map((p: any) => p.reposted_from_id).filter(Boolean)));
    let repostedMap = new Map<string, any>();
    if (repostedFromIds.length > 0) {
      const { data: repostedPosts } = await withQueryTimeout(
        service
          .from('posts')
          .select('id, user_id, content, created_at, visibility')
          .in('id', repostedFromIds),
        8000
      ) as any;
      repostedMap = new Map((repostedPosts || []).map((p: any) => [p.id, p]));
    }

    const authorsMap = new Map((authors || []).map((a: any) => [a.id, a]));
    const attachmentsMap = new Map<string, { imageUrls: string[]; audioUrl: string | null }>();
    for (const att of attachments || []) {
      if (!attachmentsMap.has(att.post_id)) {
        attachmentsMap.set(att.post_id, { imageUrls: [], audioUrl: null });
      }
      const entry = attachmentsMap.get(att.post_id)!;
      if (att.attachment_type === 'image') entry.imageUrls.push(att.file_url);
      if (att.attachment_type === 'audio' && !entry.audioUrl) entry.audioUrl = att.file_url;
    }

    const reactionsCountMap = new Map<string, { support: number; love: number; fire: number; congrats: number }>();
    for (const postId of postIds) {
      reactionsCountMap.set(postId, { support: 0, love: 0, fire: 0, congrats: 0 });
    }
    for (const reaction of reactions || []) {
      const counts = reactionsCountMap.get(reaction.post_id);
      if (!counts) continue;
      if (reaction.reaction_type === 'support') counts.support += 1;
      if (reaction.reaction_type === 'love') counts.love += 1;
      if (reaction.reaction_type === 'fire') counts.fire += 1;
      if (reaction.reaction_type === 'congrats') counts.congrats += 1;
    }

    const commentsCountMap = new Map<string, number>();
    for (const c of comments || []) {
      commentsCountMap.set(c.post_id, (commentsCountMap.get(c.post_id) || 0) + 1);
    }

    const userReactionMap = new Map<string, string>();
    for (const ur of userReactions || []) {
      userReactionMap.set(ur.post_id, ur.reaction_type);
    }

    const normalizedPosts = postRows.map((post: any) => {
      const author = authorsMap.get(post.user_id);
      const atts = attachmentsMap.get(post.id) || { imageUrls: [], audioUrl: null };
      return {
        id: post.id,
        author: {
          id: author?.id || post.user_id,
          username: author?.username || null,
          display_name: author?.display_name || author?.username || 'User',
          avatar_url: author?.avatar_url || null,
          role: author?.role || null,
          headline: author?.professional_headline || null,
          bio: author?.bio || null,
          subscription_tier: author?.subscription_tier || null,
          is_verified: Boolean(author?.is_verified),
        },
        content: post.content,
        post_type: post.post_type,
        visibility: post.visibility,
        image_url: atts.imageUrls[0] || null,
        image_urls: atts.imageUrls.length > 0 ? atts.imageUrls : null,
        audio_url: atts.audioUrl,
        event_id: post.event_id || null,
        reactions_count: reactionsCountMap.get(post.id) || { support: 0, love: 0, fire: 0, congrats: 0 },
        comments_count: commentsCountMap.get(post.id) || 0,
        user_reaction: userReactionMap.get(post.id) || null,
        created_at: post.created_at,
        updated_at: post.updated_at,
        reposted_from_id: post.reposted_from_id || null,
        reposted_from: post.reposted_from_id ? repostedMap.get(post.reposted_from_id) || null : null,
      };
    });

    logPerformance('/api/posts/feed', startTime);

    // Return results immediately with cache-control headers
    return NextResponse.json(
      {
        success: true,
        data: {
          posts: normalizedPosts,
          pagination: {
            page,
            limit,
            total: offset + normalizedPosts.length,
            has_more: normalizedPosts.length === limit,
          },
        },
      },
      { 
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'X-Content-Type-Options': 'nosniff',
        }
      }
    );

  } catch (error: any) {
    console.error('Feed API error:', error);
    logPerformance('/api/posts/feed', startTime);

    return NextResponse.json(
      createErrorResponse(error.message || 'Request timeout', {
        posts: [],
        pagination: { page: 1, limit: 15, total: 0, has_more: false }
      }),
      { 
        status: 200, 
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        }
      }
    );
  }
}
