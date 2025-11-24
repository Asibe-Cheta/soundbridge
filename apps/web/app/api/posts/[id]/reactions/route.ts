/**
 * POST /api/posts/[id]/reactions - Add or update reaction
 * DELETE /api/posts/[id]/reactions - Remove reaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { notifyPostReaction } from '@/src/lib/post-notifications';

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    console.log('👍 Add/Update Reaction API called:', postId);

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { reaction_type } = body;

    // Validation
    if (!reaction_type) {
      return NextResponse.json(
        { success: false, error: 'reaction_type is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['support', 'love', 'fire', 'congrats'].includes(reaction_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid reaction_type. Must be: support, love, fire, or congrats' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if post exists and get author
    const { data: post } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .is('deleted_at', null)
      .single();

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if user already reacted
    const { data: existingReaction } = await supabase
      .from('post_reactions')
      .select('id, reaction_type')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    let reaction;

    if (existingReaction) {
      // If user already reacted with the same type, remove reaction (toggle off)
      if (existingReaction.reaction_type === reaction_type) {
        const { error: deleteError } = await supabase
          .from('post_reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (deleteError) {
          console.error('❌ Error removing reaction:', deleteError);
          return NextResponse.json(
            { success: false, error: 'Failed to remove reaction', details: deleteError.message },
            { status: 500, headers: corsHeaders }
          );
        }

        // Get updated counts
        const { data: allReactions } = await supabase
          .from('post_reactions')
          .select('reaction_type')
          .eq('post_id', postId);

        const counts = {
          support: 0,
          love: 0,
          fire: 0,
          congrats: 0,
        };

        if (allReactions) {
          allReactions.forEach((r) => {
            counts[r.reaction_type as keyof typeof counts]++;
          });
        }

        return NextResponse.json(
          {
            success: true,
            data: {
              reaction: null, // Removed
              updated_counts: counts,
            },
          },
          { headers: corsHeaders }
        );
      } else {
        // Update reaction type
        const { data: updatedReaction, error: updateError } = await supabase
          .from('post_reactions')
          .update({ reaction_type, created_at: new Date().toISOString() })
          .eq('id', existingReaction.id)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Error updating reaction:', updateError);
          return NextResponse.json(
            { success: false, error: 'Failed to update reaction', details: updateError.message },
            { status: 500, headers: corsHeaders }
          );
        }

        reaction = updatedReaction;
      }
    } else {
      // Create new reaction
      const { data: newReaction, error: insertError } = await supabase
        .from('post_reactions')
        .insert({
          post_id: postId,
          user_id: user.id,
          reaction_type,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating reaction:', insertError);
        return NextResponse.json(
          { success: false, error: 'Failed to create reaction', details: insertError.message },
          { status: 500, headers: corsHeaders }
        );
      }

      reaction = newReaction;

      // Send notification to post author (if not reacting to own post)
      if (post.user_id !== user.id) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('id', user.id)
          .single();

        const userName = userProfile?.display_name || userProfile?.username || 'Someone';
        notifyPostReaction(post.user_id, userName, postId, reaction_type).catch((err) => {
          console.error('Failed to send reaction notification:', err);
          // Don't fail the request if notification fails
        });
      }
    }

    // Get updated counts
    const { data: allReactions } = await supabase
      .from('post_reactions')
      .select('reaction_type')
      .eq('post_id', postId);

    const counts = {
      support: 0,
      love: 0,
      fire: 0,
      congrats: 0,
    };

    if (allReactions) {
      allReactions.forEach((r) => {
        counts[r.reaction_type as keyof typeof counts]++;
      });
    }

    console.log('✅ Reaction updated successfully');

    return NextResponse.json(
      {
        success: true,
        data: {
          reaction: {
            id: reaction.id,
            reaction_type: reaction.reaction_type,
          },
          updated_counts: counts,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error handling reaction:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    console.log('👎 Remove Reaction API called:', postId);

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Find and delete user's reaction
    const { error: deleteError } = await supabase
      .from('post_reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ Error removing reaction:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to remove reaction', details: deleteError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get updated counts
    const { data: allReactions } = await supabase
      .from('post_reactions')
      .select('reaction_type')
      .eq('post_id', postId);

    const counts = {
      support: 0,
      love: 0,
      fire: 0,
      congrats: 0,
    };

    if (allReactions) {
      allReactions.forEach((r) => {
        counts[r.reaction_type as keyof typeof counts]++;
      });
    }

    console.log('✅ Reaction removed successfully');

    return NextResponse.json(
      {
        success: true,
        data: {
          updated_counts: counts,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error removing reaction:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

