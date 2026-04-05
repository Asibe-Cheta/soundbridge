import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_CONFIG } from '../config/supabase';
import { Database } from '../types/database';
import { userMessageForSupabaseEmailSendError } from './supabase-auth-user-message';

/** Web URL allowed in Supabase Auth redirect URLs for recovery links from the app. */
const PASSWORD_RESET_REDIRECT_TO =
  'https://soundbridge.live/auth/callback?type=recovery&next=/update-password';

// Use configuration from config file
const supabaseUrl = SUPABASE_CONFIG.url;
const supabaseAnonKey = SUPABASE_CONFIG.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase configuration not set up for mobile app');
  console.error('Please update src/config/supabase.ts with your Supabase credentials');
  throw new Error('Supabase configuration not set up. Please update src/config/supabase.ts');
}

// Create Supabase client for React Native with AsyncStorage
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

// Auth service for mobile app
export class MobileAuthService {
  // Sign in with email and password
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, data: null, error };
    }
  }

  // Sign up with email and password
  async signUp(email: string, password: string, metadata?: any) {
    try {
      console.log('🔧 MOBILE SIGNUP: Starting signup process');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      
      console.log('🔧 MOBILE SIGNUP: Supabase response:', { data: !!data, error: !!error });
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, data: null, error };
    }
  }

  // Sign in with OAuth provider
  async signInWithProvider(provider: 'google' | 'apple') {
    try {
      console.warn('OAuth temporarily disabled due to Supabase configuration issues');
      console.warn('Please use email/password authentication instead');
      
      return { 
        success: false, 
        data: null, 
        error: new Error('OAuth temporarily unavailable. Please use email/password authentication.') 
      };
    } catch (error) {
      console.error(`${provider} sign in error:`, error);
      return { success: false, data: null, error };
    }
  }

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error };
    }
  }

  // Get current session
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      return { success: true, session, error: null };
    } catch (error) {
      console.error('Get session error:', error);
      return { success: false, session: null, error };
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      return { success: true, user, error: null };
    } catch (error) {
      console.error('Get user error:', error);
      return { success: false, user: null, error };
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  /** Request password reset email (opens web flow to set a new password). */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: PASSWORD_RESET_REDIRECT_TO,
      });
      if (error) {
        return {
          success: false,
          error: userMessageForSupabaseEmailSendError(error.message, error.code ?? null),
        };
      }
      return { success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: userMessageForSupabaseEmailSendError(msg) };
    }
  }
}

// Export singleton instance
export const authService = new MobileAuthService();
