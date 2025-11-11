export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type CurrencyType = 'GBP' | 'NGN' | 'USD' | 'EUR'
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed'
export type NotificationType = 'follow' | 'like' | 'comment' | 'event_invite' | 'event_reminder' | 'collaboration' | 'message' | 'system'
export type MessageStatus = 'sent' | 'delivered' | 'read'
export type UserRole = 'listener' | 'creator' | 'organizer' | 'admin'
export type ProviderBadgeTier = 'new_provider' | 'rising_star' | 'established' | 'top_rated'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          username: string | null
          full_name: string | null
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          location: string | null
          city: string | null
          country: string
          timezone: string
          genre: string | null
          verified: boolean
          role: UserRole
          followers_count: number
          following_count: number
          total_plays: number
          total_likes: number
          total_events: number
          is_public: boolean
          last_active: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id: string
          email: string
          username?: string | null
          full_name?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          location?: string | null
          city?: string | null
          country?: string
          timezone?: string
          genre?: string | null
          verified?: boolean
          role?: UserRole
          followers_count?: number
          following_count?: number
          total_plays?: number
          total_likes?: number
          total_events?: number
          is_public?: boolean
          last_active?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          username?: string | null
          full_name?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          location?: string | null
          city?: string | null
          country?: string
          timezone?: string
          genre?: string | null
          verified?: boolean
          role?: UserRole
          followers_count?: number
          following_count?: number
          total_plays?: number
          total_likes?: number
          total_events?: number
          is_public?: boolean
          last_active?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      audio_tracks: {
        Row: {
          id: string
          creator_id: string
          title: string
          description: string | null
          genre: string
          sub_genre: string | null
          duration: number
          file_url: string
          artwork_url: string | null
          waveform_url: string | null
          play_count: number
          like_count: number
          share_count: number
          comment_count: number
          download_count: number
          is_public: boolean
          is_explicit: boolean
          is_featured: boolean
          tags: string[] | null
          metadata: Json | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          creator_id: string
          title: string
          description?: string | null
          genre: string
          sub_genre?: string | null
          duration: number
          file_url: string
          artwork_url?: string | null
          waveform_url?: string | null
          play_count?: number
          like_count?: number
          share_count?: number
          comment_count?: number
          download_count?: number
          is_public?: boolean
          is_explicit?: boolean
          is_featured?: boolean
          tags?: string[] | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string
          description?: string | null
          genre?: string
          sub_genre?: string | null
          duration?: number
          file_url?: string
          artwork_url?: string | null
          waveform_url?: string | null
          play_count?: number
          like_count?: number
          share_count?: number
          comment_count?: number
          download_count?: number
          is_public?: boolean
          is_explicit?: boolean
          is_featured?: boolean
          tags?: string[] | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      events: {
        Row: {
          id: string
          organizer_id: string
          title: string
          description: string | null
          category: string
          sub_category: string | null
          event_date: string
          start_time: string
          end_time: string | null
          timezone: string
          venue: string
          venue_address: string | null
          city: string
          country: string
          postal_code: string | null
          latitude: number | null
          longitude: number | null
          capacity: number
          ticket_price: number | null
          currency: CurrencyType
          is_free: boolean
          attendees_count: number
          max_attendees: number | null
          status: EventStatus
          is_public: boolean
          is_featured: boolean
          tags: string[] | null
          metadata: Json | null
          like_count: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organizer_id: string
          title: string
          description?: string | null
          category: string
          sub_category?: string | null
          event_date: string
          start_time: string
          end_time?: string | null
          timezone?: string
          venue: string
          venue_address?: string | null
          city: string
          country?: string
          postal_code?: string | null
          latitude?: number | null
          longitude?: number | null
          capacity: number
          ticket_price?: number | null
          currency?: CurrencyType
          is_free?: boolean
          attendees_count?: number
          max_attendees?: number | null
          status?: EventStatus
          is_public?: boolean
          is_featured?: boolean
          tags?: string[] | null
          metadata?: Json | null
          like_count?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organizer_id?: string
          title?: string
          description?: string | null
          category?: string
          sub_category?: string | null
          event_date?: string
          start_time?: string
          end_time?: string | null
          timezone?: string
          venue?: string
          venue_address?: string | null
          city?: string
          country?: string
          postal_code?: string | null
          latitude?: number | null
          longitude?: number | null
          capacity?: number
          ticket_price?: number | null
          currency?: CurrencyType
          is_free?: boolean
          attendees_count?: number
          max_attendees?: number | null
          status?: EventStatus
          is_public?: boolean
          is_featured?: boolean
          tags?: string[] | null
          metadata?: Json | null
          like_count?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          subject: string | null
          content: string
          message_type: string
          status: MessageStatus
          is_read: boolean
          read_at: string | null
          parent_message_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          subject?: string | null
          content: string
          message_type?: string
          status?: MessageStatus
          is_read?: boolean
          read_at?: string | null
          parent_message_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          subject?: string | null
          content?: string
          message_type?: string
          status?: MessageStatus
          is_read?: boolean
          read_at?: string | null
          parent_message_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      event_attendees: {
        Row: {
          id: string
          event_id: string
          attendee_id: string
          status: string
          ticket_type: string | null
          ticket_price: number | null
          currency: CurrencyType
          payment_status: string
          payment_method: string | null
          transaction_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          attendee_id: string
          status?: string
          ticket_type?: string | null
          ticket_price?: number | null
          currency?: CurrencyType
          payment_status?: string
          payment_method?: string | null
          transaction_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          attendee_id?: string
          status?: string
          ticket_type?: string | null
          ticket_price?: number | null
          currency?: CurrencyType
          payment_status?: string
          payment_method?: string | null
          transaction_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          title: string
          message: string
          related_id: string | null
          related_type: string | null
          is_read: boolean
          read_at: string | null
          action_url: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: NotificationType
          title: string
          message: string
          related_id?: string | null
          related_type?: string | null
          is_read?: boolean
          read_at?: string | null
          action_url?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: NotificationType
          title?: string
          message?: string
          related_id?: string | null
          related_type?: string | null
          is_read?: boolean
          read_at?: string | null
          action_url?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      playlists: {
        Row: {
          id: string
          creator_id: string
          name: string
          description: string | null
          artwork_url: string | null
          is_public: boolean
          is_featured: boolean
          track_count: number
          total_duration: number
          follower_count: number
          play_count: number
          like_count: number
          tags: string[] | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          creator_id: string
          name: string
          description?: string | null
          artwork_url?: string | null
          is_public?: boolean
          is_featured?: boolean
          track_count?: number
          total_duration?: number
          follower_count?: number
          play_count?: number
          like_count?: number
          tags?: string[] | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          creator_id?: string
          name?: string
          description?: string | null
          artwork_url?: string | null
          is_public?: boolean
          is_featured?: boolean
          track_count?: number
          total_duration?: number
          follower_count?: number
          play_count?: number
          like_count?: number
          tags?: string[] | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      playlist_tracks: {
        Row: {
          id: string
          playlist_id: string
          track_id: string
          position: number
          added_by: string | null
          added_at: string
        }
        Insert: {
          id?: string
          playlist_id: string
          track_id: string
          position: number
          added_by?: string | null
          added_at?: string
        }
        Update: {
          id?: string
          playlist_id?: string
          track_id?: string
          position?: number
          added_by?: string | null
          added_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          email_notifications: boolean
          push_notifications: boolean
          sms_notifications: boolean
          event_reminders: boolean
          event_invites: boolean
          event_updates: boolean
          event_cancellations: boolean
          new_followers: boolean
          likes_on_content: boolean
          comments_on_content: boolean
          mentions: boolean
          auto_play: boolean
          crossfade_duration: number
          audio_quality: string
          download_quality: string
          show_online_status: boolean
          show_listening_activity: boolean
          allow_messages_from: string
          location_radius: number
          preferred_locations: string[] | null
          preferred_currency: CurrencyType
          language: string
          theme: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_notifications?: boolean
          push_notifications?: boolean
          sms_notifications?: boolean
          event_reminders?: boolean
          event_invites?: boolean
          event_updates?: boolean
          event_cancellations?: boolean
          new_followers?: boolean
          likes_on_content?: boolean
          comments_on_content?: boolean
          mentions?: boolean
          auto_play?: boolean
          crossfade_duration?: number
          audio_quality?: string
          download_quality?: string
          show_online_status?: boolean
          show_listening_activity?: boolean
          allow_messages_from?: string
          location_radius?: number
          preferred_locations?: string[] | null
          preferred_currency?: CurrencyType
          language?: string
          theme?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_notifications?: boolean
          push_notifications?: boolean
          sms_notifications?: boolean
          event_reminders?: boolean
          event_invites?: boolean
          event_updates?: boolean
          event_cancellations?: boolean
          new_followers?: boolean
          likes_on_content?: boolean
          comments_on_content?: boolean
          mentions?: boolean
          auto_play?: boolean
          crossfade_duration?: number
          audio_quality?: string
          download_quality?: string
          show_online_status?: boolean
          show_listening_activity?: boolean
          allow_messages_from?: string
          location_radius?: number
          preferred_locations?: string[] | null
          preferred_currency?: CurrencyType
          language?: string
          theme?: string
          created_at?: string
          updated_at?: string
        }
      }
      creator_type_lookup: {
        Row: {
          id: string
          label: string
          description: string | null
          is_active: boolean | null
          created_at: string
        }
        Insert: {
          id: string
          label: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          label?: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string
        }
      }
      service_category_lookup: {
        Row: {
          id: string
          label: string
          description: string | null
          is_active: boolean | null
          created_at: string
        }
        Insert: {
          id: string
          label: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          label?: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string
        }
      }
      user_creator_types: {
        Row: {
          user_id: string
          creator_type: string
          created_at: string
        }
        Insert: {
          user_id: string
          creator_type: string
          created_at?: string
        }
        Update: {
          user_id?: string
          creator_type?: string
          created_at?: string
        }
      }
      service_provider_profiles: {
        Row: {
          user_id: string
          display_name: string
          headline: string | null
          bio: string | null
          categories: string[]
          default_rate: number | null
          rate_currency: string | null
          status: 'draft' | 'pending_review' | 'active' | 'suspended'
          is_verified: boolean
          verification_status: 'not_requested' | 'pending' | 'approved' | 'rejected'
          verification_requested_at: string | null
          verification_reviewed_at: string | null
          verification_reviewer_id: string | null
          verification_notes: string | null
          id_verified: boolean
          id_verified_at: string | null
          average_rating: number
          review_count: number
          badge_tier: ProviderBadgeTier
          badge_updated_at: string
          completed_booking_count: number
          show_payment_protection: boolean
          first_booking_discount_enabled: boolean
          first_booking_discount_percent: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          display_name: string
          headline?: string | null
          bio?: string | null
          categories?: string[]
          default_rate?: number | null
          rate_currency?: string | null
          status?: 'draft' | 'pending_review' | 'active' | 'suspended'
          is_verified?: boolean
          verification_status?: 'not_requested' | 'pending' | 'approved' | 'rejected'
          verification_requested_at?: string | null
          verification_reviewed_at?: string | null
          verification_reviewer_id?: string | null
          verification_notes?: string | null
          id_verified?: boolean
          id_verified_at?: string | null
          average_rating?: number
          review_count?: number
          badge_tier?: ProviderBadgeTier
          badge_updated_at?: string
          completed_booking_count?: number
          show_payment_protection?: boolean
          first_booking_discount_enabled?: boolean
          first_booking_discount_percent?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          display_name?: string
          headline?: string | null
          bio?: string | null
          categories?: string[]
          default_rate?: number | null
          rate_currency?: string | null
          status?: 'draft' | 'pending_review' | 'active' | 'suspended'
          is_verified?: boolean
          verification_status?: 'not_requested' | 'pending' | 'approved' | 'rejected'
          verification_requested_at?: string | null
          verification_reviewed_at?: string | null
          verification_reviewer_id?: string | null
          verification_notes?: string | null
          id_verified?: boolean
          id_verified_at?: string | null
          average_rating?: number
          review_count?: number
          badge_tier?: ProviderBadgeTier
          badge_updated_at?: string
          completed_booking_count?: number
          show_payment_protection?: boolean
          first_booking_discount_enabled?: boolean
          first_booking_discount_percent?: number
          created_at?: string
          updated_at?: string
        }
      }
      provider_badge_history: {
        Row: {
          id: string
          provider_id: string
          previous_tier: ProviderBadgeTier | null
          new_tier: ProviderBadgeTier
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          previous_tier?: ProviderBadgeTier | null
          new_tier: ProviderBadgeTier
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          previous_tier?: ProviderBadgeTier | null
          new_tier?: ProviderBadgeTier
          reason?: string | null
          created_at?: string
        }
      }
      service_offerings: {
        Row: {
          id: string
          provider_id: string
          title: string
          category: string
          description: string | null
          rate_amount: number | null
          rate_currency: string | null
          rate_unit: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          title: string
          category: string
          description?: string | null
          rate_amount?: number | null
          rate_currency?: string | null
          rate_unit?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          title?: string
          category?: string
          description?: string | null
          rate_amount?: number | null
          rate_currency?: string | null
          rate_unit?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      service_portfolio_items: {
        Row: {
          id: string
          provider_id: string
          media_url: string
          thumbnail_url: string | null
          caption: string | null
          display_order: number | null
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          media_url: string
          thumbnail_url?: string | null
          caption?: string | null
          display_order?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          media_url?: string
          thumbnail_url?: string | null
          caption?: string | null
          display_order?: number | null
          created_at?: string
        }
      }
      service_provider_availability: {
        Row: {
          id: string
          provider_id: string
          start_time: string
          end_time: string
          is_recurring: boolean
          recurrence_rule: string | null
          is_bookable: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          start_time: string
          end_time: string
          is_recurring?: boolean
          recurrence_rule?: string | null
          is_bookable?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          start_time?: string
          end_time?: string
          is_recurring?: boolean
          recurrence_rule?: string | null
          is_bookable?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      service_bookings: {
        Row: {
          id: string
          provider_id: string
          booker_id: string
          service_offering_id: string | null
          venue_id: string | null
          status: 'pending' | 'confirmed_awaiting_payment' | 'paid' | 'completed' | 'cancelled' | 'disputed'
          scheduled_start: string
          scheduled_end: string
          timezone: string
          total_amount: number
          currency: string
          platform_fee: number
          provider_payout: number
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          booking_notes: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          paid_at: string | null
          completed_at: string | null
          disputed_at: string | null
          dispute_reason: string | null
          auto_release_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          booker_id: string
          service_offering_id?: string | null
          venue_id?: string | null
          status?: 'pending' | 'confirmed_awaiting_payment' | 'paid' | 'completed' | 'cancelled' | 'disputed'
          scheduled_start: string
          scheduled_end: string
          timezone?: string
          total_amount: number
          currency?: string
          platform_fee?: number
          provider_payout?: number
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          booking_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          paid_at?: string | null
          completed_at?: string | null
          disputed_at?: string | null
          dispute_reason?: string | null
          auto_release_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          booker_id?: string
          service_offering_id?: string | null
          venue_id?: string | null
          status?: 'pending' | 'confirmed_awaiting_payment' | 'paid' | 'completed' | 'cancelled' | 'disputed'
          scheduled_start?: string
          scheduled_end?: string
          timezone?: string
          total_amount?: number
          currency?: string
          platform_fee?: number
          provider_payout?: number
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          booking_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          paid_at?: string | null
          completed_at?: string | null
          disputed_at?: string | null
          dispute_reason?: string | null
          auto_release_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      booking_activity: {
        Row: {
          id: string
          booking_id: string
          actor_id: string | null
          action: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          actor_id?: string | null
          action: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          actor_id?: string | null
          action?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      booking_ledger: {
        Row: {
          id: string
          booking_id: string
          entry_type: string
          amount: number
          currency: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          entry_type: string
          amount: number
          currency: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          entry_type?: string
          amount?: number
          currency?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      provider_connect_accounts: {
        Row: {
          provider_id: string
          stripe_account_id: string
          charges_enabled: boolean
          payouts_enabled: boolean
          details_submitted: boolean
          requirements: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          provider_id: string
          stripe_account_id: string
          charges_enabled?: boolean
          payouts_enabled?: boolean
          details_submitted?: boolean
          requirements?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          provider_id?: string
          stripe_account_id?: string
          charges_enabled?: boolean
          payouts_enabled?: boolean
          details_submitted?: boolean
          requirements?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      service_provider_verification_requests: {
        Row: {
          id: string
          provider_id: string
          status: 'pending' | 'approved' | 'rejected' | 'cancelled'
          submitted_at: string
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_notes: string | null
          provider_notes: string | null
          automated_checks: Json | null
          bookings_completed: number | null
          average_rating: number | null
          portfolio_items: number | null
          profile_completeness: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
          submitted_at?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          provider_notes?: string | null
          automated_checks?: Json | null
          bookings_completed?: number | null
          average_rating?: number | null
          portfolio_items?: number | null
          profile_completeness?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
          submitted_at?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          provider_notes?: string | null
          automated_checks?: Json | null
          bookings_completed?: number | null
          average_rating?: number | null
          portfolio_items?: number | null
          profile_completeness?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      service_provider_verification_documents: {
        Row: {
          id: string
          request_id: string
          doc_type: string
          storage_path: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          doc_type: string
          storage_path: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          doc_type?: string
          storage_path?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      service_reviews: {
        Row: {
          id: string
          provider_id: string
          reviewer_id: string
          rating: number
          title: string | null
          comment: string | null
          booking_reference: string | null
          status: 'pending' | 'published' | 'flagged' | 'removed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          reviewer_id: string
          rating: number
          title?: string | null
          comment?: string | null
          booking_reference?: string | null
          status?: 'pending' | 'published' | 'flagged' | 'removed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          reviewer_id?: string
          rating?: number
          title?: string | null
          comment?: string | null
          booking_reference?: string | null
          status?: 'pending' | 'published' | 'flagged' | 'removed'
          created_at?: string
          updated_at?: string
        }
      }
      venues: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          address: Json | null
          capacity: number | null
          amenities: string[] | null
          primary_contact: Json | null
          status: 'draft' | 'pending_review' | 'active' | 'archived'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          address?: Json | null
          capacity?: number | null
          amenities?: string[] | null
          primary_contact?: Json | null
          status?: 'draft' | 'pending_review' | 'active' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          address?: Json | null
          capacity?: number | null
          amenities?: string[] | null
          primary_contact?: Json | null
          status?: 'draft' | 'pending_review' | 'active' | 'archived'
          created_at?: string
          updated_at?: string
        }
      }
      likes: {
        Row: {
          id: string
          user_id: string
          content_id: string
          content_type: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_id: string
          content_type: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content_id?: string
          content_type?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          user_id: string
          content_id: string
          content_type: string
          content: string
          parent_comment_id: string | null
          like_count: number
          is_edited: boolean
          edited_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          content_id: string
          content_type: string
          content: string
          parent_comment_id?: string | null
          like_count?: number
          is_edited?: boolean
          edited_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          content_id?: string
          content_type?: string
          content?: string
          parent_comment_id?: string | null
          like_count?: number
          is_edited?: boolean
          edited_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      analytics: {
        Row: {
          id: string
          user_id: string
          date: string
          play_count: number
          unique_listeners: number
          follower_count: number
          following_count: number
          event_attendance: number
          revenue: number
          engagement_rate: number
          peak_listening_hours: Json | null
          top_countries: Json | null
          age_demographics: Json | null
          device_analytics: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          play_count?: number
          unique_listeners?: number
          follower_count?: number
          following_count?: number
          event_attendance?: number
          revenue?: number
          engagement_rate?: number
          peak_listening_hours?: Json | null
          top_countries?: Json | null
          age_demographics?: Json | null
          device_analytics?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          play_count?: number
          unique_listeners?: number
          follower_count?: number
          following_count?: number
          event_attendance?: number
          revenue?: number
          engagement_rate?: number
          peak_listening_hours?: Json | null
          top_countries?: Json | null
          age_demographics?: Json | null
          device_analytics?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      public_profiles: {
        Row: {
          id: string
          username: string | null
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          location: string | null
          city: string | null
          country: string
          genre: string | null
          verified: boolean
          role: UserRole
          followers_count: number
          following_count: number
          total_plays: number
          total_likes: number
          total_events: number
          last_active: string
          created_at: string
        }
      }
      trending_tracks: {
        Row: {
          id: string
          creator_id: string
          title: string
          description: string | null
          genre: string
          sub_genre: string | null
          duration: number
          file_url: string
          artwork_url: string | null
          waveform_url: string | null
          play_count: number
          like_count: number
          share_count: number
          comment_count: number
          download_count: number
          is_public: boolean
          is_explicit: boolean
          is_featured: boolean
          tags: string[] | null
          metadata: Json | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          username: string | null
          display_name: string | null
          avatar_url: string | null
        }
      }
      upcoming_events: {
        Row: {
          id: string
          organizer_id: string
          title: string
          description: string | null
          category: string
          sub_category: string | null
          event_date: string
          start_time: string
          end_time: string | null
          timezone: string
          venue: string
          venue_address: string | null
          city: string
          country: string
          postal_code: string | null
          latitude: number | null
          longitude: number | null
          capacity: number
          ticket_price: number | null
          currency: CurrencyType
          is_free: boolean
          attendees_count: number
          max_attendees: number | null
          status: EventStatus
          is_public: boolean
          is_featured: boolean
          tags: string[] | null
          metadata: Json | null
          like_count: number
          created_at: string
          updated_at: string
          deleted_at: string | null
          username: string | null
          display_name: string | null
          avatar_url: string | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Type helpers for better developer experience
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type AudioTrack = Database['public']['Tables']['audio_tracks']['Row']
export type AudioTrackInsert = Database['public']['Tables']['audio_tracks']['Insert']
export type AudioTrackUpdate = Database['public']['Tables']['audio_tracks']['Update']

export type Event = Database['public']['Tables']['events']['Row']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type EventUpdate = Database['public']['Tables']['events']['Update']

export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type MessageUpdate = Database['public']['Tables']['messages']['Update']

export type Follow = Database['public']['Tables']['follows']['Row']
export type FollowInsert = Database['public']['Tables']['follows']['Insert']
export type FollowUpdate = Database['public']['Tables']['follows']['Update']

export type EventAttendee = Database['public']['Tables']['event_attendees']['Row']
export type EventAttendeeInsert = Database['public']['Tables']['event_attendees']['Insert']
export type EventAttendeeUpdate = Database['public']['Tables']['event_attendees']['Update']

export type Notification = Database['public']['Tables']['notifications']['Row']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update']

export type Playlist = Database['public']['Tables']['playlists']['Row']
export type PlaylistInsert = Database['public']['Tables']['playlists']['Insert']
export type PlaylistUpdate = Database['public']['Tables']['playlists']['Update']

export type PlaylistTrack = Database['public']['Tables']['playlist_tracks']['Row']
export type PlaylistTrackInsert = Database['public']['Tables']['playlist_tracks']['Insert']
export type PlaylistTrackUpdate = Database['public']['Tables']['playlist_tracks']['Update']

export type UserPreference = Database['public']['Tables']['user_preferences']['Row']
export type UserPreferenceInsert = Database['public']['Tables']['user_preferences']['Insert']
export type UserPreferenceUpdate = Database['public']['Tables']['user_preferences']['Update']

export type CreatorTypeLookup = Database['public']['Tables']['creator_type_lookup']['Row']
export type ServiceCategoryLookup = Database['public']['Tables']['service_category_lookup']['Row']
export type UserCreatorType = Database['public']['Tables']['user_creator_types']['Row']
export type UserCreatorTypeInsert = Database['public']['Tables']['user_creator_types']['Insert']
export type UserCreatorTypeUpdate = Database['public']['Tables']['user_creator_types']['Update']

export type ServiceProviderProfileTable = Database['public']['Tables']['service_provider_profiles']['Row']
export type ServiceProviderProfileInsert = Database['public']['Tables']['service_provider_profiles']['Insert']
export type ServiceProviderProfileUpdate = Database['public']['Tables']['service_provider_profiles']['Update']

export type ServiceOfferingTable = Database['public']['Tables']['service_offerings']['Row']
export type ServiceOfferingInsert = Database['public']['Tables']['service_offerings']['Insert']
export type ServiceOfferingUpdate = Database['public']['Tables']['service_offerings']['Update']

export type ServicePortfolioItemTable = Database['public']['Tables']['service_portfolio_items']['Row']
export type ServicePortfolioItemInsert = Database['public']['Tables']['service_portfolio_items']['Insert']
export type ServicePortfolioItemUpdate = Database['public']['Tables']['service_portfolio_items']['Update']

export type ServiceProviderAvailabilityTable = Database['public']['Tables']['service_provider_availability']['Row']
export type ServiceProviderAvailabilityInsert = Database['public']['Tables']['service_provider_availability']['Insert']
export type ServiceProviderAvailabilityUpdate = Database['public']['Tables']['service_provider_availability']['Update']

export type ServiceBookingTable = Database['public']['Tables']['service_bookings']['Row']
export type ServiceBookingInsert = Database['public']['Tables']['service_bookings']['Insert']
export type ServiceBookingUpdate = Database['public']['Tables']['service_bookings']['Update']

export type BookingActivityTable = Database['public']['Tables']['booking_activity']['Row']
export type BookingActivityInsert = Database['public']['Tables']['booking_activity']['Insert']
export type BookingActivityUpdate = Database['public']['Tables']['booking_activity']['Update']

export type BookingLedgerTable = Database['public']['Tables']['booking_ledger']['Row']
export type BookingLedgerInsert = Database['public']['Tables']['booking_ledger']['Insert']
export type BookingLedgerUpdate = Database['public']['Tables']['booking_ledger']['Update']

export type ProviderConnectAccountTable = Database['public']['Tables']['provider_connect_accounts']['Row']
export type ProviderConnectAccountInsert = Database['public']['Tables']['provider_connect_accounts']['Insert']
export type ProviderConnectAccountUpdate = Database['public']['Tables']['provider_connect_accounts']['Update']

export type ServiceProviderVerificationRequestTable = Database['public']['Tables']['service_provider_verification_requests']['Row']
export type ServiceProviderVerificationRequestInsert = Database['public']['Tables']['service_provider_verification_requests']['Insert']
export type ServiceProviderVerificationRequestUpdate = Database['public']['Tables']['service_provider_verification_requests']['Update']

export type ServiceProviderVerificationDocumentTable = Database['public']['Tables']['service_provider_verification_documents']['Row']
export type ServiceProviderVerificationDocumentInsert = Database['public']['Tables']['service_provider_verification_documents']['Insert']
export type ServiceProviderVerificationDocumentUpdate = Database['public']['Tables']['service_provider_verification_documents']['Update']

export type ProviderBadgeHistoryTable = Database['public']['Tables']['provider_badge_history']['Row']
export type ProviderBadgeHistoryInsert = Database['public']['Tables']['provider_badge_history']['Insert']
export type ProviderBadgeHistoryUpdate = Database['public']['Tables']['provider_badge_history']['Update']

export type ServiceReviewTable = Database['public']['Tables']['service_reviews']['Row']
export type ServiceReviewInsert = Database['public']['Tables']['service_reviews']['Insert']
export type ServiceReviewUpdate = Database['public']['Tables']['service_reviews']['Update']

export type Venue = Database['public']['Tables']['venues']['Row']
export type VenueInsert = Database['public']['Tables']['venues']['Insert']
export type VenueUpdate = Database['public']['Tables']['venues']['Update']

export type CreatorType =
  | 'musician'
  | 'podcaster'
  | 'dj'
  | 'event_organizer'
  | 'service_provider'
  | 'venue_owner'

export type ServiceCategory =
  | 'sound_engineering'
  | 'music_lessons'
  | 'mixing_mastering'
  | 'session_musician'
  | 'photography'
  | 'videography'
  | 'lighting'
  | 'event_management'
  | 'other'

export type Like = Database['public']['Tables']['likes']['Row']
export type LikeInsert = Database['public']['Tables']['likes']['Insert']
export type LikeUpdate = Database['public']['Tables']['likes']['Update']

export type Comment = Database['public']['Tables']['comments']['Row']
export type CommentInsert = Database['public']['Tables']['comments']['Insert']
export type CommentUpdate = Database['public']['Tables']['comments']['Update']

export type Analytics = Database['public']['Tables']['analytics']['Row']
export type AnalyticsInsert = Database['public']['Tables']['analytics']['Insert']
export type AnalyticsUpdate = Database['public']['Tables']['analytics']['Update']

// View types
export type PublicProfile = Database['public']['Views']['public_profiles']['Row']
export type TrendingTrack = Database['public']['Views']['trending_tracks']['Row']
export type UpcomingEvent = Database['public']['Views']['upcoming_events']['Row'] 