export interface CreatorAvailability {
  id: string;
  creator_id: string;
  start_date: string;
  end_date: string;
  is_available: boolean;
  max_requests_per_slot: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CollaborationRequest {
  id: string;
  requester_id: string;
  creator_id: string;
  availability_id: string;
  proposed_start_date: string;
  proposed_end_date: string;
  subject: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  updated_at: string;
  requester?: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string;
  };
  creator?: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string;
  };
}

export interface AvailabilitySlot {
  id: string;
  start_date: string;
  end_date: string;
  is_available: boolean;
  request_count: number;
  max_requests: number;
  notes?: string;
}

export interface AvailabilitySettings {
  collaboration_enabled: boolean;
  auto_decline_unavailable: boolean;
  min_notice_days: number;
}

export interface CreateAvailabilityData {
  start_date: string;
  end_date: string;
  is_available: boolean;
  max_requests_per_slot?: number;
  notes?: string;
}

export interface CreateCollaborationRequestData {
  creator_id: string;
  availability_id: string;
  proposed_start_date: string;
  proposed_end_date: string;
  subject: string;
  message: string;
}
