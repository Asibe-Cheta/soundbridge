import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { albumId: string } }
) {
  try {
    let supabase;
    let user;
    let authError;

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
              } catch {
                /* ignore */
              }
            },
            remove(name: string, options: CookieOptions) {
              try {
                cookieStore.set({ name, value: '', ...options, maxAge: 0 });
              } catch {
                /* ignore */
              }
            },
          },
        }
      );
      const {
        data: { user: userData },
        error: userError,
      } = await supabase.auth.getUser();
      user = userData;
      authError = userError;
    }

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const albumId = params.albumId;
    const { is_paid, price, currency } = await request.json();

    const { data: album, error: albumError } = await supabase
      .from('albums')
      .select('creator_id')
      .eq('id', albumId)
      .single();

    if (albumError || !album) {
      return NextResponse.json(
        { success: false, message: 'Album not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (album.creator_id !== user.id) {
      return NextResponse.json(
        { success: false, message: 'You can only set pricing for your own albums' },
        { status: 403, headers: corsHeaders }
      );
    }

    if (is_paid) {
      if (!price || price < 0.99 || price > 50.0) {
        return NextResponse.json(
          { success: false, message: 'Price must be between 0.99 and 50.00' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (!currency || !['USD', 'GBP', 'EUR'].includes(currency)) {
        return NextResponse.json(
          { success: false, message: 'Currency must be USD, GBP, or EUR' },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    const updateData: Record<string, unknown> = {
      is_paid: !!is_paid,
    };

    if (is_paid) {
      updateData.price = price;
      updateData.currency = currency;
    } else {
      updateData.price = null;
      updateData.currency = null;
    }

    const { error: updateError } = await supabase.from('albums').update(updateData).eq('id', albumId);

    if (updateError) {
      console.error('Error updating album pricing:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to update pricing' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Album pricing updated successfully',
      },
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error updating album pricing:', error);
    return NextResponse.json({ success: false, message }, { status: 500, headers: corsHeaders });
  }
}
