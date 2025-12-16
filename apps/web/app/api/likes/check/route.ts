import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/src/lib/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/likes/check?content_id=xxx&content_type=track
 * Check if user has liked specific content
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {}
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {}
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { isLiked: false },
        { headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const content_id = searchParams.get('content_id');
    const content_type = searchParams.get('content_type');

    if (!content_id || !content_type) {
      return NextResponse.json(
        { error: 'content_id and content_type query parameters are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if like exists
    const { data: like, error } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', content_id)
      .eq('content_type', content_type)
      .single();

    return NextResponse.json(
      { isLiked: !!like },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in GET /api/likes/check:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
