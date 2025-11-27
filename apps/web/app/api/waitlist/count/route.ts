import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Waitlist count API called');
    
    // Create Supabase service client
    const supabase = createServiceClient();

    // Get total count
    const { count, error: countError } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Database error:', countError);
      return NextResponse.json(
        { error: 'Failed to fetch waitlist count' },
        { status: 500 }
      );
    }

    // Get count by role (optional - for more detailed stats)
    const { data: roleData, error: roleError } = await supabase
      .from('waitlist')
      .select('role');

    let roleCounts: Record<string, number> = {};
    if (!roleError && roleData) {
      roleCounts = roleData.reduce((acc: Record<string, number>, item: any) => {
        const role = item.role || 'unknown';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {});
    }

    // Get recent signups (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: recentCount, error: recentError } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
      .gte('signed_up_at', sevenDaysAgo.toISOString());

    console.log('✅ Waitlist count fetched:', { total: count, recent: recentCount });

    return NextResponse.json({
      success: true,
      data: {
        total: count || 0,
        recent: recentCount || 0,
        by_role: roleCounts
      }
    });

  } catch (error) {
    console.error('❌ Waitlist count error:', error);
    return NextResponse.json({
      error: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

