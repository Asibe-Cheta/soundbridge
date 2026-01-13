// External Links Type Definitions
// For portfolio links feature

export type PlatformType = 'instagram' | 'youtube' | 'spotify' | 'apple_music' | 'soundcloud' | 'website';

export interface ExternalLink {
  id: string;
  creator_id: string;
  platform_type: PlatformType;
  url: string;
  display_order: number;
  click_count: number;
  created_at: string;
  updated_at: string;
}

export interface ExternalLinkClick {
  id: string;
  external_link_id: string;
  creator_id: string;
  clicked_at: string;
  listener_id: string | null;
  device_type: string | null;
  platform: string | null;
  referrer_url: string | null;
  session_id: string | null;
}

export interface CreateExternalLinkRequest {
  platform_type: PlatformType;
  url: string;
  display_order?: number;
}

export interface UpdateExternalLinkRequest {
  url?: string;
  display_order?: number;
}

export interface TrackClickRequest {
  linkId: string;
  sessionId?: string;
  deviceType?: string;
  platform?: string;
}
