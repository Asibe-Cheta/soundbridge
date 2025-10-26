import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
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

    // Create payout request
    const { data, error } = await supabase.rpc('create_payout_request', {
      p_amount: amount,
      p_currency: currency
    });

    if (error) {
      console.error('Error creating payout request:', error);
      return NextResponse.json(
        { error: 'Failed to create payout request' },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        { error: data.error },
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
