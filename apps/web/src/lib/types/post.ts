// Post Types for Professional Networking Features

export interface PostAttachment {
  id: string;
  post_id: string;
  attachment_type: 'image' | 'audio';
  file_url: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  duration?: number; // for audio, in seconds
  thumbnail_url?: string;
  created_at: string;
}

export interface PostReactions {
  support: number;
  love: number;
  fire: number;
  congrats: number;
  user_reaction: 'support' | 'love' | 'fire' | 'congrats' | null;
}

export interface PostAuthor {
  id: string;
  name: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  role?: string; // professional_headline
  is_verified?: boolean;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  visibility: 'connections' | 'public';
  post_type: 'update' | 'opportunity' | 'achievement' | 'collaboration' | 'event';
  event_id?: string;
  reposted_from_id?: string; // ID of the original post if this is a repost
  image_urls?: string[]; // Multi-image support (up to 9), first also in attachments
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
  // Joined fields
  author?: PostAuthor;
  reposted_from?: Post; // Original post data if this is a repost
  attachments?: PostAttachment[];
  reactions?: PostReactions;
  comment_count?: number;
  is_connected?: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id?: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Joined fields
  author?: {
    id: string;
    name: string;
    username?: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  // Legacy field for backward compatibility
  user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  like_count?: number;
  user_liked?: boolean;
  likes_count?: number;
  replies?: PostComment[];
  is_liked?: boolean;
}

export interface CreatePostRequest {
  content: string;
  visibility?: 'connections' | 'public';
  post_type?: 'update' | 'opportunity' | 'achievement' | 'collaboration' | 'event';
  event_id?: string;
  attachments?: string[]; // Array of attachment IDs
}

