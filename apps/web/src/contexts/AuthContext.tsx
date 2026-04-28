'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/src/lib/supabase-browser';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
  signInWithProvider: (
    provider: 'google' | 'facebook' | 'apple',
    options?: { next?: string }
  ) => Promise<{ data: any; error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_DEBUG = process.env.NODE_ENV !== 'production';
const authDebug = (...args: unknown[]) => {
  if (AUTH_DEBUG) console.log(...args);
};

/** Only used to unblock the UI if getSession() never completes (should be rare). Never clears session. */
const SESSION_LOAD_SAFETY_MS = 45_000;
const PROTECTED_PATHS = ['/admin', '/dashboard', '/settings'];
const PROTECTED_PROBE_MAX_RETRIES = 6;
const AUTH_CALL_TIMEOUT_MS = 6000;

function isProtectedPathname(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname.startsWith(p));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = AUTH_CALL_TIMEOUT_MS): Promise<T | null> {
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    authDebug('AuthProvider: Initializing...');

    let cancelled = false;
    let protectedRetryTimer: ReturnType<typeof setTimeout> | null = null;

    // 1) Subscribe first so INITIAL_SESSION / SIGNED_IN are never missed (listener must exist before hydration).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled) return;
      authDebug('Auth state changed:', event, nextSession?.user?.email);

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (!nextSession) {
        // Ignore null-session transient events that are not explicit sign-outs.
        // getSession() hydration will set the canonical session/null state.
        authDebug('AuthProvider: ignoring null session for non-SIGNED_OUT event:', event);
        return;
      }

      setSession(nextSession);
      setUser(nextSession.user);
      setLoading(false);
    });

    // 2) Hydrate from storage after the listener is attached (Supabase-recommended order).
    const hydrate = async () => {
      try {
        authDebug('AuthProvider: getSession() after listener registered');
        const sessionResp = await withTimeout(supabase.auth.getSession());
        if (cancelled) return;

        if (!sessionResp) {
          console.warn('AuthProvider: getSession timed out');
          return;
        }

        const {
          data: { session: s },
          error: sessionError,
        } = sessionResp;

        if (sessionError) {
          console.error('AuthProvider: getSession error:', sessionError);
          setError('Failed to get initial session');
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        // May match what INITIAL_SESSION already applied; keeps state in sync if listener order varies.
        if (s) {
          authDebug('AuthProvider: Session from getSession:', s.user?.email);
          setSession(s);
          setUser(s.user);
        } else {
          const currentPath =
            typeof window !== 'undefined' ? window.location.pathname : '';
          if (isProtectedPathname(currentPath)) {
            authDebug('AuthProvider: No session on protected path, probing getUser() before anonymous fallback');
            const userResp = await withTimeout(supabase.auth.getUser());
            if (!cancelled && userResp && !userResp.error && userResp.data?.user) {
              setUser(userResp.data.user);
              return;
            }
          }
          authDebug('AuthProvider: No session/user from hydrate');
          setSession(null);
          setUser(null);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error getting initial session:', err);
        setError('Failed to get initial session');
        setSession(null);
        setUser(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const safetyTimer = setTimeout(() => {
      if (cancelled) return;
      const currentPath =
        typeof window !== 'undefined' ? window.location.pathname : '';
      const isProtectedPath = isProtectedPathname(currentPath);

      if (!isProtectedPath) {
        setLoading((stillLoading) => {
          if (stillLoading) {
            console.warn(
              `AuthProvider: Session load safety timeout (${SESSION_LOAD_SAFETY_MS}ms) — clearing loading only; session left to Supabase`
            );
          }
          return false;
        });
        return;
      }

      // For protected routes, prefer retrying before declaring anonymous.
      console.warn(
        `AuthProvider: Session load timeout on protected path (${currentPath}). Retrying auth probe to avoid false logout.`
      );

      let attempts = 0;
      const probe = async () => {
        attempts += 1;
        try {
          const sessionResp = await withTimeout(supabase.auth.getSession());
          if (cancelled) return;
          if (sessionResp?.data?.session?.user) {
            setSession(sessionResp.data.session);
            setUser(sessionResp.data.session.user);
            setLoading(false);
            return;
          }

          const userResp = await withTimeout(supabase.auth.getUser());
          if (cancelled) return;
          if (userResp && !userResp.error && userResp.data?.user) {
            setUser(userResp.data.user);
            setLoading(false);
            return;
          }
        } catch {
          // ignore, retry below
        }

        if (cancelled) return;
        if (attempts >= PROTECTED_PROBE_MAX_RETRIES) {
          console.warn(
            `AuthProvider: protected auth probe exhausted (${attempts} attempts). Clearing loading.`
          );
          setLoading(false);
          return;
        }
        if (!cancelled) {
          protectedRetryTimer = setTimeout(probe, 2000);
        }
      };

      void probe();
    }, SESSION_LOAD_SAFETY_MS);

    void hydrate().finally(() => {
      clearTimeout(safetyTimer);
    });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      if (protectedRetryTimer) clearTimeout(protectedRetryTimer);
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client not initialized') };
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { data: null, error };
      }

      // Optimistically sync auth context immediately after successful password login.
      // This avoids login->dashboard bounces when auth events/session hydration are delayed.
      if (data?.session && data?.user) {
        setSession(data.session);
        setUser(data.user);
        setLoading(false);
        setError(null);
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error signing in:', error);
      return { data: null, error };
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client not initialized') };
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      return { data, error };
    } catch (error) {
      console.error('Error signing up:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    if (!supabase) {
      return { error: new Error('Supabase client not initialized') };
    }
    try {
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('2fa_required');
          sessionStorage.removeItem('2fa_session_token');
          sessionStorage.removeItem('login_email');
          sessionStorage.removeItem('login_password');
        } catch {
          /* ignore */
        }
      }
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) {
        console.warn('Sign out error (clearing local state anyway):', error.message);

        if (error.message?.includes('session_not_found') || error.message?.includes('Session from session_id')) {
          authDebug('Session already invalid - clearing local state');
        }
      }

      setSession(null);
      setUser(null);

      try {
        localStorage.removeItem('soundbridge-auth');
        localStorage.removeItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
      } catch (e) {
        // Ignore localStorage errors
      }

      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected error signing out:', error);

      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('2fa_required');
          sessionStorage.removeItem('2fa_session_token');
          sessionStorage.removeItem('login_email');
          sessionStorage.removeItem('login_password');
        } catch {
          /* ignore */
        }
      }

      setSession(null);
      setUser(null);

      try {
        localStorage.removeItem('soundbridge-auth');
        localStorage.removeItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
      } catch (e) {
        // Ignore localStorage errors
      }

      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }

      return { error };
    }
  };

  const signInWithProvider = async (
    provider: 'google' | 'facebook' | 'apple',
    options?: { next?: string }
  ) => {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client not initialized') };
    }
    try {
      const nextPath =
        options?.next && options.next.startsWith('/') ? options.next : '/dashboard';
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      return { data, error };
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      return { data: null, error };
    }
  };

  const value = {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    signInWithProvider,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
