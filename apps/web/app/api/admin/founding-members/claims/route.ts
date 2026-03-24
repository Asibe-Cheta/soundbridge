import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200);
    const status = (searchParams.get('status') || 'all').toLowerCase(); // all | claimed | unclaimed
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const eventLimit = Math.min(Math.max(parseInt(searchParams.get('eventLimit') || '50', 10), 1), 200);

    const supabase = adminCheck.serviceClient;

    // Headline summary counters for dashboard cards.
    const [
      totalMembersRes,
      claimedMembersRes,
      unclaimedMembersRes,
      recentClaimsRes,
    ] = await Promise.all([
      supabase.from('founding_members').select('*', { count: 'exact', head: true }),
      supabase.from('founding_members').select('*', { count: 'exact', head: true }).gt('claim_count', 0),
      supabase.from('founding_members').select('*', { count: 'exact', head: true }).eq('claim_count', 0),
      supabase
        .from('founding_member_claim_events')
        .select('*', { count: 'exact', head: true })
        .gte('claimed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ]);

    if (totalMembersRes.error || claimedMembersRes.error || unclaimedMembersRes.error || recentClaimsRes.error) {
      console.error('❌ Founding member summary query failed:', {
        totalMembersError: totalMembersRes.error,
        claimedMembersError: claimedMembersRes.error,
        unclaimedMembersError: unclaimedMembersRes.error,
        recentClaimsError: recentClaimsRes.error,
      });
      return NextResponse.json({ success: false, error: 'Failed to fetch claim summary' }, { status: 500 });
    }

    let membersQuery = supabase
      .from('founding_members')
      .select('id, email, waitlist_signed_up_at, first_claimed_at, last_claimed_at, claim_count', { count: 'exact' });

    if (status === 'claimed') {
      membersQuery = membersQuery.gt('claim_count', 0);
    } else if (status === 'unclaimed') {
      membersQuery = membersQuery.eq('claim_count', 0);
    }

    if (search) {
      membersQuery = membersQuery.ilike('email', `%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: members, error: membersError, count: membersCount } = await membersQuery
      .order('last_claimed_at', { ascending: false, nullsFirst: false })
      .order('waitlist_signed_up_at', { ascending: true })
      .range(from, to);

    if (membersError) {
      console.error('❌ Founding member list query failed:', membersError);
      return NextResponse.json({ success: false, error: 'Failed to fetch founding member claims list' }, { status: 500 });
    }

    const { data: recentEvents, error: eventsError } = await supabase
      .from('founding_member_claim_events')
      .select('id, email, founding_member_id, found, claimed_at, source, ip_address, user_agent')
      .order('claimed_at', { ascending: false })
      .limit(eventLimit);

    if (eventsError) {
      console.error('❌ Founding member claim events query failed:', eventsError);
      return NextResponse.json({ success: false, error: 'Failed to fetch claim events' }, { status: 500 });
    }

    const totalMembers = totalMembersRes.count || 0;
    const claimedMembers = claimedMembersRes.count || 0;
    const unclaimedMembers = unclaimedMembersRes.count || 0;
    const claimRatePercent = totalMembers > 0 ? Number(((claimedMembers / totalMembers) * 100).toFixed(2)) : 0;

    return NextResponse.json({
      success: true,
      summary: {
        totalMembers,
        claimedMembers,
        unclaimedMembers,
        claimRatePercent,
        recentClaims24h: recentClaimsRes.count || 0,
      },
      filters: {
        status,
        search,
      },
      pagination: {
        page,
        limit,
        total: membersCount || 0,
        totalPages: Math.ceil((membersCount || 0) / limit),
      },
      data: members || [],
      recentEvents: recentEvents || [],
    });
  } catch (error: any) {
    console.error('❌ Admin founding member claims API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
