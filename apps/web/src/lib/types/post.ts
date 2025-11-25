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
  avatar_url?: string;
  role?: string; // professional_headline
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  visibility: 'connections' | 'public';
  post_type: 'update' | 'opportunity' | 'achievement' | 'collaboration' | 'event';
  event_id?: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
  // Joined fields
  author?: PostAuthor;
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
  user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
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

