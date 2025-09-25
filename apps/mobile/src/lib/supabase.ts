import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '@soundbridge/types';
import { SUPABASE_CONFIG } from '../config/supabase';

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
    detectSessionInUrl: true, // Enable to detect OAuth session
    flowType: 'pkce', // Use PKCE flow for better security
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
          // Let Supabase use default email redirect (will go to /auth/callback)
          // Our smart callback route will handle mobile detection and redirect
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
      // TEMPORARY WORKAROUND: Your Supabase project has OAuth configuration issues
      // For now, we'll return an error message asking the user to use email/password
      // This avoids the 500 error that's preventing the app from working
      
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
}

// Export singleton instance
export const authService = new MobileAuthService();

// Database helper functions for mobile
export const db = {
  // Get user profile
  async getProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .is('deleted_at', null)
        .single();
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Get profile error:', error);
      return { success: false, data: null, error };
    }
  },

  // Update user profile
  async updateProfile(userId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, data: null, error };
    }
  },

  // Get audio tracks
  async getAudioTracks(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles(*)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Get audio tracks error:', error);
      return { success: false, data: null, error };
    }
  },

  // Get trending tracks
  async getTrendingTracks(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('trending_tracks')
        .select('*')
        .limit(limit);
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Get trending tracks error:', error);
      return { success: false, data: null, error };
    }
  },

  // Get events
  async getEvents(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(*)
        `)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Get events error:', error);
      return { success: false, data: null, error };
    }
  },

  // Get notifications
  async getNotifications(userId: string, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Get notifications error:', error);
      return { success: false, data: null, error };
    }
  },
};
