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
    const limit = parseInt(searchParams.get('limit') || '10');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const targetCurrency = searchParams.get('targetCurrency') || 'USD';

    const startDate = startDateParam ? new Date(startDateParam) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = endDateParam ? new Date(endDateParam) : new Date();

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

    // Get tips with tipper information
    const { data: tips } = await supabase
      .from('wallet_transactions')
      .select('amount, currency, metadata, created_at')
      .eq('user_id', user.id)
      .eq('transaction_type', 'tip_received')
      .in('status', ['completed', 'pending'])
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Get tipper profiles
    const tipperIds = (tips || [])
      .map(tip => tip.metadata?.tipper_id)
      .filter(Boolean) as string[];

    let profiles: any[] = [];
    if (tipperIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, city, country')
        .in('id', tipperIds);
      profiles = profilesData || [];
    }

    // Aggregate by city
    const cityData: Record<string, { fanCount: number; totalSpent: number; country: string }> = {};
    const fanData: Record<string, { totalSpent: number; tipCount: number; profile: any }> = {};

    (tips || []).forEach(tip => {
      const tipperId = tip.metadata?.tipper_id;
      if (!tipperId) return;

      const profile = profiles.find(p => p.id === tipperId);
      if (!profile) return;

      const city = profile.city || 'Unknown';
      const country = profile.country || 'Unknown';
      const amount = convertCurrency(tip.amount, tip.currency || 'USD', targetCurrency);

      // Aggregate by city
      if (!cityData[city]) {
        cityData[city] = { fanCount: 0, totalSpent: 0, country };
      }
      cityData[city].totalSpent += amount;

      // Aggregate by fan
      if (!fanData[tipperId]) {
        fanData[tipperId] = { totalSpent: 0, tipCount: 0, profile };
      }
      fanData[tipperId].totalSpent += amount;
      fanData[tipperId].tipCount += 1;
    });

    // Count unique fans per city
    Object.keys(fanData).forEach(tipperId => {
      const fan = fanData[tipperId];
      const city = fan.profile.city || 'Unknown';
      if (cityData[city]) {
        cityData[city].fanCount += 1;
      }
    });

    // Format top cities
    const topCities = Object.entries(cityData)
      .map(([city, data]) => ({
        city,
        country: data.country,
        fanCount: data.fanCount,
        totalSpent: Math.round(data.totalSpent * 100) / 100,
        currency: targetCurrency,
        engagementScore: Math.round((data.fanCount * 10 + data.totalSpent) / 10),
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);

    // Format top fans
    const topFans = Object.values(fanData)
      .map(fan => ({
        id: fan.profile.id,
        username: fan.profile.username,
        avatarUrl: fan.profile.avatar_url,
        totalSpent: Math.round(fan.totalSpent * 100) / 100,
        tipsGiven: fan.tipCount,
        ticketsPurchased: 0, // TODO: Get from event_tickets
        city: fan.profile.city || 'Unknown',
        country: fan.profile.country || 'Unknown',
        currency: targetCurrency,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);

    return NextResponse.json(
      {
        success: true,
        data: {
          topCities,
          topFans,
        },
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in fan demographics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
