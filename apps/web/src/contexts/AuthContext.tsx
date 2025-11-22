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
  
  // Create Supabase client with cookie-based session storage
  // This ensures sessions work across both client and server
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    console.log('AuthProvider: Initializing...');
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('AuthProvider: Getting initial session...');
        
        // Small delay to allow cookies to sync after redirect
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const { data: { session } } = await supabase.auth.getSession();
        
        // Trust the session from getSession() - don't validate immediately
        // The session will be validated by onAuthStateChange if it's invalid
        if (session) {
          console.log('AuthProvider: Session found:', session.user.email);
          setSession(session);
          setUser(session.user);
        } else {
          console.log('AuthProvider: No session found');
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setError('Failed to get initial session');
        setSession(null);
        setUser(null);
      } finally {
        console.log('AuthProvider: Setting loading to false');
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        // Handle sign out events
        if (event === 'SIGNED_OUT' || !session) {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        // For SIGNED_IN events, trust the session immediately
        if (event === 'SIGNED_IN' && session) {
          // Set session immediately for sign-in
          setSession(session);
          setUser(session.user);
          setLoading(false);
          
          // Don't validate immediately - cookies need time to sync
          // The session will be validated on the next page load
          return;
        }
        
        // For other events (like TOKEN_REFRESHED), validate the session
        if (session) {
          const { data: { user }, error } = await supabase.auth.getUser();
          if (error || !user) {
            // Session is invalid - clear it
            console.log('AuthProvider: Session invalid in onAuthStateChange, clearing...');
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            // Session is valid
            setSession(session);
            setUser(user);
          }
        } else {
          setSession(null);
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
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