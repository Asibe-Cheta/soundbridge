import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
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
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // Optional filter by transaction type
    
    // Build query
    let query = supabase
      .from('revenue_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Add type filter if provided
    if (type) {
      query = query.eq('transaction_type', type);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching revenue transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch revenue transactions' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
    
  } catch (error) {
    console.error('Error in revenue transactions GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
