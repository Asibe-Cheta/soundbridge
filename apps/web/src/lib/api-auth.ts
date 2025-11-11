import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

import type { Database } from './types';

type AuthMode = 'cookie' | 'bearer';

export interface SupabaseRouteAuth {
  supabase: SupabaseClient<Database>;
  user: User | null;
  error: Error | null;
  mode: AuthMode;
}

const BEARER_HEADER_KEYS = [
  'authorization',
  'Authorization',
  'x-authorization',
  'x-auth-token',
  'x-supabase-token',
];

export async function getSupabaseRouteClient(request: NextRequest, requireAuth = true): Promise<SupabaseRouteAuth> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured');
  }

  let mode: AuthMode = 'cookie';
  let supabase: SupabaseClient<Database>;
  let user: User | null = null;
  let authError: Error | null = null;

  const headerValue = BEARER_HEADER_KEYS.map((key) => request.headers.get(key)).find(Boolean);

  if (headerValue && (headerValue.startsWith('Bearer ') || request.headers.get('x-supabase-token'))) {
    const token = headerValue.startsWith('Bearer ') ? headerValue.substring(7) : headerValue;
    mode = 'bearer';
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data, error } = await supabase.auth.getUser();
    user = data?.user ?? null;
    authError = error ?? null;
  } else {
    mode = 'cookie';
    const cookieStore = cookies();
    supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    const { data, error } = await supabase.auth.getUser();
    user = data?.user ?? null;
    authError = error ?? null;
  }

  if (requireAuth && (!user || authError)) {
    const reason = authError ?? new Error('Authentication required');
    return { supabase, user: null, error: reason, mode };
  }

  return {
    supabase,
    user,
    error: authError,
    mode,
  };
}

