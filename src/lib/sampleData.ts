import { Track, UserProfile, Event } from './api';

// Sample data for development and testing
export const sampleTracks: Track[] = [
  {
    id: '1',
    title: 'Midnight Vibes',
    description: 'A chill lo-fi track perfect for late night listening',
    audio_url: 'https://www.soundjay.com/misc/sounds-001.mp3', // Sample audio URL
    cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    duration: 180000, // 3 minutes in milliseconds
    plays_count: 15420,
    likes_count: 892,
    genre: 'Lo-Fi',
    tags: ['chill', 'lo-fi', 'midnight'],
    is_public: true,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    creator_id: 'user-1',
    creator: {
      id: 'user-1',
      username: 'lofi_king',
      display_name: 'Lo-Fi King',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'
    }
  },
  {
    id: '2',
    title: 'Sunrise Melody',
    description: 'Uplifting indie track to start your day',
    audio_url: 'https://www.soundjay.com/misc/sounds-002.mp3',
    cover_image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
    duration: 240000, // 4 minutes
    plays_count: 8934,
    likes_count: 567,
    genre: 'Indie',
    tags: ['indie', 'uplifting', 'morning'],
    is_public: true,
    created_at: '2024-01-14T08:15:00Z',
    updated_at: '2024-01-14T08:15:00Z',
    creator_id: 'user-2',
    creator: {
      id: 'user-2',
      username: 'indie_sarah',
      display_name: 'Sarah Indie',
      avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b788?w=200'
    }
  },
  {
    id: '3',
    title: 'Electric Dreams',
    description: 'Synthwave track with retro 80s vibes',
    audio_url: 'https://www.soundjay.com/misc/sounds-003.mp3',
    cover_image_url: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400',
    duration: 300000, // 5 minutes
    plays_count: 23567,
    likes_count: 1234,
    genre: 'Synthwave',
    tags: ['synthwave', '80s', 'electronic'],
    is_public: true,
    created_at: '2024-01-13T16:45:00Z',
    updated_at: '2024-01-13T16:45:00Z',
    creator_id: 'user-3',
    creator: {
      id: 'user-3',
      username: 'synth_master',
      display_name: 'Synth Master',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'
    }
  },
  {
    id: '4',
    title: 'Jazz Nights',
    description: 'Smooth jazz for evening relaxation',
    audio_url: 'https://www.soundjay.com/misc/sounds-004.mp3',
    cover_image_url: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400',
    duration: 420000, // 7 minutes
    plays_count: 12890,
    likes_count: 789,
    genre: 'Jazz',
    tags: ['jazz', 'smooth', 'evening'],
    is_public: true,
    created_at: '2024-01-12T20:00:00Z',
    updated_at: '2024-01-12T20:00:00Z',
    creator_id: 'user-4',
    creator: {
      id: 'user-4',
      username: 'jazz_elena',
      display_name: 'Elena Jazz',
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200'
    }
  },
  {
    id: '5',
    title: 'Hip Hop Heat',
    description: 'Fire hip hop beat with heavy bass',
    audio_url: 'https://www.soundjay.com/misc/sounds-005.mp3',
    cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    duration: 195000, // 3.25 minutes
    plays_count: 34567,
    likes_count: 2345,
    genre: 'Hip Hop',
    tags: ['hip hop', 'rap', 'bass'],
    is_public: true,
    created_at: '2024-01-11T14:30:00Z',
    updated_at: '2024-01-11T14:30:00Z',
    creator_id: 'user-5',
    creator: {
      id: 'user-5',
      username: 'mc_fresh',
      display_name: 'MC Fresh',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200'
    }
  }
];

export const sampleCreators: UserProfile[] = [
  {
    id: 'user-1',
    username: 'lofi_king',
    display_name: 'Lo-Fi King',
    bio: 'Creating chill beats for late night vibes 🌙',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
    cover_image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
    user_type: 'creator',
    location: 'London, UK',
    website: 'https://lofiking.com',
    social_links: {
      instagram: '@lofi_king',
      twitter: '@lofiking',
      spotify: 'lofiking'
    },
    followers_count: 25400,
    following_count: 892,
    tracks_count: 47,
    verified: true,
    created_at: '2023-08-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  },
  {
    id: 'user-2',
    username: 'indie_sarah',
    display_name: 'Sarah Indie',
    bio: 'Indie artist spreading good vibes ✨',
    avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b788?w=200',
    cover_image_url: 'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=800',
    user_type: 'artist',
    location: 'Manchester, UK',
    website: 'https://sarahindie.co.uk',
    social_links: {
      instagram: '@indie_sarah',
      youtube: 'sarah-indie'
    },
    followers_count: 18700,
    following_count: 1234,
    tracks_count: 23,
    verified: true,
    created_at: '2023-07-20T14:20:00Z',
    updated_at: '2024-01-14T08:15:00Z'
  },
  {
    id: 'user-3',
    username: 'synth_master',
    display_name: 'Synth Master',
    bio: 'Retro-futuristic soundscapes and synthwave magic 🎹',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    cover_image_url: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=800',
    user_type: 'producer',
    location: 'Birmingham, UK',
    website: 'https://synthmaster.net',
    social_links: {
      bandcamp: 'synthmaster',
      soundcloud: 'synth-master'
    },
    followers_count: 32100,
    following_count: 567,
    tracks_count: 65,
    verified: true,
    created_at: '2023-06-10T09:45:00Z',
    updated_at: '2024-01-13T16:45:00Z'
  },
  {
    id: 'user-4',
    username: 'jazz_elena',
    display_name: 'Elena Jazz',
    bio: 'Smooth jazz for the soul 🎷',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
    cover_image_url: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800',
    user_type: 'artist',
    location: 'Liverpool, UK',
    website: 'https://elenajazz.com',
    social_links: {
      spotify: 'elena-jazz',
      instagram: '@jazz_elena'
    },
    followers_count: 15600,
    following_count: 892,
    tracks_count: 34,
    verified: false,
    created_at: '2023-09-05T18:30:00Z',
    updated_at: '2024-01-12T20:00:00Z'
  },
  {
    id: 'user-5',
    username: 'mc_fresh',
    display_name: 'MC Fresh',
    bio: 'Bringing the heat with fresh beats 🔥',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
    cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    user_type: 'artist',
    location: 'Leeds, UK',
    website: 'https://mcfresh.uk',
    social_links: {
      youtube: 'mc-fresh',
      instagram: '@mc_fresh',
      tiktok: '@mcfresh'
    },
    followers_count: 45200,
    following_count: 1567,
    tracks_count: 89,
    verified: true,
    created_at: '2023-05-12T11:15:00Z',
    updated_at: '2024-01-11T14:30:00Z'
  }
];

export const sampleEvents: Event[] = [
  {
    id: 'event-1',
    title: 'SoundBridge Live Festival',
    description: 'The biggest music festival featuring emerging artists from across the UK',
    event_date: '2024-07-15T18:00:00Z',
    location: 'Victoria Park, London',
    venue_name: 'Victoria Park',
    city: 'London',
    country: 'UK',
    cover_image_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
    price_range: {
      min: 45,
      max: 120,
      currency: 'GBP'
    },
    category: 'Festival',
    organizer_id: 'user-1',
    organizer: {
      id: 'user-1',
      username: 'soundbridge_official',
      display_name: 'SoundBridge Events',
      avatar_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=200'
    },
    attendees_count: 2340,
    created_at: '2024-01-10T12:00:00Z'
  },
  {
    id: 'event-2',
    title: 'Indie Night Manchester',
    description: 'Local indie artists showcase their latest tracks',
    event_date: '2024-03-22T20:00:00Z',
    location: 'The Deaf Institute, Manchester',
    venue_name: 'The Deaf Institute',
    city: 'Manchester',
    country: 'UK',
    cover_image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
    price_range: {
      min: 12,
      max: 18,
      currency: 'GBP'
    },
    category: 'Concert',
    organizer_id: 'user-2',
    organizer: {
      id: 'user-2',
      username: 'indie_collective',
      display_name: 'Indie Collective',
      avatar_url: 'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=200'
    },
    attendees_count: 156,
    created_at: '2024-01-08T15:30:00Z'
  },
  {
    id: 'event-3',
    title: 'Electronic Underground',
    description: 'Deep electronic music in an intimate setting',
    event_date: '2024-04-10T23:00:00Z',
    location: 'Warehouse 23, Birmingham',
    venue_name: 'Warehouse 23',
    city: 'Birmingham',
    country: 'UK',
    cover_image_url: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=800',
    price_range: {
      min: 20,
      max: 25,
      currency: 'GBP'
    },
    category: 'Club Night',
    organizer_id: 'user-3',
    organizer: {
      id: 'user-3',
      username: 'underground_collective',
      display_name: 'Underground Collective',
      avatar_url: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=200'
    },
    attendees_count: 89,
    created_at: '2024-01-05T19:45:00Z'
  }
];

// Development helper to simulate API delays
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API responses for development
export const mockApiService = {
  async getHomeFeed() {
    await delay(1000); // Simulate network delay
    return {
      success: true,
      data: {
        trending: sampleTracks.slice(0, 3),
        recent: sampleTracks.slice(2, 5),
        hotCreators: sampleCreators.slice(0, 3),
        upcomingEvents: sampleEvents
      },
      error: null
    };
  },

  async getTrendingTracks() {
    await delay(800);
    return {
      success: true,
      data: sampleTracks,
      error: null
    };
  },

  async getHotCreators() {
    await delay(600);
    return {
      success: true,
      data: sampleCreators,
      error: null
    };
  },

  async getUpcomingEvents() {
    await delay(700);
    return {
      success: true,
      data: sampleEvents,
      error: null
    };
  }
};
