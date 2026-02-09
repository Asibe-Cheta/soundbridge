import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerComponentClient as createServerComponentClientHelper } from '@supabase/auth-helpers-nextjs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Database = any;

// Environment variables with robust validation and fallbacks
const getEnvVar = (key: string, required = true): string => {
  const value = process.env[key];
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 Checking environment variable: ${key}`);
    console.log(`   Value: ${value ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Required: ${required ? 'Yes' : 'No'}`);
  }
  
  if (required && !value) {
    console.error(`❌ Missing required environment variable: ${key}`);
    if (process.env.NODE_ENV === 'development') {
      console.error(`Available environment variables:`, Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    }
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
type TypedSupabaseClient = SupabaseClient<any>;

export const createBrowserClient = (): TypedSupabaseClient => {
  // Return the global client to avoid multiple instances
  return getGlobalClient();
};

// Server client (for server-side operations with service role)
export const createServerClient = (): TypedSupabaseClient => {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ Supabase environment variables not configured for server client');
      console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
      console.error('Available:', { supabaseUrl: !!supabaseUrl, supabaseServiceRoleKey: !!supabaseServiceRoleKey });
      throw new Error('Supabase environment variables not configured for server client. Check your .env.local file.');
    }
    
    const client = createClient<any>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    return client;
  } catch (error) {
    console.error('Error creating server client:', error);
    throw error;
  }
};

// API route client (for API routes that need user session)
export const createApiClient = (): TypedSupabaseClient => {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Supabase environment variables not configured for API client');
      console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
      console.error('Available:', { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
      throw new Error('Supabase environment variables not configured for API client. Check your .env.local file.');
    }
    
    // For API routes, we use the anon key with session handling
    const client = createClient<any>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    });

    return client;
  } catch (error) {
    console.error('Error creating API client:', error);
    throw error;
  }
};

// API route client with cookies (for Next.js API routes)
export const createApiClientWithCookies = async (cookies: any): Promise<TypedSupabaseClient> => {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Supabase environment variables not configured for API client with cookies');
      console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
      console.error('Available:', { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
      throw new Error('Supabase environment variables not configured for API client with cookies. Check your .env.local file.');
    }
    
    // Create client with cookies for session handling
    const client = createClient<any>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          'Cookie': cookies.toString(),
        },
      },
    });

    return client;
  } catch (error) {
    console.error('Error creating API client with cookies:', error);
    throw error;
  }
};

// Service role client (for admin operations that bypass RLS)
export const createServiceClient = (): TypedSupabaseClient => {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ Supabase environment variables not configured for service client');
      console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
      console.error('Available:', { supabaseUrl: !!supabaseUrl, supabaseServiceRoleKey: !!supabaseServiceRoleKey });
      throw new Error('Supabase environment variables not configured for service client. Check your .env.local file.');
    }
    
    const client = createClient<any>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    return client;
  } catch (error) {
    console.error('Error creating service client:', error);
    throw error;
  }
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
    return createServerComponentClientHelper<any>({ cookies });
  } else {
    // Fallback for client context
    return createClientComponentClient<any>({
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
    });
  }
};

// Import the new cookie-based browser client
import { createBrowserClient as createBrowserClientSSR } from '@supabase/ssr';

// Single global client instance to prevent multiple GoTrueClient warnings
let _globalSupabaseClient: TypedSupabaseClient | null = null;

const getCookieOptions = () => {
  if (typeof window === 'undefined') return undefined;
  
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocalhost) {
    return {
      path: '/',
      sameSite: 'lax',
      secure: false,
    };
  }

  const parts = hostname.split('.');
  const baseDomain = parts.length >= 2
    ? `.${parts.slice(-2).join('.')}`
    : hostname;

  return {
    path: '/',
    sameSite: 'lax' as const,
    secure: window.location.protocol === 'https:',
    domain: baseDomain,
  };
};

const AUTH_COOKIE_STORAGE_PREFIX = 'sb-auth-cookie:';

const getCookieValue = (name: string) => {
  if (typeof document === 'undefined') return null;
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const getLocalStorageCookie = (name: string) => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(`${AUTH_COOKIE_STORAGE_PREFIX}${name}`);
  } catch {
    return null;
  }
};

const setLocalStorageCookie = (name: string, value: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${AUTH_COOKIE_STORAGE_PREFIX}${name}`, value);
  } catch {
    // Ignore localStorage errors (e.g. blocked)
  }
};

const removeLocalStorageCookie = (name: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${AUTH_COOKIE_STORAGE_PREFIX}${name}`);
  } catch {
    // Ignore localStorage errors
  }
};

const buildCookieString = (name: string, value: string, options: any = {}) => {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.expires) {
    const expires = options.expires instanceof Date ? options.expires.toUTCString() : options.expires;
    parts.push(`Expires=${expires}`);
  }
  if (options.domain) parts.push(`Domain=${options.domain}`);
  parts.push(`Path=${options.path || '/'}`);
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push('Secure');
  return parts.join('; ');
};

const getGlobalClient = () => {
  if (!_globalSupabaseClient) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Supabase environment variables not configured for global client');
      console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
      console.error('Available:', { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
      throw new Error('Supabase environment variables not configured for global client. Check your .env.local file.');
    }
    
    // Use the cookie-based browser client from @supabase/ssr
    // This ensures sessions work across both client and server
    if (typeof window !== 'undefined') {
      const cookieOptions = getCookieOptions();

      // Let @supabase/ssr handle cookies automatically with our domain settings
      // The library will use document.cookie automatically when no cookies option is provided
      // We only provide cookieOptions to set the domain correctly
      _globalSupabaseClient = createBrowserClientSSR<any>(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookieOptions,
          cookies: {
            get(name) {
              const cookieValue = getCookieValue(name);
              if (cookieValue) {
                return cookieValue;
              }
              const fallbackValue = getLocalStorageCookie(name);
              if (fallbackValue && cookieOptions) {
                document.cookie = buildCookieString(name, fallbackValue, cookieOptions);
              }
              return fallbackValue ?? undefined;
            },
            set(name, value, options) {
              const mergedOptions = { ...(cookieOptions || {}), ...(options || {}) };
              document.cookie = buildCookieString(name, value, mergedOptions);
              setLocalStorageCookie(name, value);
            },
            remove(name, options) {
              const mergedOptions = { ...(cookieOptions || {}), ...(options || {}), maxAge: 0, expires: new Date(0) };
              document.cookie = buildCookieString(name, '', mergedOptions);
              removeLocalStorageCookie(name);
            },
          },
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
          },
        }
      );
    } else {
      // Server-side: use the old client (this should rarely be used)
      _globalSupabaseClient = createClient<any>(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
  }
  
  return _globalSupabaseClient;
};

// Default client for backward compatibility - uses single global instance
export const supabase = new Proxy({} as TypedSupabaseClient, {
  get(target, prop) {
    const client = getGlobalClient();
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
          creator:profiles!audio_tracks_creator_id_fkey(*)
        `)
        .eq('is_public', true)
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
        .update({ read: true })
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
export type { Database as GeneratedDatabase } from './types';