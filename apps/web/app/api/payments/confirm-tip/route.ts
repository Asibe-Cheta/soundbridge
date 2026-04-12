import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { stripe } from '@/src/lib/stripe';
import { createServiceClient } from '@/src/lib/supabase';
import {
  finalizeTipFromSucceededPaymentIntent,
  isTipPaymentIntent,
} from '@/src/lib/tip-payment-intent-webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    let supabase;
    let user;
    let authError;

    const authHeader =
      request.headers.get('authorization') ||
      request.headers.get('Authorization') ||
      request.headers.get('x-authorization') ||
      request.headers.get('x-auth-token') ||
      request.headers.get('x-supabase-token');

    if (authHeader && (authHeader.startsWith('Bearer ') || request.headers.get('x-supabase-token'))) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      });
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
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const raw = await request.text();
    let parsed: { paymentIntentId?: string };
    try {
      parsed = raw ? (JSON.parse(raw) as { paymentIntentId?: string }) : {};
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders });
    }

    const paymentIntentId = parsed.paymentIntentId;
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment intent ID is required' }, { status: 400, headers: corsHeaders });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500, headers: corsHeaders });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400, headers: corsHeaders });
    }

    if (!isTipPaymentIntent(paymentIntent)) {
      return NextResponse.json({ error: 'Not a tip payment' }, { status: 400, headers: corsHeaders });
    }

    const meta = paymentIntent.metadata || {};
    if (meta.tipperId && meta.tipperId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
    }
    if (!meta.tipperId) {
      const { data: tipRow } = await supabase
        .from('tips')
        .select('sender_id')
        .eq('payment_intent_id', paymentIntentId)
        .maybeSingle();
      if (tipRow && tipRow.sender_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
      }
    }

    const service = createServiceClient();
    const result = await finalizeTipFromSucceededPaymentIntent(paymentIntent, service);

    if (!result.ok) {
      const status = result.reason === 'no_tip_rows' ? 404 : 500;
      const message =
        result.reason === 'no_tip_rows' ? 'Tip not found' : 'Could not complete tip — contact support';
      return NextResponse.json({ error: message }, { status, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, message: 'Tip sent successfully!' }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in confirm-tip:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
    },
  });
}
