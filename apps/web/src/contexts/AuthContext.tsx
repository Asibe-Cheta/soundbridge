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
  signInWithProvider: (provider: 'google' | 'facebook' | 'apple') => Promise<{ data: any; error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const waitingForAuthEventRef = React.useRef(false);
  const fallbackTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Create Supabase client with cookie-based session storage
  // This ensures sessions work across both client and server
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    console.log('AuthProvider: Initializing...');
    
    // Get initial session with timeout protection (shorter timeout for mobile)
    const getInitialSession = async () => {
      let timeoutId: NodeJS.Timeout | null = null;
      let completed = false;

      // Detect mobile ONLY by user agent (not window width - Mac can have narrow windows)
      const isMobile = typeof window !== 'undefined' && 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const timeoutDuration = isMobile ? 4000 : 10000; // 4s for mobile, 10s for desktop (increased for slow networks)

      const timeoutPromise = new Promise<void>((resolve) => {
        timeoutId = setTimeout(() => {
          if (!completed) {
            console.warn(`AuthProvider: Session check timeout (${timeoutDuration}ms) - setting loading to false (will wait for onAuthStateChange)`);
            // Check cookies before giving up
            if (typeof window !== 'undefined') {
              const hasAuthCookie = document.cookie.includes('sb-') || 
                                    document.cookie.includes('supabase.auth.token');
              if (hasAuthCookie) {
                console.log('AuthProvider: Timeout but cookies exist - keeping user state and waiting for onAuthStateChange');
                // Don't set user to null - let onAuthStateChange handle it
                // This prevents redirect loops when getSession() is just slow
                waitingForAuthEventRef.current = true;
                if (!fallbackTimeoutRef.current) {
                  fallbackTimeoutRef.current = setTimeout(() => {
                    if (waitingForAuthEventRef.current) {
                      console.warn('AuthProvider: Auth event timeout fallback - setting loading to false');
                      waitingForAuthEventRef.current = false;
                      setLoading(false);
                    }
                  }, 8000);
                }
              } else {
                console.log('AuthProvider: Timeout and no cookies - no session');
                setLoading(false);
              }
            }
            completed = true;
          }
          resolve();
        }, timeoutDuration);
      });

      try {
        console.log('AuthProvider: Getting initial session...');
        
        // Smaller delay for mobile
        const delay = isMobile ? 100 : 200;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Wrap getSession in a timeout-aware promise
        const sessionPromise = supabase.auth.getSession().catch((err) => {
          console.error('AuthProvider: getSession error:', err);
          return { data: { session: null }, error: err };
        });
        
        const result = await Promise.race([
          sessionPromise,
          timeoutPromise.then(() => ({ data: { session: null }, timedOut: true }))
        ]) as { data: { session: any }; timedOut?: boolean };
        
        if (completed) {
          // Timeout already handled - but check cookies as fallback
          if (result.timedOut && typeof window !== 'undefined') {
            // Check if we have auth cookies as a fallback
            const hasAuthCookie = document.cookie.includes('sb-') || 
                                  document.cookie.includes('supabase.auth.token');
            if (hasAuthCookie) {
              console.log('AuthProvider: Timeout but cookies exist - waiting for onAuthStateChange');
              // Don't set user to null - let onAuthStateChange handle it
              return;
            }
          }
          return; // Timeout already handled
        }

        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        completed = true;
        waitingForAuthEventRef.current = false;
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
          fallbackTimeoutRef.current = null;
        }
        
        const { data: { session } } = result;
        
        // Trust the session from getSession() - don't validate immediately
        // The session will be validated by onAuthStateChange if it's invalid
        if (session) {
          console.log('AuthProvider: Session found:', session.user?.email);
          setSession(session);
          setUser(session.user);
        } else {
          // Check cookies as fallback before setting user to null
          if (typeof window !== 'undefined') {
            const hasAuthCookie = document.cookie.includes('sb-') || 
                                  document.cookie.includes('supabase.auth.token');
            if (hasAuthCookie) {
              console.log('AuthProvider: No session but cookies exist - waiting for onAuthStateChange');
              // Don't set user to null - let onAuthStateChange handle it
              waitingForAuthEventRef.current = true;
              if (!fallbackTimeoutRef.current) {
                fallbackTimeoutRef.current = setTimeout(() => {
                  if (waitingForAuthEventRef.current) {
                    console.warn('AuthProvider: Auth event timeout fallback - setting loading to false');
                    waitingForAuthEventRef.current = false;
                    setLoading(false);
                  }
                }, 8000);
              }
              return;
            }
          }
          console.log('AuthProvider: No session found');
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        completed = true;
        console.error('Error getting initial session:', error);
        setError('Failed to get initial session');
        setSession(null);
        setUser(null);
      } finally {
        if (timeoutId && !completed) {
          clearTimeout(timeoutId);
        }
        // Always set loading to false in finally block
        if (!completed && !waitingForAuthEventRef.current) {
          console.log('AuthProvider: Setting loading to false');
          setLoading(false);
        } else {
          // Even if timeout completed, ensure loading is false
          if (!waitingForAuthEventRef.current) {
            console.log('AuthProvider: Ensuring loading is false (timeout case)');
            setLoading(false);
          }
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        // Handle sign out events
        if (event === 'SIGNED_OUT' || !session) {
          waitingForAuthEventRef.current = false;
          if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current);
            fallbackTimeoutRef.current = null;
          }
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        // For INITIAL_SESSION or SIGNED_IN events, trust the session immediately
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          // Set session immediately - don't validate to avoid delays
          console.log('AuthProvider: Setting session from', event, 'event');
          waitingForAuthEventRef.current = false;
          if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current);
            fallbackTimeoutRef.current = null;
          }
          setSession(session);
          setUser(session.user);
          setLoading(false);
          return;
        }
        
        // For TOKEN_REFRESHED events, just update the session
        if (event === 'TOKEN_REFRESHED' && session) {
          waitingForAuthEventRef.current = false;
          if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current);
            fallbackTimeoutRef.current = null;
          }
          setSession(session);
          setUser(session.user);
          setLoading(false);
          return;
        }

        // For any other events with a session, trust the session from onAuthStateChange
        if (session) {
          waitingForAuthEventRef.current = false;
          if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current);
            fallbackTimeoutRef.current = null;
          }
          setSession(session);
          setUser(session.user);
          setLoading(false);
          return;
        }

        waitingForAuthEventRef.current = false;
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
          fallbackTimeoutRef.current = null;
        }
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    );

    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
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
      
      // @supabase/ssr automatically handles cookies via createBrowserClientSSR
      // No manual sync needed - the library manages cookies automatically
      
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
      const { error } = await supabase.auth.signOut();
      
      // Even if there's an error (like 403 - session not found), 
      // we should still clear local state since the session is invalid anyway
      if (error) {
        console.warn('Sign out error (clearing local state anyway):', error.message);
        
        // Check if it's a session_not_found error (403)
        if (error.message?.includes('session_not_found') || error.message?.includes('Session from session_id')) {
          console.log('Session already invalid - clearing local state');
        }
      }
      
      // Always clear local state regardless of error
      setSession(null);
      setUser(null);
      
      // Clear localStorage manually to ensure cleanup
      try {
        localStorage.removeItem('soundbridge-auth');
        localStorage.removeItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
      } catch (e) {
        // Ignore localStorage errors
      }
      
      // Redirect to home/login page
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      
      return { error: null }; // Return success since we cleared local state
    } catch (error) {
      console.error('Unexpected error signing out:', error);
      
      // Still clear local state on unexpected errors
      setSession(null);
      setUser(null);
      
      // Clear localStorage
      try {
        localStorage.removeItem('soundbridge-auth');
        localStorage.removeItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
      } catch (e) {
        // Ignore localStorage errors
      }
      
      // Redirect anyway
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      
      return { error };
    }
  };

  const signInWithProvider = async (provider: 'google' | 'facebook' | 'apple') => {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client not initialized') };
    }
    try {
      // Standard Supabase OAuth with PKCE
      // Supabase handles the OAuth flow via its callback endpoint, then redirects to our site
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`, // Redirect to home after OAuth completes
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