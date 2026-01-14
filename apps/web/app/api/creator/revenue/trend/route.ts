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
    const period = searchParams.get('period') || 'month';
    const targetCurrency = searchParams.get('targetCurrency') || 'USD';

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

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

    // Get tips
    const { data: tips } = await supabase
      .from('wallet_transactions')
      .select('amount, currency, created_at')
      .eq('user_id', user.id)
      .eq('transaction_type', 'tip_received')
      .in('status', ['completed', 'pending'])
      .gte('created_at', startDate.toISOString());

    // Get event tickets
    const { data: creatorEvents } = await supabase
      .from('events')
      .select('id')
      .eq('creator_id', user.id);

    const eventIds = creatorEvents?.map(e => e.id) || [];
    let tickets = [];
    if (eventIds.length > 0) {
      const { data: ticketsData } = await supabase
        .from('event_tickets')
        .select('amount_paid, purchase_date')
        .in('event_id', eventIds)
        .eq('status', 'confirmed')
        .gte('purchase_date', startDate.toISOString());
      tickets = ticketsData || [];
    }

    // Get service bookings
    const { data: bookings } = await supabase
      .from('service_bookings')
      .select('price_total, created_at')
      .eq('provider_id', user.id)
      .in('status', ['confirmed', 'completed'])
      .gte('created_at', startDate.toISOString());

    // Group by date
    const dailyData: Record<string, { tips: number; tickets: number; bookings: number }> = {};

    (tips || []).forEach(tip => {
      const date = new Date(tip.created_at).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { tips: 0, tickets: 0, bookings: 0 };
      }
      dailyData[date].tips += convertCurrency(tip.amount, tip.currency || 'USD', targetCurrency);
    });

    (tickets || []).forEach(ticket => {
      const date = new Date(ticket.purchase_date).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { tips: 0, tickets: 0, bookings: 0 };
      }
      dailyData[date].tickets += convertCurrency(ticket.amount_paid || 0, 'USD', targetCurrency);
    });

    (bookings || []).forEach(booking => {
      const date = new Date(booking.created_at).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { tips: 0, tickets: 0, bookings: 0 };
      }
      dailyData[date].bookings += convertCurrency(booking.price_total || 0, 'USD', targetCurrency);
    });

    // Convert to array and sort
    const trendData = Object.entries(dailyData)
      .map(([date, amounts]) => ({
        date,
        amount: Math.round((amounts.tips + amounts.tickets + amounts.bookings) * 100) / 100,
        tips: Math.round(amounts.tips * 100) / 100,
        tickets: Math.round(amounts.tickets * 100) / 100,
        bookings: Math.round(amounts.bookings * 100) / 100,
        downloads: 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(
      { success: true, data: trendData },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in revenue trend:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
