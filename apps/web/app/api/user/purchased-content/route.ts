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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get('content_type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('content_purchases')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('purchased_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (contentType && ['track', 'album', 'podcast'].includes(contentType)) {
      query = query.eq('content_type', contentType);
    }

    const { data: purchases, error: purchasesError } = await query;

    if (purchasesError) {
      console.error('Error fetching purchases:', purchasesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch purchases' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Fetch content details for each purchase
    const purchasesWithContent = await Promise.all(
      (purchases || []).map(async (purchase) => {
        let content: any = null;
        let creator: any = null;

        if (purchase.content_type === 'track') {
          const { data: track } = await supabase
            .from('audio_tracks')
            .select('id, title, creator_id, cover_art_url, file_url')
            .eq('id', purchase.content_id)
            .single();

          if (track) {
            content = {
              id: track.id,
              title: track.title,
              creator_id: track.creator_id,
              cover_art_url: track.cover_art_url,
              file_url: track.file_url,
              duration: 0, // TODO: Get from track metadata
            };

            // Get creator info
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url')
              .eq('id', track.creator_id)
              .single();

            if (profile) {
              creator = {
                id: profile.id,
                username: profile.username,
                display_name: profile.display_name,
                avatar_url: profile.avatar_url,
              };
            }
          }
        }
        // TODO: Handle albums and podcasts

        return {
          purchase: {
            id: purchase.id,
            content_id: purchase.content_id,
            content_type: purchase.content_type,
            price_paid: purchase.price_paid,
            currency: purchase.currency,
            purchased_at: purchase.purchased_at,
            download_count: purchase.download_count,
          },
          content: content ? {
            ...content,
            creator: creator || null,
          } : null,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: purchasesWithContent.filter(item => item.content !== null),
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error fetching purchased content:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
