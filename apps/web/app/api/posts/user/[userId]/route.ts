/**
 * GET /api/posts/user/[userId]
 * 
 * Get all posts by a specific user
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Posts per page (default: 15, max: 50)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "posts": [...],
 *     "pagination": { page, limit, total, has_more }
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

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    console.log('📰 Get User Posts API called:', userId);

    // Authenticate user (can view their own posts or public posts)
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 50);
    const offset = (page - 1) * limit;

    // Check if viewing own posts or others
    const isOwnPosts = user.id === userId;

    // Build query - select all fields including reposted_from_id
    let query = supabase
      .from('posts')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null);

    // If viewing others' posts, filter by visibility
    if (!isOwnPosts) {
      query = query.or('visibility.eq.public,visibility.eq.connections');
    }

    query = query.order('created_at', { ascending: false });

    const { data: posts, error: postsError, count } = await query.range(offset, offset + limit - 1);

    if (postsError) {
      console.error('❌ Error fetching user posts:', postsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch posts', details: postsError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            posts: [],
            pagination: {
              page,
              limit,
              total: 0,
              has_more: false,
            },
          },
        },
        { headers: corsHeaders }
      );
    }

    // Get author profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, professional_headline, bio')
      .eq('id', userId)
      .single();

    // Get attachments
    const postIds = posts.map(p => p.id);
    const { data: attachments } = await supabase
      .from('post_attachments')
      .select('*')
      .in('post_id', postIds);

    // Get reactions
    const { data: reactions } = await supabase
      .from('post_reactions')
      .select('post_id, user_id, reaction_type')
      .in('post_id', postIds);

    // Get comment counts
    const { data: comments } = await supabase
      .from('post_comments')
      .select('post_id')
      .in('post_id', postIds)
      .is('deleted_at', null);

    // Get user's reposts to determine user_reposted status
    const { data: userReposts } = await supabase
      .from('post_reposts')
      .select('post_id, repost_post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds);

    // Build maps
    const attachmentsMap = new Map();
    if (attachments) {
      attachments.forEach(a => {
        if (!attachmentsMap.has(a.post_id)) {
          attachmentsMap.set(a.post_id, []);
        }
        attachmentsMap.get(a.post_id).push(a);
      });
    }

    const reactionsMap = new Map();
    const repostsMap = new Map();
    if (userReposts) {
      userReposts.forEach((r: any) => {
        repostsMap.set(r.post_id, r.repost_post_id);
      });
    }
    if (reactions) {
      reactions.forEach(r => {
        if (!reactionsMap.has(r.post_id)) {
          reactionsMap.set(r.post_id, {
            support: 0,
            love: 0,
            fire: 0,
            congrats: 0,
            user_reaction: null,
          });
        }
        const reactionCounts = reactionsMap.get(r.post_id);
        reactionCounts[r.reaction_type]++;
        if (r.user_id === user.id) {
          reactionCounts.user_reaction = r.reaction_type;
        }
      });
    }

    const commentCountsMap = new Map();
    if (comments) {
      comments.forEach(c => {
        commentCountsMap.set(c.post_id, (commentCountsMap.get(c.post_id) || 0) + 1);
      });
    }

    // Fetch original posts for reposts (reposted_from object)
    const repostedFromIds = posts
      .map(p => p.reposted_from_id)
      .filter(id => id !== null && id !== undefined);

    let repostedFromMap = new Map();
    if (repostedFromIds.length > 0) {
      try {
        // Fetch original posts
        const { data: originalPosts } = await supabase
          .from('posts')
          .select('id, user_id, content, visibility, post_type, media_urls, likes_count, comments_count, shares_count, created_at')
          .in('id', repostedFromIds)
          .is('deleted_at', null);

        if (originalPosts && originalPosts.length > 0) {
          // Get original post authors
          const originalAuthorIds = [...new Set(originalPosts.map(p => p.user_id))];
          const { data: originalAuthors } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, professional_headline, bio')
            .in('id', originalAuthorIds);

          // Get original post attachments
          const originalPostIds = originalPosts.map(p => p.id);
          const { data: originalAttachments } = await supabase
            .from('post_attachments')
            .select('*')
            .in('post_id', originalPostIds);

          // Get original post reactions
          const { data: originalReactions } = await supabase
            .from('post_reactions')
            .select('post_id, reaction_type')
            .in('post_id', originalPostIds);

          // Build maps for quick lookup
          const originalPostsMap = new Map(originalPosts.map(p => [p.id, p]));
          const originalAuthorsMap = new Map((originalAuthors || []).map(a => [a.id, a]));
          
          // Group attachments by post_id
          const originalAttachmentsMap = new Map();
          (originalAttachments || []).forEach(att => {
            if (!originalAttachmentsMap.has(att.post_id)) {
              originalAttachmentsMap.set(att.post_id, []);
            }
            originalAttachmentsMap.get(att.post_id).push(att);
          });

          // Calculate reaction counts for original posts
          const originalReactionsMap = new Map();
          originalPostIds.forEach(postId => {
            originalReactionsMap.set(postId, {
              support: 0,
              love: 0,
              fire: 0,
              congrats: 0,
            });
          });
          
          if (originalReactions) {
            originalReactions.forEach(r => {
              const counts = originalReactionsMap.get(r.post_id);
              if (counts && r.reaction_type in counts) {
                counts[r.reaction_type]++;
              }
            });
          }

          // Build reposted_from objects
          repostedFromIds.forEach(repostedFromId => {
            const originalPost = originalPostsMap.get(repostedFromId);
            if (originalPost) {
              const originalAuthor = originalAuthorsMap.get(originalPost.user_id);
              const attachments = originalAttachmentsMap.get(originalPost.id) || [];
              const reactionsCount = originalReactionsMap.get(originalPost.id) || {
                support: 0,
                love: 0,
                fire: 0,
                congrats: 0,
              };

              // Extract primary image/audio from attachments
              const imageAttachment = attachments.find(a => 
                a.attachment_type === 'image' || a.attachment_type === 'photo'
              );
              const audioAttachment = attachments.find(a => 
                a.attachment_type === 'audio' || a.attachment_type === 'track'
              );

              repostedFromMap.set(repostedFromId, {
                id: originalPost.id,
                content: originalPost.content,
                created_at: originalPost.created_at,
                visibility: originalPost.visibility,
                author: originalAuthor ? {
                  id: originalAuthor.id,
                  username: originalAuthor.username || '',
                  display_name: originalAuthor.display_name || originalAuthor.username || 'User',
                  avatar_url: originalAuthor.avatar_url || null,
                  headline: originalAuthor.professional_headline || null,
                  bio: originalAuthor.bio || null,
                } : {
                  id: originalPost.user_id,
                  username: '',
                  display_name: 'Unknown User',
                  avatar_url: null,
                  headline: null,
                  bio: null,
                },
                attachments: attachments,
                reactions: reactionsCount,
                image_preview: imageAttachment ? {
                  url: imageAttachment.url || imageAttachment.file_url,
                  thumbnail_url: imageAttachment.thumbnail_url,
                } : null,
                audio_preview: audioAttachment ? {
                  url: audioAttachment.url || audioAttachment.file_url,
                  title: audioAttachment.title,
                  duration: audioAttachment.duration,
                } : null,
              });
            }
          });
        }
      } catch (error) {
        console.error('❌ Error fetching reposted_from data:', error);
        // Continue without reposted_from data rather than failing the entire request
      }
    }

    // Format posts
    const formattedPosts = posts.map(post => {
      const repostPostId = repostsMap.get(post.id);
      const repostedFromData = post.reposted_from_id ? repostedFromMap.get(post.reposted_from_id) : null;

      return {
        id: post.id,
        content: post.content,
        visibility: post.visibility,
        post_type: post.post_type,
        created_at: post.created_at,
        reposted_from_id: post.reposted_from_id || null,
        reposted_from: repostedFromData || null,
        user_reposted: !!repostPostId,
        user_repost_id: repostPostId || null,
        author: {
          id: post.user_id,
          name: profile?.display_name || profile?.username || 'Unknown',
          username: profile?.username,
          avatar_url: profile?.avatar_url,
          role: profile?.professional_headline,
          headline: profile?.professional_headline || null,
          bio: profile?.bio || null,
        },
        attachments: attachmentsMap.get(post.id) || [],
        reactions: reactionsMap.get(post.id) || {
          support: 0,
          love: 0,
          fire: 0,
          congrats: 0,
          user_reaction: null,
        },
        comment_count: commentCountsMap.get(post.id) || 0,
      };
    });

    console.log(`✅ Fetched ${formattedPosts.length} posts for user ${userId}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          posts: formattedPosts,
          pagination: {
            page,
            limit,
            total: count || 0,
            has_more: (count || 0) > offset + limit,
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error fetching user posts:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

