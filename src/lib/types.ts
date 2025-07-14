export interface User {
  id: string;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  user_type: 'listener' | 'creator' | 'organizer';
  created_at: string;
}

export interface AudioContent {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  file_url: string;
  duration?: number;
  genre?: string;
  play_count: number;
  created_at: string;
  creator?: User;
}

export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  description?: string;
  category: string;
  venue_name?: string;
  city?: string;
  country?: string;
  event_date: string;
  price_range?: {
    min: number;
    max: number;
    currency: string;
  };
  created_at: string;
  organizer?: User;
}

export interface CardProps {
  title: string;
  subtitle?: string;
  image?: string;
  type: 'music' | 'creator' | 'event' | 'podcast';
  onClick?: () => void;
  data?: AudioContent | Event | User;
}

export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
} 