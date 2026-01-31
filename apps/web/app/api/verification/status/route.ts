import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const serviceClient = createServerClient();
    const { data, error } = await serviceClient
      .from('profiles')
      .select('id, is_verified')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching verification status:', error);
      return NextResponse.json({ error: 'Failed to fetch verification status' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ is_verified: !!data.is_verified });
  } catch (error: any) {
    console.error('Unexpected verification status error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
