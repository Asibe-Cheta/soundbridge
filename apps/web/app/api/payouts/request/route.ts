import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const { amount, currency = 'USD' } = await request.json();
    
    // Validate required fields
    if (!amount || amount < 25) {
      return NextResponse.json(
        { error: 'Minimum withdrawal amount is $25.00' },
        { status: 400 }
      );
    }

    // Use service-role RPC that accepts creator_id so we don't depend on auth.uid() in RPC context
    const service = createServiceClient();
    const { data, error } = await service.rpc('create_payout_request_for_user', {
      p_creator_id: user.id,
      p_amount: amount,
      p_currency: currency
    });

    if (error) {
      console.error('create_payout_request_for_user RPC error:', {
        message: error.message,
        code: (error as { code?: string })?.code,
        details: (error as { details?: string })?.details,
        hint: (error as { hint?: string })?.hint,
      });
      return NextResponse.json(
        { error: 'Failed to create payout request', details: error.message },
        { status: 500 }
      );
    }

    if (!data.success) {
      const rpcError = (data as { error?: string })?.error ?? 'Unknown error';
      const eligibility = (data as { eligibility?: unknown })?.eligibility;
      console.error('create_payout_request_for_user rejected:', {
        error: rpcError,
        creator_id: user.id,
        amount,
        currency,
        eligibility,
      });
      return NextResponse.json(
        { error: rpcError, eligibility: eligibility ?? undefined },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      request_id: data.request_id,
      message: data.message
    });
    
  } catch (error) {
    console.error('Error in payout request endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
