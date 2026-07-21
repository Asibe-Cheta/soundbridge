import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (isAdminAccessDenied(adminCheck)) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';
    const limitParam = Number(searchParams.get('limit') ?? 25);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 25;
    const pageParam = Number(searchParams.get('page') ?? 1);
    const page = Number.isFinite(pageParam) ? Math.max(pageParam, 1) : 1;
    const offset = (page - 1) * limit;

    const serviceClient = adminCheck.serviceClient;
    let query = serviceClient
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_verified, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status === 'verified') {
      query = query.eq('is_verified', true);
    } else if (status === 'unverified') {
      query = query.eq('is_verified', false);
    }

    if (search) {
      query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching verification users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [], count: count ?? 0, page, limit });
  } catch (error: any) {
    console.error('Admin verification users error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (isAdminAccessDenied(adminCheck)) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const body = await request.json();
    const isVerified = Boolean(body?.is_verified);

    const userIds: string[] = Array.isArray(body?.userIds)
      ? body.userIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
      : typeof body?.userId === 'string' && body.userId
        ? [body.userId]
        : [];

    if (userIds.length === 0) {
      return NextResponse.json({ error: 'userId or userIds is required' }, { status: 400 });
    }

    const serviceClient = adminCheck.serviceClient;
    const { error } = await serviceClient
      .from('profiles')
      .update({ is_verified: isVerified, updated_at: new Date().toISOString() })
      .in('id', userIds);

    if (error) {
      console.error('Error updating verification status:', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: userIds });
  } catch (error: any) {
    console.error('Admin verification update error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
