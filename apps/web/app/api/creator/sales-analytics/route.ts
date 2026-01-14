import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    let supabase;
    let user;
    let authError;

    // Handle authentication
    const authHeader = request.headers.get('authorization') || 
                      request.headers.get('Authorization') ||
                      request.headers.get('x-authorization') ||
                      request.headers.get('x-auth-token') ||
                      request.headers.get('x-supabase-token');
    
    if (authHeader && (authHeader.startsWith('Bearer ') || request.headers.get('x-supabase-token'))) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );
      const { data: userData, error: userError } = await supabase.auth.getUser();
      user = userData.user;
      authError = userError;
    } else {
      const cookieStore = await cookies();
      supabase = createServerClient(
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
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
      user = userData;
      authError = userError;
    }
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get creator's tracks
    const { data: tracks } = await supabase
      .from('audio_tracks')
      .select('id')
      .eq('creator_id', user.id)
      .eq('is_paid', true);

    const trackIds = tracks?.map(t => t.id) || [];

    if (trackIds.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            total_revenue: 0,
            revenue_this_month: 0,
            total_sales_count: 0,
            sales_by_type: {
              tracks: 0,
              albums: 0,
              podcasts: 0,
            },
            top_selling_content: [],
            recent_sales: [],
          },
        },
        { headers: corsHeaders }
      );
    }

    // Get all purchases for creator's content
    const { data: purchases } = await supabase
      .from('content_purchases')
      .select('*')
      .in('content_id', trackIds)
      .eq('content_type', 'track')
      .eq('status', 'completed')
      .order('purchased_at', { ascending: false });

    // Calculate totals
    const totalRevenue = (purchases || []).reduce((sum, p) => sum + Number(p.creator_earnings), 0);
    
    // This month's revenue
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const revenueThisMonth = (purchases || [])
      .filter(p => new Date(p.purchased_at) >= startOfMonth)
      .reduce((sum, p) => sum + Number(p.creator_earnings), 0);

    const totalSalesCount = purchases?.length || 0;

    // Sales by type (currently only tracks)
    const salesByType = {
      tracks: purchases?.filter(p => p.content_type === 'track').length || 0,
      albums: 0, // TODO: When albums are implemented
      podcasts: 0, // TODO: When podcasts are implemented
    };

    // Top selling content
    const salesByContent: Record<string, { count: number; revenue: number; title: string }> = {};
    (purchases || []).forEach(purchase => {
      if (!salesByContent[purchase.content_id]) {
        salesByContent[purchase.content_id] = { count: 0, revenue: 0, title: '' };
      }
      salesByContent[purchase.content_id].count += 1;
      salesByContent[purchase.content_id].revenue += Number(purchase.creator_earnings);
    });

    // Get track titles
    const contentIds = Object.keys(salesByContent);
    if (contentIds.length > 0) {
      const { data: contentData } = await supabase
        .from('audio_tracks')
        .select('id, title')
        .in('id', contentIds);

      (contentData || []).forEach(track => {
        if (salesByContent[track.id]) {
          salesByContent[track.id].title = track.title;
        }
      });
    }

    const topSellingContent = Object.entries(salesByContent)
      .map(([content_id, data]) => ({
        content_id,
        content_type: 'track' as const,
        title: data.title,
        sales_count: data.count,
        revenue: Math.round(data.revenue * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Recent sales (last 50)
    const recentPurchases = (purchases || []).slice(0, 50);
    
    // Get buyer usernames and track titles
    const buyerIds = [...new Set(recentPurchases.map(p => p.user_id))];
    const { data: buyerProfiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', buyerIds);

    const buyerMap = new Map((buyerProfiles || []).map(p => [p.id, p.username]));

    const recentSales = await Promise.all(
      recentPurchases.map(async (purchase) => {
        const { data: track } = await supabase
          .from('audio_tracks')
          .select('title')
          .eq('id', purchase.content_id)
          .single();

        return {
          purchase_id: purchase.id,
          buyer_username: buyerMap.get(purchase.user_id) || 'Unknown User',
          content_title: track?.title || 'Unknown Track',
          price_paid: purchase.price_paid,
          currency: purchase.currency,
          purchased_at: purchase.purchased_at,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          total_revenue: Math.round(totalRevenue * 100) / 100,
          revenue_this_month: Math.round(revenueThisMonth * 100) / 100,
          total_sales_count: totalSalesCount,
          sales_by_type: salesByType,
          top_selling_content: topSellingContent,
          recent_sales: recentSales,
        },
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error fetching sales analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
