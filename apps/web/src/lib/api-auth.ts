import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

type AuthMode = 'cookie' | 'bearer';

export interface SupabaseRouteAuth {
  supabase: SupabaseClient<any>;
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
  let supabase: SupabaseClient<any>;
  let user: User | null = null;
  let authError: Error | null = null;

  // Check for bearer token in any of the supported headers
  let token: string | null = null;
  
  for (const headerKey of BEARER_HEADER_KEYS) {
    const headerValue = request.headers.get(headerKey);
    if (headerValue) {
      // Extract token: remove "Bearer " prefix if present, otherwise use value as-is
      token = headerValue.startsWith('Bearer ') ? headerValue.substring(7) : headerValue;
      break; // Use first matching header
    }
  }

  if (token) {
    mode = 'bearer';
    supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // IMPORTANT: getUser() must be called with the token parameter when using bearer auth
    const { data, error } = await supabase.auth.getUser(token);
    user = data?.user ?? null;
    authError = error ?? null;
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development' && (!user || authError)) {
      console.log('🔍 Bearer auth debug:', {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        error: authError?.message,
        mode: 'bearer',
      });
    }
  } else {
    mode = 'cookie';
    try {
      const cookieStore = await cookies(); // Await cookies in Next.js 15
      supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              try {
                cookieStore.set({ name, value, ...options });
              } catch (error) {
                // Handle cookie setting errors (can happen in middleware)
              }
            },
            remove(name: string, options: CookieOptions) {
              try {
                cookieStore.set({ name, value: '', ...options });
              } catch (error) {
                // Handle cookie removal errors
              }
            },
          },
        }
      );
      
      const { data, error } = await supabase.auth.getUser();
      user = data?.user ?? null;
      authError = error ?? null;
      
      // Debug logging in development
      if (process.env.NODE_ENV === 'development' && (!user || authError)) {
        console.log('🔍 Cookie auth debug:', {
          hasCookies: cookieStore.getAll().length > 0,
          cookieNames: cookieStore.getAll().map(c => c.name),
          error: authError?.message,
        });
      }
    } catch (cookieError) {
      console.error('❌ Error reading cookies:', cookieError);
      authError = cookieError instanceof Error ? cookieError : new Error('Failed to read cookies');
      user = null;
      // Still create a supabase client for error handling
      const cookieStore = await cookies();
      supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              try {
                cookieStore.set({ name, value, ...options });
              } catch (error) {
                // Ignore errors
              }
            },
            remove(name: string, options: CookieOptions) {
              try {
                cookieStore.set({ name, value: '', ...options });
              } catch (error) {
                // Ignore errors
              }
            },
          },
        }
      );
    }
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

