import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schema for block requests
const BlockUserSchema = z.object({
  blockedUserId: z.string().uuid('Valid user ID is required'),
  reason: z.string().optional()
});

// Helper to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cookieHeader = request.headers.get('cookie');
  
  // Try bearer token first
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (user && !error) return user;
  }
  
  // Try cookie-based auth
  if (cookieHeader) {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    
    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    const { data: { user }, error } = await client.auth.getUser();
    if (user && !error) return user;
  }
  
  return null;
}

// POST /api/users/block - Block a user
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = BlockUserSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { blockedUserId, reason } = validationResult.data;

    // Prevent users from blocking themselves
    if (user.id === blockedUserId) {
      return NextResponse.json(
        { success: false, error: 'You cannot block yourself' },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: blockedUser, error: userError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('id', blockedUserId)
      .single();

    if (userError || !blockedUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already blocked
    const { data: existingBlock, error: checkError } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedUserId)
      .single();

    if (existingBlock) {
      return NextResponse.json(
        { success: false, error: 'User is already blocked' },
        { status: 409 }
      );
    }

    // Create block
    const { data: block, error: blockError } = await supabase
      .from('blocked_users')
      .insert({
        blocker_id: user.id,
        blocked_id: blockedUserId,
        reason: reason || null
      })
      .select()
      .single();

    if (blockError) {
      console.error('Error creating block:', blockError);
      return NextResponse.json(
        { success: false, error: 'Failed to block user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `You have blocked ${blockedUser.display_name || 'this user'}`,
      data: block
    });

  } catch (error: any) {
    console.error('Block user API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/block - Unblock a user
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const blockedUserId = searchParams.get('userId');

    if (!blockedUserId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if block exists
    const { data: existingBlock, error: checkError } = await supabase
      .from('blocked_users')
      .select('id, blocked:profiles!blocked_users_blocked_id_fkey(id, display_name)')
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedUserId)
      .single();

    if (checkError || !existingBlock) {
      return NextResponse.json(
        { success: false, error: 'User is not blocked' },
        { status: 404 }
      );
    }

    // Remove block
    const { error: deleteError } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedUserId);

    if (deleteError) {
      console.error('Error removing block:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to unblock user' },
        { status: 500 }
      );
    }

    const blockedUser = existingBlock.blocked as any;

    return NextResponse.json({
      success: true,
      message: `You have unblocked ${blockedUser?.display_name || 'this user'}`,
    });

  } catch (error: any) {
    console.error('Unblock user API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/users/block - Check block status and get blocked users list
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const checkUserId = searchParams.get('checkUserId');
    const listType = searchParams.get('list') || 'blocked'; // 'blocked' or 'blockers'

    // Check if specific user is blocked
    if (checkUserId) {
      const { data: block, error } = await supabase
        .from('blocked_users')
        .select('id, reason, created_at')
        .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${checkUserId}),and(blocker_id.eq.${checkUserId},blocked_id.eq.${user.id})`)
        .maybeSingle();

      if (error) {
        console.error('Error checking block status:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to check block status' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        isBlocked: !!block,
        isBlockedBy: block?.blocker_id === checkUserId,
        isBlocking: block?.blocker_id === user.id,
        block: block || null
      });
    }

    // Get list of blocked users or users who blocked me
    let query = supabase
      .from('blocked_users')
      .select(`
        id,
        reason,
        created_at,
        blocked:profiles!blocked_users_blocked_id_fkey(
          id,
          display_name,
          username,
          avatar_url
        ),
        blocker:profiles!blocked_users_blocker_id_fkey(
          id,
          display_name,
          username,
          avatar_url
        )
      `);

    if (listType === 'blocked') {
      // Users I've blocked
      query = query.eq('blocker_id', user.id);
    } else if (listType === 'blockers') {
      // Users who blocked me
      query = query.eq('blocked_id', user.id);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid list type. Use "blocked" or "blockers"' },
        { status: 400 }
      );
    }

    const { data: blocks, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching blocked users:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch blocked users' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: blocks || [],
      count: blocks?.length || 0
    });

  } catch (error: any) {
    console.error('Get blocked users API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

