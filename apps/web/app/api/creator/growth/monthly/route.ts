import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {}
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options, maxAge: 0 });
            } catch (error) {}
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '6');
    const targetCurrency = searchParams.get('targetCurrency') || 'USD';

    // Calculate date range
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

    // Fetch exchange rates
    const exchangeRates = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(res => res.json())
      .then(data => data.rates)
      .catch(() => ({ 'USD': 1.0, 'GBP': 0.79, 'EUR': 0.92, 'NGN': 1456.75 }));

    const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
      if (fromCurrency === toCurrency) return amount;
      const fromRate = exchangeRates[fromCurrency] || 1;
      const toRate = exchangeRates[toCurrency] || 1;
      const amountInUSD = amount / fromRate;
      return Math.round((amountInUSD * toRate) * 100) / 100;
    };

    // Get monthly follower growth
    const { data: follows } = await supabase
      .from('follows')
      .select('created_at')
      .eq('following_id', user.id)
      .gte('created_at', startDate.toISOString());

    // Get monthly revenue
    const { data: tips } = await supabase
      .from('wallet_transactions')
      .select('amount, currency, created_at')
      .eq('user_id', user.id)
      .eq('transaction_type', 'tip_received')
      .in('status', ['completed', 'pending'])
      .gte('created_at', startDate.toISOString());

    // Get monthly plays
    const { data: tracks } = await supabase
      .from('audio_tracks')
      .select('play_count, created_at')
      .eq('creator_id', user.id)
      .is('deleted_at', null)
      .gte('created_at', startDate.toISOString());

    // Group by month
    const monthlyData: Record<string, {
      revenue: number;
      newFollowers: number;
      totalPlays: number;
      engagement: number;
    }> = {};

    // Initialize all months
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = { revenue: 0, newFollowers: 0, totalPlays: 0, engagement: 0 };
    }

    // Aggregate follows
    (follows || []).forEach(follow => {
      const date = new Date(follow.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].newFollowers += 1;
      }
    });

    // Aggregate revenue
    (tips || []).forEach(tip => {
      const date = new Date(tip.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].revenue += convertCurrency(tip.amount, tip.currency || 'USD', targetCurrency);
      }
    });

    // Aggregate plays (simplified - in production, track plays over time)
    const totalPlays = (tracks || []).reduce((sum, track) => sum + (track.play_count || 0), 0);
    const latestMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyData[latestMonthKey]) {
      monthlyData[latestMonthKey].totalPlays = totalPlays;
    }

    // Calculate engagement (likes + shares + comments)
    // Simplified - in production, track engagement over time
    const { data: engagementData } = await supabase
      .from('audio_tracks')
      .select('likes_count, shares_count')
      .eq('creator_id', user.id)
      .is('deleted_at', null);

    const totalEngagement = (engagementData || []).reduce(
      (sum, track) => sum + (track.likes_count || 0) + (track.shares_count || 0),
      0
    );
    if (monthlyData[latestMonthKey]) {
      monthlyData[latestMonthKey].engagement = totalEngagement;
    }

    // Calculate changes
    const monthlyGrowth = Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data], index, array) => {
        const previousMonth = array[index - 1];
        const calculateChange = (current: number, previous: number): number => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return Math.round(((current - previous) / previous) * 100 * 10) / 10;
        };

        return {
          month,
          revenue: Math.round(data.revenue * 100) / 100,
          newFollowers: data.newFollowers,
          totalPlays: data.totalPlays,
          engagement: data.engagement,
          revenueChange: previousMonth
            ? calculateChange(data.revenue, monthlyData[previousMonth[0]].revenue)
            : 0,
          followerChange: previousMonth
            ? calculateChange(data.newFollowers, monthlyData[previousMonth[0]].newFollowers)
            : 0,
        };
      });

    return NextResponse.json(
      {
        success: true,
        data: monthlyGrowth,
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in monthly growth:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
