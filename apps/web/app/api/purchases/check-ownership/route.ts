// Alias endpoint for mobile app compatibility
// Forwards to /api/content/ownership logic
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

    // Handle authentication (mobile and web)
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('content_id');
    const contentType = searchParams.get('content_type');

    if (!contentId || !contentType) {
      return NextResponse.json(
        { success: false, error: 'content_id and content_type are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['track', 'album', 'podcast'].includes(contentType)) {
      return NextResponse.json(
        { success: false, error: 'content_type must be track, album, or podcast' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if user is the creator
    let isCreator = false;
    if (contentType === 'track') {
      const { data: track } = await supabase
        .from('audio_tracks')
        .select('creator_id')
        .eq('id', contentId)
        .single();
      
      isCreator = track?.creator_id === user.id;
    }

    // Check if user has purchased the content
    const { data: purchase } = await supabase
      .from('content_purchases')
      .select('id, purchased_at, price_paid, currency')
      .eq('user_id', user.id)
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .eq('status', 'completed')
      .single();

    const owns = isCreator || !!purchase;

    return NextResponse.json(
      {
        success: true,
        data: {
          owns,
          is_creator: isCreator,
          purchase: purchase ? {
            id: purchase.id,
            purchased_at: purchase.purchased_at,
            price_paid: purchase.price_paid,
            currency: purchase.currency,
          } : null,
        },
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error checking ownership:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
