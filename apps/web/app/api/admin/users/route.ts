import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('👥 Admin Users API called');
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    
    const supabase = createServiceClient();

    // Build query
    let query = supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        email,
        role,
        avatar_url,
        created_at,
        updated_at,
        last_login_at,
        is_active,
        followers_count,
        following_count
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (status === 'active') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.gte('last_login_at', thirtyDaysAgo.toISOString());
    } else if (status === 'inactive') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.lt('last_login_at', thirtyDaysAgo.toISOString());
    }

    // Get total count
    const { count: totalUsers, error: countError } = await (query as any).select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error fetching user count:', countError);
    }

    // Get paginated results
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: users, error: usersError } = await query
      .range(from, to);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Get user statistics
    const { count: totalUsersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: activeUsersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_login_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const { count: newUsersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // Get role distribution
    const { data: roleStats } = await supabase
      .from('profiles')
      .select('role')
      .not('role', 'is', null);

    const roleDistribution = roleStats?.reduce((acc: any, user: any) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {}) || {};

    const userData = {
      users: users || [],
      pagination: {
        page,
        limit,
        total: totalUsers || 0,
        pages: Math.ceil((totalUsers || 0) / limit)
      },
      statistics: {
        total_users: totalUsersCount || 0,
        active_users: activeUsersCount || 0,
        new_users_this_week: newUsersCount || 0,
        role_distribution: roleDistribution
      }
    };

    console.log('✅ Users data fetched successfully');

    return NextResponse.json({
      success: true,
      data: userData
    });

  } catch (error: any) {
    console.error('❌ Error fetching users data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('👤 Admin User Action API called');
    
    const body = await request.json();
    const { action, userId, data } = body;

    const supabase = createServiceClient();

    switch (action) {
      case 'ban_user':
        const { error: banError } = await (supabase
          .from('profiles') as any)
          .update({ 
            is_active: false,
            banned_at: new Date().toISOString(),
            ban_reason: data.reason || 'Administrative action'
          })
          .eq('id', userId);

        if (banError) {
          throw new Error(`Failed to ban user: ${banError.message}`);
        }
        break;

      case 'unban_user':
        const { error: unbanError } = await (supabase
          .from('profiles') as any)
          .update({ 
            is_active: true,
            banned_at: null,
            ban_reason: null
          })
          .eq('id', userId);

        if (unbanError) {
          throw new Error(`Failed to unban user: ${unbanError.message}`);
        }
        break;

      case 'update_role':
        const { error: roleError } = await (supabase
          .from('profiles') as any)
          .update({ role: data.role })
          .eq('id', userId);

        if (roleError) {
          throw new Error(`Failed to update user role: ${roleError.message}`);
        }
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`✅ User action ${action} completed successfully`);

    return NextResponse.json({
      success: true,
      message: `User action ${action} completed successfully`
    });

  } catch (error: any) {
    console.error('❌ Error performing user action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform user action', details: error.message },
      { status: 500 }
    );
  }
}
