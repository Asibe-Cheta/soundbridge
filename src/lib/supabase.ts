import { createClient } from '@supabase/supabase-js';
import { createServerComponentClient as createServerComponentClientHelper } from '@supabase/auth-helpers-nextjs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from './types';

// Environment variables with robust validation and fallbacks
const getEnvVar = (key: string, required = true): string => {
  const value = process.env[key];
  
  console.log(`🔍 Checking environment variable: ${key}`);
  console.log(`   Value: ${value ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Required: ${required ? 'Yes' : 'No'}`);
  
  if (required && !value) {
    console.error(`❌ Missing required environment variable: ${key}`);
    console.error(`Available environment variables:`, Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    throw new Error(`Missing required environment variable: ${key}`);
  }
  
  return value || '';
};

// Check if we're in a server context
const isServer = typeof window === 'undefined';

// Environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseDatabaseUrl = process.env.SUPABASE_DATABASE_URL || '';

// Debug environment variables in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Environment Variables Check:');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✅ Set' : '❌ Missing');
  console.log('SUPABASE_DATABASE_URL:', supabaseDatabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('Server context:', isServer ? '✅ Yes' : '❌ No');
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
}

// Browser client (for client-side operations)
export const createBrowserClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase environment variables not configured for browser client');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.error('Available:', { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
    throw new Error('Supabase environment variables not configured for browser client. Check your .env.local file.');
  }
  
  return createClientComponentClient<Database>({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  });
};

// Server client (for server-side operations with service role)
export const createServerClient = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Supabase environment variables not configured for server client');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    console.error('Available:', { supabaseUrl: !!supabaseUrl, supabaseServiceRoleKey: !!supabaseServiceRoleKey });
    throw new Error('Supabase environment variables not configured for server client. Check your .env.local file.');
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// API route client (for API routes with service role)
export const createApiClient = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Supabase environment variables not configured for API client');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    console.error('Available:', { supabaseUrl: !!supabaseUrl, supabaseServiceRoleKey: !!supabaseServiceRoleKey });
    console.error('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      isServer: typeof window === 'undefined',
      envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
    });
    throw new Error('Supabase environment variables not configured for API client. Check your .env.local file.');
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Server component client (for server components) - only import cookies in server context
export const createServerComponentClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase environment variables not configured for server component client');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.error('Available:', { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
    throw new Error('Supabase environment variables not configured for server component client. Check your .env.local file.');
  }
  
  // Only import cookies in server context
  if (isServer) {
    const { cookies } = require('next/headers');
    return createServerComponentClientHelper<Database>({ cookies });
  } else {
    // Fallback for client context
    return createClientComponentClient<Database>({
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
    });
  }
};

// Lazy default client creation to avoid environment variable issues
let _supabase: ReturnType<typeof createClient<Database>> | null = null;

const getDefaultClient = () => {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Supabase environment variables not configured for default client');
      console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
      console.error('Available:', { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
      throw new Error('Supabase environment variables not configured for default client. Check your .env.local file.');
    }
    
    _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
  
  return _supabase;
};

// Default client for backward compatibility
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(target, prop) {
    const client = getDefaultClient();
    return client[prop as keyof typeof client];
  }
});

// Enhanced database helper functions with proper error handling
export const db = {
  // User profiles
  async getProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .is('deleted_at', null)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getProfile:', error);
      return { data: null, error: error as Error };
    }
  },

  async updateProfile(userId: string, updates: Partial<Database['public']['Tables']['profiles']['Update']>) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating profile:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in updateProfile:', error);
      return { data: null, error: error as Error };
    }
  },

  async getPublicProfiles(limit = 20) {
    try {
      const { data, error } = await supabase
        .from('public_profiles')
        .select('*')
        .order('followers_count', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching public profiles:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getPublicProfiles:', error);
      return { data: null, error: error as Error };
    }
  },

  // Audio tracks
  async getAudioTracks(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles(*)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching audio tracks:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getAudioTracks:', error);
      return { data: null, error: error as Error };
    }
  },

  async getAudioTracksByCreator(creatorId: string) {
    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select('*')
        .eq('creator_id', creatorId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching creator audio tracks:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getAudioTracksByCreator:', error);
      return { data: null, error: error as Error };
    }
  },

  async getTrendingTracks(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('trending_tracks')
        .select('*')
        .limit(limit);
      
      if (error) {
        console.error('Error fetching trending tracks:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getTrendingTracks:', error);
      return { data: null, error: error as Error };
    }
  },

  // Events
  async getEvents(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizer:profiles(*)
        `)
        .is('deleted_at', null)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching events:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getEvents:', error);
      return { data: null, error: error as Error };
    }
  },

  async getUpcomingEvents(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('upcoming_events')
        .select('*')
        .limit(limit);
      
      if (error) {
        console.error('Error fetching upcoming events:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getUpcomingEvents:', error);
      return { data: null, error: error as Error };
    }
  },

  async getEventsByLocation(city: string, country: string) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizer:profiles(*)
        `)
        .eq('city', city)
        .eq('country', country)
        .is('deleted_at', null)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true });
      
      if (error) {
        console.error('Error fetching events by location:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getEventsByLocation:', error);
      return { data: null, error: error as Error };
    }
  },

  // Messages
  async getMessages(userId: string, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching messages:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getMessages:', error);
      return { data: null, error: error as Error };
    }
  },

  // Followers
  async getFollowers(userId: string) {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          follower:profiles(*)
        `)
        .eq('following_id', userId);
      
      if (error) {
        console.error('Error fetching followers:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getFollowers:', error);
      return { data: null, error: error as Error };
    }
  },

  async getFollowing(userId: string) {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          following:profiles(*)
        `)
        .eq('follower_id', userId);
      
      if (error) {
        console.error('Error fetching following:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getFollowing:', error);
      return { data: null, error: error as Error };
    }
  },

  // Event attendees
  async getEventAttendees(eventId: string) {
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          *,
          user:profiles(*)
        `)
        .eq('event_id', eventId);
      
      if (error) {
        console.error('Error fetching event attendees:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getEventAttendees:', error);
      return { data: null, error: error as Error };
    }
  },

  // Notifications
  async getNotifications(userId: string, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching notifications:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getNotifications:', error);
      return { data: null, error: error as Error };
    }
  },

  async markNotificationAsRead(notificationId: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .select()
        .single();
      
      if (error) {
        console.error('Error marking notification as read:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in markNotificationAsRead:', error);
      return { data: null, error: error as Error };
    }
  },

  // Playlists
  async getPlaylists(creatorId?: string, limit = 10) {
    try {
      let query = supabase
        .from('playlists')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (creatorId) {
        query = query.eq('creator_id', creatorId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching playlists:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getPlaylists:', error);
      return { data: null, error: error as Error };
    }
  },

  async getPlaylistTracks(playlistId: string) {
    try {
      const { data, error } = await supabase
        .from('playlist_tracks')
        .select(`
          *,
          track:audio_tracks(*)
        `)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });
      
      if (error) {
        console.error('Error fetching playlist tracks:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getPlaylistTracks:', error);
      return { data: null, error: error as Error };
    }
  },

  // User preferences
  async getUserPreferences(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user preferences:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getUserPreferences:', error);
      return { data: null, error: error as Error };
    }
  },

  async updateUserPreferences(userId: string, updates: Partial<Database['public']['Tables']['user_preferences']['Update']>) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating user preferences:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in updateUserPreferences:', error);
      return { data: null, error: error as Error };
    }
  },

  // Likes and comments
  async getLikes(contentId: string, contentType: string) {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select(`
          *,
          user:profiles(*)
        `)
        .eq('content_id', contentId)
        .eq('content_type', contentType);
      
      if (error) {
        console.error('Error fetching likes:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getLikes:', error);
      return { data: null, error: error as Error };
    }
  },

  async getComments(contentId: string, contentType: string) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:profiles(*)
        `)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching comments:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getComments:', error);
      return { data: null, error: error as Error };
    }
  },

  // Analytics
  async getAnalytics(userId: string, date?: string) {
    try {
      let query = supabase
        .from('analytics')
        .select('*')
        .eq('user_id', userId);
      
      if (date) {
        query = query.eq('date', date);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching analytics:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in getAnalytics:', error);
      return { data: null, error: error as Error };
    }
  },

  // Search
  async searchContent(query: string, type?: 'track' | 'event' | 'profile') {
    try {
      let searchQuery = query;
      
      if (type === 'track') {
        const { data, error } = await supabase
          .from('audio_tracks')
          .select(`
            *,
            creator:profiles(*)
          `)
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .is('deleted_at', null);
        
        if (error) {
          console.error('Error searching tracks:', error);
          return { data: null, error };
        }
        
        return { data, error: null };
      } else if (type === 'event') {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            organizer:profiles(*)
          `)
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .is('deleted_at', null);
        
        if (error) {
          console.error('Error searching events:', error);
          return { data: null, error };
        }
        
        return { data, error: null };
      } else if (type === 'profile') {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
          .is('deleted_at', null);
        
        if (error) {
          console.error('Error searching profiles:', error);
          return { data: null, error };
        }
        
        return { data, error: null };
      } else {
        // Search all content types
        const { data, error } = await supabase
          .from('search_results')
          .select('*')
          .textSearch('content', query);
        
        if (error) {
          console.error('Error searching content:', error);
          return { data: null, error };
        }
        
        return { data, error: null };
      }
    } catch (error) {
      console.error('Unexpected error in searchContent:', error);
      return { data: null, error: error as Error };
    }
  },

  // Authentication helpers
  async signUp(email: string, password: string, metadata?: any) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      
      if (error) {
        console.error('Error signing up:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in signUp:', error);
      return { data: null, error: error as Error };
    }
  },

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Error signing in:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in signIn:', error);
      return { data: null, error: error as Error };
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      console.error('Unexpected error in signOut:', error);
      return { error: error as Error };
    }
  },

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error getting current user:', error);
        return { data: null, error };
      }
      
      return { data: user, error: null };
    } catch (error) {
      console.error('Unexpected error in getCurrentUser:', error);
      return { data: null, error: error as Error };
    }
  },

  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        return { data: null, error };
      }
      
      return { data: session, error: null };
    } catch (error) {
      console.error('Unexpected error in getSession:', error);
      return { data: null, error: error as Error };
    }
  },
};

// Export types for use in other files
export type { Database } from './types'; 