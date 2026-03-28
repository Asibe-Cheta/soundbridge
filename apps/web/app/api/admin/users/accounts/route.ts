import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';

/**
 * GET /api/admin/users/accounts
 * Paginated list of all registered users (auth.users) with profile name/username.
 * Query: page (default 1), limit (default 50, max 200), search (optional, email/name/username)
 */
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200);
    const search = (searchParams.get('search') || '').trim() || null;
    const offset = (page - 1) * limit;

    const { data, error } = await adminCheck.serviceClient.rpc('admin_list_auth_users_with_profiles', {
      p_limit: limit,
      p_offset: offset,
      p_search: search,
    });

    if (error) {
      console.error('❌ admin_list_auth_users_with_profiles failed:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to list accounts' },
        { status: 500 }
      );
    }

    const rows = (data || []) as Array<{
      user_id: string;
      email: string;
      display_name: string;
      username: string;
      account_created_at: string;
      total_count: number | string;
    }>;

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
    const accounts = rows.map(({ user_id, email, display_name, username, account_created_at }) => ({
      user_id,
      email,
      display_name: display_name || null,
      username: username || null,
      account_created_at,
    }));

    return NextResponse.json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || (total === 0 ? 0 : 1),
      },
      data: accounts,
    });
  } catch (err: unknown) {
    console.error('❌ Admin users accounts API error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
