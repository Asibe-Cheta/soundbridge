import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { mergeCreatorRevenueSummaryWithWallet } from '@/src/lib/creator-revenue-summary-merge';
import { mapRevenueSummaryToClient } from '@/src/lib/revenue-api-mapper';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase.rpc('get_creator_revenue_summary', {
      user_uuid: user.id,
    });

    if (error) {
      console.error('Error fetching revenue summary:', error);
      return NextResponse.json({ error: 'Failed to fetch revenue' }, { status: 500 });
    }

    const row = data?.[0] as Record<string, unknown> | undefined;
    const merged = row
      ? await mergeCreatorRevenueSummaryWithWallet(supabase, user.id, row)
      : {
          total_earned: 0,
          total_paid_out: 0,
          pending_balance: 0,
          available_balance: 0,
          wallet_balance: 0,
          pending_payout_requests: 0,
          this_month_earnings: 0,
          last_month_earnings: 0,
          total_tips: 0,
          total_track_sales: 0,
          total_subscriptions: 0,
        };

    const { data: crRow } = await supabase
      .from('creator_revenue')
      .select('payout_threshold, last_payout_at')
      .eq('user_id', user.id)
      .maybeSingle();

    const payoutThreshold = Number(crRow?.payout_threshold ?? 50);
    const availableBalance = merged.available_balance;
    const canRequestPayout = availableBalance >= payoutThreshold;

    const revenueData = {
      total_earned: merged.total_earned,
      total_paid_out: merged.total_paid_out,
      pending_balance: merged.pending_balance,
      available_balance: availableBalance,
      wallet_balance: merged.wallet_balance ?? 0,
      payout_threshold: payoutThreshold,
      last_payout_at: crRow?.last_payout_at ?? null,
      can_request_payout: canRequestPayout,
      formatted_total_earned: `$${merged.total_earned.toFixed(2)}`,
      formatted_total_paid_out: `$${merged.total_paid_out.toFixed(2)}`,
      formatted_pending_balance: `$${merged.pending_balance.toFixed(2)}`,
      formatted_available_balance: `$${availableBalance.toFixed(2)}`,
      formatted_payout_threshold: `$${payoutThreshold.toFixed(2)}`,
    };

    return NextResponse.json({
      success: true,
      data: {
        revenue: revenueData,
        summary: {
          ...mapRevenueSummaryToClient(merged),
          canRequestPayout,
          payoutThreshold,
          lastPayoutDate: crRow?.last_payout_at ?? null,
        },
      },
    });
  } catch (error) {
    console.error('Revenue fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, amount } = body;

    if (action === 'add_earnings') {
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
      }

      const { data: revenue, error: revenueError } = await supabase
        .from('creator_revenue')
        .upsert(
          {
            user_id: user.id,
            total_earned: amount,
          },
          {
            onConflict: 'user_id',
          },
        )
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
          message: `Added $${amount.toFixed(2)} to your earnings`,
        },
      });
    }

    if (action === 'request_payout') {
      const { data: eligibility, error: eligError } = await supabase.rpc('get_payout_eligibility', {
        p_creator_id: user.id,
        p_bank_currency: null,
      });

      if (eligError) {
        console.error('Error fetching payout eligibility:', eligError);
        return NextResponse.json({ error: 'Failed to fetch payout eligibility' }, { status: 500 });
      }

      const elig = eligibility as Record<string, unknown> | null;
      const withdrawable = Number(elig?.withdrawable_amount ?? 0);
      const minPayout = Number(elig?.min_payout ?? 20);

      if (withdrawable < minPayout) {
        return NextResponse.json(
          {
            error: `Minimum payout threshold is $${minPayout.toFixed(2)}. You have $${withdrawable.toFixed(2)} withdrawable.`,
          },
          { status: 400 },
        );
      }

      const { data: revenue, error: updateError } = await supabase
        .from('creator_revenue')
        .update({
          pending_balance: withdrawable,
          updated_at: new Date().toISOString(),
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
          message: `Payout request submitted for $${withdrawable.toFixed(2)}`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Revenue update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
