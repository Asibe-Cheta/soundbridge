import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET creator earnings summary
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

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
    const monthParam = searchParams.get('month'); // Format: YYYY-MM

    // Calculate date range
    let startDate: Date;
    let endDate: Date;

    if (monthParam) {
      // Parse month parameter (e.g., "2025-11")
      const [year, month] = monthParam.split('-').map(Number);
      
      if (!year || !month || month < 1 || month > 12) {
        return NextResponse.json(
          { error: 'Invalid month format. Use YYYY-MM (e.g., 2025-11)' },
          { status: 400, headers: corsHeaders }
        );
      }

      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 1);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    // Call the database function to get earnings summary
    const { data: earningsData, error: earningsError } = await supabase
      .rpc('get_creator_earnings_summary', {
        p_user_id: user.id,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      });

    if (earningsError) {
      console.error('Error fetching earnings summary:', earningsError);
      return NextResponse.json(
        { error: 'Failed to fetch earnings summary', details: earningsError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse the JSONB response from the function
    const earnings = earningsData as {
      period: {
        start_date: string;
        end_date: string;
      };
      tips: {
        amount: number;
        count: number;
        currency: string;
      };
      streams: {
        count: number;
        top_tracks: Array<{
          id: string;
          title: string;
          plays: number;
          likes: number;
        }>;
      };
      followers: {
        new_count: number;
        total_count: number;
      };
      engagement: {
        likes: number;
        comments: number;
        shares: number;
      };
    };

    // Format the response
    return NextResponse.json(
      {
        success: true,
        month: monthParam || new Date().toISOString().slice(0, 7),
        period: {
          start_date: earnings.period.start_date,
          end_date: earnings.period.end_date
        },
        tips: {
          amount: Number(earnings.tips.amount).toFixed(2),
          count: earnings.tips.count,
          currency: earnings.tips.currency
        },
        streams: {
          count: earnings.streams.count,
          top_tracks: earnings.streams.top_tracks || []
        },
        followers: {
          new_count: earnings.followers.new_count,
          total_count: earnings.followers.total_count
        },
        engagement: {
          likes: earnings.engagement.likes,
          comments: earnings.engagement.comments,
          shares: earnings.engagement.shares
        }
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error in GET /api/creator/earnings-summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

