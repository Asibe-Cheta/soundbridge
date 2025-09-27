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

  // Get trending tracks - EXACT MATCH of web app API
  async getTrendingTracks(limit = 10) {
    try {
      console.log('🔧 TRENDING DEBUG: Starting getTrendingTracks query (WEB APP MATCH)...');
      
      // EXACT QUERY FROM WEB APP: apps/web/app/api/audio/trending/route.ts
      const { data: tracks, error } = await supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .not('genre', 'eq', 'podcast')
        .not('genre', 'eq', 'Podcast')
        .not('genre', 'eq', 'PODCAST')
        .order('play_count', { ascending: false })
        .limit(limit);
      
      console.log('🔧 TRENDING DEBUG: Query completed. Results:', {
        error: error?.message || 'No error',
        dataLength: tracks?.length || 0,
        firstItem: tracks?.[0] || 'No items'
      });
      
      if (error) {
        console.error('🔧 TRENDING DEBUG: Query error details:', error);
        throw error;
      }
      
      // Transform data to match mobile app interface (same as web app formatting)
      const transformedData = (tracks || []).map(track => ({
        id: track.id,
        title: track.title,
        description: track.description,
        file_url: track.file_url,
        cover_art_url: track.cover_art_url,
        duration: track.duration || 0,
        play_count: track.play_count || 0,
        like_count: track.like_count || 0,
        genre: track.genre,
        tags: track.tags || [],
        is_public: track.is_public,
        created_at: track.created_at,
        creator: {
          id: track.creator?.id || track.creator_id,
          username: track.creator?.username || 'unknown',
          display_name: track.creator?.display_name || 'Unknown Artist',
          avatar_url: track.creator?.avatar_url
        }
      }));
      
      console.log('🔧 TRENDING DEBUG: Transformed data:', {
        originalLength: tracks?.length || 0,
        transformedLength: transformedData.length,
        firstTransformed: transformedData[0] || 'No items'
      });
      
      return { success: true, data: transformedData, error: null };
    } catch (error) {
      console.error('🔧 TRENDING DEBUG: getTrendingTracks error:', error);
      return { success: false, data: null, error };
    }
  },

  // Get hot creators - EXACT MATCH of web app API
  async getHotCreators(limit = 10) {
    try {
      console.log('🔧 SUPABASE DEBUG: Starting getHotCreators query (WEB APP MATCH)...');
      console.log('🔧 SUPABASE DEBUG: URL:', supabaseUrl);
      console.log('🔧 SUPABASE DEBUG: Anon key exists:', !!supabaseAnonKey);
      
      // EXACT QUERY FROM WEB APP: apps/web/app/api/creators/hot/route.ts
      const { data: creators, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          location,
          country,
          genre,
          created_at,
          followers:follows!follows_following_id_fkey(count),
          recent_tracks:audio_tracks!audio_tracks_creator_id_fkey(
            id,
            title,
            play_count,
            like_count,
            created_at,
            genre
          ),
          all_tracks:audio_tracks!audio_tracks_creator_id_fkey(count),
          events:events!events_creator_id_fkey(count)
        `)
        .eq('role', 'creator')
        .order('created_at', { ascending: false });
      
      console.log('🔧 SUPABASE DEBUG: Query completed. Results:', {
        error: error?.message || 'No error',
        dataLength: creators?.length || 0,
        firstItem: creators?.[0] || 'No items'
      });
      
      if (error) {
        console.error('🔧 SUPABASE DEBUG: Query error details:', error);
        throw error;
      }
      
      // Transform data to match mobile app interface
      const transformedData = (creators || []).map(creator => ({
        id: creator.id,
        username: creator.username,
        display_name: creator.display_name,
        bio: creator.bio,
        avatar_url: creator.avatar_url,
        location: creator.location,
        country: creator.country,
        genre: creator.genre,
        followers_count: creator.followers?.[0]?.count || 0,
        tracks_count: creator.all_tracks?.[0]?.count || 0,
        events_count: creator.events?.[0]?.count || 0,
        total_plays: creator.recent_tracks?.reduce((sum, track) => sum + (track.play_count || 0), 0) || 0,
        created_at: creator.created_at
      }));
      
      console.log('🔧 SUPABASE DEBUG: Transformed data:', {
        originalLength: creators?.length || 0,
        transformedLength: transformedData.length,
        firstTransformed: transformedData[0] || 'No items'
      });
      
      return { success: true, data: transformedData, error: null };
    } catch (error) {
      console.error('🔧 SUPABASE DEBUG: getHotCreators error:', error);
      return { success: false, data: null, error };
    }
  },

  // Get events - EXACT MATCH of web app API
  async getEvents(limit = 10) {
    try {
      console.log('🔧 EVENTS DEBUG: Starting getEvents query (WEB APP MATCH)...');
      
      // EXACT QUERY FROM WEB APP: apps/web/app/api/events/route.ts
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            banner_url
          ),
          attendees:event_attendees(
            user_id,
            status,
            created_at
          )
        `)
        .order('event_date', { ascending: true })
        .limit(limit);
      
      console.log('🔧 EVENTS DEBUG: Query completed. Results:', {
        error: error?.message || 'No error',
        dataLength: data?.length || 0,
        firstItem: data?.[0] || 'No items'
      });
      
      if (error) {
        console.error('🔧 EVENTS DEBUG: Query error details:', error);
        throw error;
      }
      
      // Transform data to match mobile app interface
      const transformedData = (data || []).map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        event_date: event.event_date,
        location: event.location,
        image_url: event.image_url,
        category: event.category,
        price_gbp: event.price_gbp,
        price_ngn: event.price_ngn,
        max_attendees: event.max_attendees,
        current_attendees: event.current_attendees || 0,
        created_at: event.created_at,
        creator: {
          id: event.creator?.id || event.creator_id,
          username: event.creator?.username || 'unknown',
          display_name: event.creator?.display_name || 'Unknown Organizer',
          avatar_url: event.creator?.avatar_url
        },
        attendees_count: event.attendees?.length || 0
      }));
      
      console.log('🔧 EVENTS DEBUG: Transformed data:', {
        originalLength: data?.length || 0,
        transformedLength: transformedData.length,
        firstTransformed: transformedData[0] || 'No items'
      });
      
      return { success: true, data: transformedData, error: null };
    } catch (error) {
      console.error('🔧 EVENTS DEBUG: getEvents error:', error);
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
