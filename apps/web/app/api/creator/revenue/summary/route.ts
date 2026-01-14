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
            } catch (error) {
              // Handle cookie setting errors
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options, maxAge: 0 });
            } catch (error) {
              // Handle cookie removal errors
            }
          },
        },
      }
    );

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const targetCurrency = searchParams.get('targetCurrency') || 'USD';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      // Default to last 365 days
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    // Fetch exchange rates (simplified - in production, use a proper currency service)
    const exchangeRates = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(res => res.json())
      .then(data => data.rates)
      .catch(() => ({
        'USD': 1.0,
        'GBP': 0.79,
        'EUR': 0.92,
        'NGN': 1456.75,
      }));

    const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
      if (fromCurrency === toCurrency) return amount;
      const fromRate = exchangeRates[fromCurrency] || 1;
      const toRate = exchangeRates[toCurrency] || 1;
      const amountInUSD = amount / fromRate;
      return Math.round((amountInUSD * toRate) * 100) / 100;
    };

    // Get tips from wallet_transactions
    const { data: tips, error: tipsError } = await supabase
      .from('wallet_transactions')
      .select('amount, currency, created_at')
      .eq('user_id', user.id)
      .eq('transaction_type', 'tip_received')
      .in('status', ['completed', 'pending'])
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (tipsError) {
      console.error('Error fetching tips:', tipsError);
    }

    // Get event tickets
    const { data: creatorEvents } = await supabase
      .from('events')
      .select('id')
      .eq('creator_id', user.id);

    const eventIds = creatorEvents?.map(e => e.id) || [];
    let tickets = [];
    let ticketsError = null;

    if (eventIds.length > 0) {
      const { data: ticketsData, error: ticketsErr } = await supabase
        .from('event_tickets')
        .select('amount_paid, purchase_date')
        .in('event_id', eventIds)
        .eq('status', 'confirmed')
        .gte('purchase_date', startDate.toISOString())
        .lte('purchase_date', endDate.toISOString());

      tickets = ticketsData || [];
      ticketsError = ticketsErr;
    }

    // Get service bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('service_bookings')
      .select('price_total, created_at, status')
      .eq('provider_id', user.id)
      .in('status', ['confirmed', 'completed'])
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
    }

    // Calculate previous period for change percentage
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousEndDate = startDate;

    // Get previous period tips
    const { data: previousTips } = await supabase
      .from('wallet_transactions')
      .select('amount, currency')
      .eq('user_id', user.id)
      .eq('transaction_type', 'tip_received')
      .in('status', ['completed', 'pending'])
      .gte('created_at', previousStartDate.toISOString())
      .lte('created_at', previousEndDate.toISOString());

    // Calculate totals
    const tipsTotal = (tips || []).reduce((sum, tip) => {
      return sum + convertCurrency(tip.amount, tip.currency || 'USD', targetCurrency);
    }, 0);

    const ticketsTotal = (tickets || []).reduce((sum, ticket) => {
      return sum + convertCurrency(ticket.amount_paid || 0, 'USD', targetCurrency);
    }, 0);

    const bookingsTotal = (bookings || []).reduce((sum, booking) => {
      return sum + convertCurrency(booking.price_total || 0, 'USD', targetCurrency);
    }, 0);

    const previousTipsTotal = (previousTips || []).reduce((sum, tip) => {
      return sum + convertCurrency(tip.amount, tip.currency || 'USD', targetCurrency);
    }, 0);

    // Calculate change percentage
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100 * 10) / 10;
    };

    const response = {
      success: true,
      data: {
        tips: {
          amount: Math.round(tipsTotal * 100) / 100,
          count: tips?.length || 0,
          currency: targetCurrency,
          change_percentage: calculateChange(tipsTotal, previousTipsTotal),
        },
        eventTickets: {
          amount: Math.round(ticketsTotal * 100) / 100,
          count: tickets?.length || 0,
          currency: targetCurrency,
          change_percentage: 0, // TODO: Calculate previous period
        },
        serviceBookings: {
          amount: Math.round(bookingsTotal * 100) / 100,
          count: bookings?.length || 0,
          currency: targetCurrency,
          change_percentage: 0, // TODO: Calculate previous period
        },
        downloads: {
          amount: 0,
          count: 0,
          currency: targetCurrency,
          change_percentage: 0,
        },
        total: {
          amount: Math.round((tipsTotal + ticketsTotal + bookingsTotal) * 100) / 100,
          currency: targetCurrency,
          change_percentage: calculateChange(tipsTotal + ticketsTotal + bookingsTotal, previousTipsTotal),
        },
      },
    };

    return NextResponse.json(response, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Error in revenue summary:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
