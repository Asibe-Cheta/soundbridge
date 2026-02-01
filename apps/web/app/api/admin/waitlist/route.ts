import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Admin Waitlist API called');

    const adminCheck = await requireAdmin(request);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'signed_up_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    const supabase = adminCheck.serviceClient;
    
    // Build query
    let query = supabase
      .from('waitlist')
      .select('*', { count: 'exact' });
    
    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,role.ilike.%${search}%,location.ilike.%${search}%,country.ilike.%${search}%,state.ilike.%${search}%,city.ilike.%${search}%`);
    }
    
    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    
    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('❌ Error fetching waitlist:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch waitlist signups' },
        { status: 500 }
      );
    }
    
    console.log('✅ Waitlist signups fetched successfully');
    
    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
    
  } catch (error: any) {
    console.error('❌ Admin waitlist API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const body = await request.json().catch(() => ({}));
    const id = body?.id as string | undefined;
    const email = body?.email as string | undefined;

    if (!id && !email) {
      return NextResponse.json({ error: 'id or email is required' }, { status: 400 });
    }

    const supabase = adminCheck.serviceClient;
    let query = supabase.from('waitlist').delete();

    if (id) {
      query = query.eq('id', id);
    } else if (email) {
      query = query.eq('email', email.toLowerCase().trim());
    }

    const { error } = await query;
    if (error) {
      console.error('❌ Error deleting waitlist entry:', error);
      return NextResponse.json({ error: 'Failed to delete waitlist entry' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Admin waitlist delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

