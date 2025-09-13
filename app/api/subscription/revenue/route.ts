import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user revenue information
    const { data: revenue, error: revenueError } = await supabase
      .from('creator_revenue')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (revenueError && revenueError.code !== 'PGRST116') {
      console.error('Error fetching revenue:', revenueError);
      return NextResponse.json({ error: 'Failed to fetch revenue' }, { status: 500 });
    }

    // Default revenue if not found
    const defaultRevenue = {
      total_earned: 0,
      total_paid_out: 0,
      pending_balance: 0,
      last_payout_at: null,
      payout_threshold: 50.00
    };

    const revenueData = revenue || defaultRevenue;

    // Calculate available balance
    const availableBalance = Math.max(0, revenueData.total_earned - revenueData.total_paid_out);
    const canRequestPayout = availableBalance >= revenueData.payout_threshold;

    return NextResponse.json({
      success: true,
      data: {
        revenue: {
          ...revenueData,
          available_balance: availableBalance,
          can_request_payout: canRequestPayout,
          formatted_total_earned: `$${revenueData.total_earned.toFixed(2)}`,
          formatted_total_paid_out: `$${revenueData.total_paid_out.toFixed(2)}`,
          formatted_pending_balance: `$${revenueData.pending_balance.toFixed(2)}`,
          formatted_available_balance: `$${availableBalance.toFixed(2)}`,
          formatted_payout_threshold: `$${revenueData.payout_threshold.toFixed(2)}`
        },
        summary: {
          totalEarned: revenueData.total_earned,
          totalPaidOut: revenueData.total_paid_out,
          pendingBalance: revenueData.pending_balance,
          availableBalance,
          canRequestPayout,
          payoutThreshold: revenueData.payout_threshold,
          lastPayoutDate: revenueData.last_payout_at
        }
      }
    });

  } catch (error) {
    console.error('Revenue fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, amount } = body;

    if (action === 'add_earnings') {
      // Add earnings (e.g., from plays, downloads, etc.)
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
      }

      const { data: revenue, error: revenueError } = await supabase
        .from('creator_revenue')
        .upsert({
          user_id: user.id,
          total_earned: amount
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (revenueError) {
        console.error('Error adding earnings:', revenueError);
        return NextResponse.json({ error: 'Failed to add earnings' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: {
          revenue,
          message: `Added $${amount.toFixed(2)} to your earnings`
        }
      });

    } else if (action === 'request_payout') {
      // Request payout
      const { data: currentRevenue, error: fetchError } = await supabase
        .from('creator_revenue')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching current revenue:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch current revenue' }, { status: 500 });
      }

      if (!currentRevenue) {
        return NextResponse.json({ error: 'No revenue data found' }, { status: 404 });
      }

      const availableBalance = currentRevenue.total_earned - currentRevenue.total_paid_out;
      
      if (availableBalance < currentRevenue.payout_threshold) {
        return NextResponse.json({ 
          error: `Minimum payout threshold is $${currentRevenue.payout_threshold.toFixed(2)}. You have $${availableBalance.toFixed(2)} available.` 
        }, { status: 400 });
      }

      // Update revenue with payout request
      const { data: revenue, error: updateError } = await supabase
        .from('creator_revenue')
        .update({
          pending_balance: availableBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error requesting payout:', updateError);
        return NextResponse.json({ error: 'Failed to request payout' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: {
          revenue,
          message: `Payout request submitted for $${availableBalance.toFixed(2)}`
        }
      });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Revenue update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
