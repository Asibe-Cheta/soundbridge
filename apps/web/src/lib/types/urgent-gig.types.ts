/**
 * Urgent Gigs — TypeScript types
 * See w.md §2.1 and MOBILE_TEAM_URGENT_GIGS_SCHEMA_AND_ENDPOINTS.md
 */

export type GigStatus = 'searching' | 'confirmed' | 'completed' | 'cancelled';
export type GigResponseStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface UrgentGig {
  id: string;
  created_by: string;
  gig_type: 'urgent' | 'planned';
  title: string;
  description?: string;
  skill_required: string;
  genre: string[];
  location_lat: number;
  location_lng: number;
  location_address: string;
  location_radius_km: number;
  date_needed: string;
  duration_hours: number;
  payment_amount: number;
  payment_currency: string;
  payment_status: 'pending' | 'escrowed' | 'released' | 'refunded';
  urgent_status: GigStatus;
  selected_provider_id?: string;
  project_id?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  distance_km?: number;
  match_score?: number;
  requester?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    rating?: number;
    review_count?: number;
  };
}

export interface GigResponse {
  id: string;
  gig_id: string;
  provider_id: string;
  status: GigResponseStatus;
  response_time_seconds?: number;
  message?: string;
  notified_at: string;
  responded_at?: string;
  created_at: string;
  provider?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    headline?: string;
    rating?: number;
    review_count?: number;
    distance_km?: number;
    hourly_rate?: number;
    per_gig_rate?: number;
  };
}
