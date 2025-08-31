export interface Comment {
  id: string;
  user_id: string;
  content_id: string;
  content_type: 'track' | 'event';
  content: string;
  parent_comment_id?: string;
  likes_count: number;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  replies?: Comment[];
  is_liked?: boolean;
}

export interface Like {
  id: string;
  user_id: string;
  content_id: string;
  content_type: 'track' | 'event' | 'comment';
  created_at: string;
  // Joined fields
  user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface Share {
  id: string;
  user_id: string;
  content_id: string;
  content_type: 'track' | 'event';
  share_type: 'repost' | 'external_share';
  external_platform?: string;
  external_url?: string;
  caption?: string;
  created_at: string;
  // Joined fields
  user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  content?: {
    id: string;
    title: string;
    creator_id: string;
    creator?: {
      username: string;
      display_name: string;
    };
  };
}

export interface Bookmark {
  id: string;
  user_id: string;
  content_id: string;
  content_type: 'track' | 'event';
  created_at: string;
  // Joined fields
  content?: {
    id: string;
    title: string;
    creator_id: string;
    creator?: {
      username: string;
      display_name: string;
    };
  };
}

export interface Playlist {
  id: string;
  creator_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  cover_image_url?: string;
  tracks_count: number;
  total_duration: number; // in seconds
  followers_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  tracks?: PlaylistTrack[];
  is_following?: boolean;
}

export interface PlaylistTrack {
  id: string;
  playlist_id: string;
  track_id: string;
  position: number;
  added_at: string;
  // Joined fields
  track?: {
    id: string;
    title: string;
    duration: number;
    cover_art_url?: string;
    creator_id: string;
    creator?: {
      username: string;
      display_name: string;
    };
  };
}

export interface Collaboration {
  id: string;
  initiator_id: string;
  collaborator_id: string;
  project_title: string;
  description?: string;
  project_type: 'recording' | 'live_performance' | 'music_video' | 'remix' | 'feature' | 'production';
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
  deadline?: string;
  compensation_type?: 'fixed' | 'percentage' | 'revenue_share' | 'none';
  compensation_amount?: number;
  compensation_currency: string;
  requirements?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  initiator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  collaborator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  tracks?: CollaborationTrack[];
}

export interface CollaborationTrack {
  id: string;
  collaboration_id: string;
  track_id: string;
  created_at: string;
  // Joined fields
  track?: {
    id: string;
    title: string;
    duration: number;
    cover_art_url?: string;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'follow' | 'like' | 'comment' | 'share' | 'collaboration' | 'collaboration_request' | 'event' | 'system';
  title: string;
  message: string;
  related_id?: string;
  related_type?: string;
  action_url?: string;
  metadata?: Record<string, any>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserFeed {
  id: string;
  user_id: string;
  content_id: string;
  content_type: 'track' | 'event' | 'comment' | 'share';
  source_user_id?: string;
  feed_type: 'upload' | 'share' | 'comment' | 'follow' | 'collaboration';
  relevance_score: number;
  created_at: string;
  // Joined fields
  source_user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  content?: {
    id: string;
    title: string;
    creator_id: string;
    creator?: {
      username: string;
      display_name: string;
    };
  };
}

export interface SocialAnalytics {
  id: string;
  user_id: string;
  date: string;
  followers_gained: number;
  followers_lost: number;
  total_followers: number;
  likes_received: number;
  comments_received: number;
  shares_received: number;
  engagement_rate: number;
  created_at: string;
}

// Request/Response types
export interface CreateCommentRequest {
  content_id: string;
  content_type: 'track' | 'event';
  content: string;
  parent_comment_id?: string;
}

export interface CreateLikeRequest {
  content_id: string;
  content_type: 'track' | 'event' | 'comment';
}

export interface CreateShareRequest {
  content_id: string;
  content_type: 'track' | 'event';
  share_type: 'repost' | 'external_share';
  external_platform?: string;
  external_url?: string;
  caption?: string;
}

export interface CreateBookmarkRequest {
  content_id: string;
  content_type: 'track' | 'event';
}

export interface CreatePlaylistRequest {
  name: string;
  description?: string;
  is_public: boolean;
  cover_image_url?: string;
}

export interface AddTrackToPlaylistRequest {
  track_id: string;
  position?: number;
}

export interface CreateCollaborationRequest {
  collaborator_id: string;
  project_title: string;
  description?: string;
  project_type: 'recording' | 'live_performance' | 'music_video' | 'remix' | 'feature' | 'production';
  deadline?: string;
  compensation_type?: 'fixed' | 'percentage' | 'revenue_share' | 'none';
  compensation_amount?: number;
  compensation_currency?: string;
  requirements?: string;
}

export interface UpdateCollaborationRequest {
  status?: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
  description?: string;
  deadline?: string;
  compensation_amount?: number;
  requirements?: string;
}

// Filter types
export interface CommentFilters {
  content_id?: string;
  content_type?: 'track' | 'event';
  parent_comment_id?: string;
  user_id?: string;
  limit?: number;
  offset?: number;
}

export interface PlaylistFilters {
  creator_id?: string;
  is_public?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CollaborationFilters {
  initiator_id?: string;
  collaborator_id?: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
  project_type?: 'recording' | 'live_performance' | 'music_video' | 'remix' | 'feature' | 'production';
  limit?: number;
  offset?: number;
}

// Social stats
export interface SocialStats {
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_bookmarks: number;
  total_playlists: number;
  total_collaborations: number;
  engagement_rate: number;
  followers_count: number;
  following_count: number;
}

// Feed types
export interface FeedItem {
  id: string;
  type: 'track' | 'event' | 'comment' | 'share';
  content: any;
  source_user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  created_at: string;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  is_shared?: boolean;
}

export interface FeedFilters {
  user_id?: string;
  content_types?: ('track' | 'event' | 'comment' | 'share')[];
  limit?: number;
  offset?: number;
  before_date?: string;
}
