import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Linking } from 'react-native';
import type { User, Session } from '@supabase/supabase-js';
import { authService } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ success: boolean; error?: any }>;
  signOut: () => Promise<{ success: boolean; error?: any }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...');
        const { success, session } = await authService.getSession();
        console.log('Initial session result:', { success, session: !!session });
        
        if (success && session) {
          setSession(session);
          setUser(session.user);
        }
      } catch (err) {
        console.error('Error getting initial session:', err);
        setError('Failed to get initial session');
      } finally {
        // Always set loading to false after a reasonable timeout
        console.log('Setting loading to false');
        setLoading(false);
      }
    };

    // Set a timeout to ensure loading doesn't stay true forever
    timeoutId = setTimeout(() => {
      console.log('Auth loading timeout - forcing loading to false');
      setLoading(false);
    }, 5000); // 5 second timeout

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Clear timeout when auth state changes
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        setLoading(false);
      }
    );

        // Handle deep linking for auth callbacks
        const handleDeepLink = async (url: string) => {
          console.log('­ƒöù Deep link received:', url);
          
          // Check if this looks like an OAuth callback
          const isOAuthCallback = url.includes('access_token=') || 
                                 url.includes('code=') || 
                                 url.includes('error=') ||
                                 url.includes('soundbridge://auth/callback') ||
                                 url.includes('/auth/callback') ||
                                 (url.includes('exp://') && url.includes('192.168.1.122') && url.includes('auth/callback'));
          
          if (isOAuthCallback) {
            console.log('­ƒÄ» Potential OAuth callback detected');
            
            // Try to manually process the OAuth response
            try {
              console.log('­ƒöä Manually processing OAuth callback...');
              
              // Extract URL parameters
              let urlParams: URLSearchParams;
              if (url.includes('#')) {
                // Handle hash-based parameters (common in OAuth)
                urlParams = new URLSearchParams(url.split('#')[1]);
              } else if (url.includes('?')) {
                // Handle query-based parameters
                urlParams = new URLSearchParams(url.split('?')[1]);
              } else {
                urlParams = new URLSearchParams();
              }
              
              const paramObject = Object.fromEntries(urlParams);
              console.log('­ƒôï OAuth parameters:', paramObject);
              console.log('­ƒôï Raw URL:', url);
              
              const accessToken = urlParams.get('access_token');
              const refreshToken = urlParams.get('refresh_token');
              const error = urlParams.get('error');
              
              if (error) {
                console.error('ÔØî OAuth error:', error);
                setLoading(false);
                return;
              }
              
              console.log('­ƒöì Checking for access token...');
              console.log('­ƒöì Access token found:', !!accessToken);
              console.log('­ƒöì Refresh token found:', !!refreshToken);
              
              if (accessToken) {
                console.log('­ƒÄë Access token found, setting session...');
                console.log('­ƒöì Access token length:', accessToken.length);
                console.log('­ƒöì Refresh token length:', refreshToken?.length || 0);
                
                // Try to set the session manually
                const { data: { session }, error: sessionError } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken || '',
                });
                
                console.log('­ƒöì setSession result:', { session: !!session, error: sessionError });
                
                if (sessionError) {
                  console.error('ÔØî Error setting session:', sessionError);
                  console.error('ÔØî Session error details:', sessionError.message);
                } else if (session) {
                  console.log('Ô£à Session set successfully:', session.user?.email);
                  console.log('Ô£à Session user ID:', session.user?.id);
                  setSession(session);
                  setUser(session.user);
                  await loadUserProfile(session.user.id);
                  setLoading(false);
                  return;
                } else {
                  console.log('ÔÜá´©Å setSession returned no session and no error');
                }
              } else {
                console.log('ÔØî No access token found in OAuth callback');
              }
              
              // Fallback: try to get session after a delay
              setTimeout(async () => {
                try {
                  console.log('­ƒöä Fallback: Checking session after OAuth callback...');
                  const { data: { session }, error } = await supabase.auth.getSession();
                  
                  if (error) {
                    console.error('ÔØî Error refreshing session:', error);
                    setLoading(false);
                  } else if (session) {
                    console.log('Ô£à Session refreshed successfully:', session.user?.email);
                    setSession(session);
                    setUser(session.user);
                    await loadUserProfile(session.user.id);
                    setLoading(false);
                  } else {
                    console.log('ÔÜá´©Å No session found after OAuth callback');
                    setLoading(false);
                  }
                } catch (err) {
                  console.error('ÔØî Exception refreshing session:', err);
                  setLoading(false);
                }
              }, 2000);
              
            } catch (err) {
              console.error('ÔØî Exception processing OAuth callback:', err);
              setLoading(false);
            }
          }
        };

    // Listen for deep links
    const linkingListener = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Check for initial deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.unsubscribe();
      linkingListener?.remove();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { success, error } = await authService.signIn(email, password);
      
      if (!success) {
        setError(error instanceof Error ? error.message : 'Sign in failed');
        setLoading(false);
        return { success: false, error };
      }
      
      // Update last login time
      if (data.user) {
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id);
        
        console.log(`Ô£à Updated last login for user: ${data.user.id}`);
      }
      
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: err };
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const { success, error } = await authService.signUp(email, password, metadata);
      
      if (!success) {
        setError(error instanceof Error ? error.message : 'Sign up failed');
        setLoading(false);
        return { success: false, error };
      }
      
      // Set loading to false on successful sign up
      setLoading(false);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: err };
    }
  };

  const signOut = async () => {
    setLoading(true);
    
    try {
      const { success, error } = await authService.signOut();
      
      if (!success) {
        setError(error instanceof Error ? error.message : 'Sign out failed');
        setLoading(false);
        return { success: false, error };
      }
      
      setUser(null);
      setSession(null);
      setLoading(false);
      
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: err };
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { success, error } = await authService.signInWithProvider('google');
      
      if (!success) {
        setError(error instanceof Error ? error.message : 'Google sign in failed');
        setLoading(false);
        return { success: false, error };
      }
      
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google sign in failed';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: err };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
