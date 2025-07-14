import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database helper functions
export const db = {
  // User profiles
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    return { data, error };
  },

  async updateProfile(userId: string, updates: any) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    return { data, error };
  },

  // Audio content
  async getAudioContent(limit = 10) {
    const { data, error } = await supabase
      .from('audio_content')
      .select(`
        *,
        creator:profiles(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return { data, error };
  },

  async getAudioContentByCreator(creatorId: string) {
    const { data, error } = await supabase
      .from('audio_content')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  },

  // Events
  async getEvents(limit = 10) {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        organizer:profiles(*)
      `)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(limit);
    
    return { data, error };
  },

  async getEventsByLocation(city: string, country: string) {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        organizer:profiles(*)
      `)
      .eq('city', city)
      .eq('country', country)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true });
    
    return { data, error };
  },

  // Search
  async searchContent(query: string) {
    const { data, error } = await supabase
      .from('audio_content')
      .select(`
        *,
        creator:profiles(*)
      `)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('play_count', { ascending: false });
    
    return { data, error };
  }
}; 