export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string
          bio: string | null
          avatar_url: string | null
          cover_image_url: string | null
          user_type: 'listener' | 'creator' | 'artist' | 'producer'
          location: string | null
          website: string | null
          social_links: Json | null
          followers_count: number
          following_count: number
          tracks_count: number
          verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name: string
          bio?: string | null
          avatar_url?: string | null
          cover_image_url?: string | null
          user_type?: 'listener' | 'creator' | 'artist' | 'producer'
          location?: string | null
          website?: string | null
          social_links?: Json | null
          followers_count?: number
          following_count?: number
          tracks_count?: number
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string
          bio?: string | null
          avatar_url?: string | null
          cover_image_url?: string | null
          user_type?: 'listener' | 'creator' | 'artist' | 'producer'
          location?: string | null
          website?: string | null
          social_links?: Json | null
          followers_count?: number
          following_count?: number
          tracks_count?: number
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      audio_tracks: {
        Row: {
          id: string
          title: string
          description: string | null
          audio_url: string
          cover_image_url: string | null
          duration: number | null
          plays_count: number
          likes_count: number
          genre: string | null
          tags: string[] | null
          is_public: boolean
          created_at: string
          updated_at: string
          creator_id: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          audio_url: string
          cover_image_url?: string | null
          duration?: number | null
          plays_count?: number
          likes_count?: number
          genre?: string | null
          tags?: string[] | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
          creator_id: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          audio_url?: string
          cover_image_url?: string | null
          duration?: number | null
          plays_count?: number
          likes_count?: number
          genre?: string | null
          tags?: string[] | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
          creator_id?: string
        }
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          event_date: string
          location: string | null
          venue_name: string | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          price_range: Json | null
          category: string
          organizer_id: string
          attendees_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          event_date: string
          location?: string | null
          venue_name?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          price_range?: Json | null
          category: string
          organizer_id: string
          attendees_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          event_date?: string
          location?: string | null
          venue_name?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          price_range?: Json | null
          category?: string
          organizer_id?: string
          attendees_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      track_likes: {
        Row: {
          id: string
          track_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          track_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          track_id?: string
          user_id?: string
          created_at?: string
        }
      }
      user_follows: {
        Row: {
          id: string
          followee_id: string
          follower_id: string
          created_at: string
        }
        Insert: {
          id?: string
          followee_id: string
          follower_id: string
          created_at?: string
        }
        Update: {
          id?: string
          followee_id?: string
          follower_id?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          content: string
          message_type: 'text' | 'audio' | 'image'
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          content: string
          message_type?: 'text' | 'audio' | 'image'
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          content?: string
          message_type?: 'text' | 'audio' | 'image'
          read_at?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'like' | 'follow' | 'comment' | 'message' | 'track_upload'
          title: string
          message: string
          data: Json | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'like' | 'follow' | 'comment' | 'message' | 'track_upload'
          title: string
          message: string
          data?: Json | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'like' | 'follow' | 'comment' | 'message' | 'track_upload'
          title?: string
          message?: string
          data?: Json | null
          read_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_play_count: {
        Args: {
          track_id: string
        }
        Returns: void
      }
      increment_track_likes: {
        Args: {
          track_id: string
        }
        Returns: void
      }
      decrement_track_likes: {
        Args: {
          track_id: string
        }
        Returns: void
      }
      increment_follower_count: {
        Args: {
          user_id: string
        }
        Returns: void
      }
      increment_following_count: {
        Args: {
          user_id: string
        }
        Returns: void
      }
      decrement_follower_count: {
        Args: {
          user_id: string
        }
        Returns: void
      }
      decrement_following_count: {
        Args: {
          user_id: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
