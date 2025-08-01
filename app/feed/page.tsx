'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  MessageCircle,
  Share2,
  Play,
  Pause,
  MoreHorizontal,
  Users,
  Calendar,
  MapPin,
  Bookmark,
  Sparkles,
  Activity,
  Headphones,
  Repeat
} from 'lucide-react';

interface Creator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  followers: number;
  isFollowing: boolean;
  genre: string;
  location: string;
  verified: boolean;
}

interface Track {
  id: string;
  title: string;
  artist: Creator;
  duration: string;
  plays: number;
  likes: number;
  comments: number;
  shares: number;
  uploadedAt: string;
  artwork: string;
  isLiked: boolean;
  isReposted: boolean;
  isBookmarked: boolean;
  genre: string;
  waveform: number[];
}

interface Event {
  id: string;
  title: string;
  creator: Creator;
  date: string;
  time: string;
  location: string;
  attendees: number;
  capacity: number;
  price: string;
  category: string;
  isInterested: boolean;
  isBookmarked: boolean;
}

interface ActivityItem {
  id: string;
  type: 'upload' | 'event' | 'collaboration' | 'like' | 'follow' | 'comment';
  creator: Creator;
  track?: Track;
  event?: Event;
  timestamp: string;
  content?: string;
}

interface FriendActivity {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  action: string;
  track?: string;
  timestamp: string;
}

const mockCreators: Creator[] = [
  { id: '1', name: 'Kwame Asante', username: '@kwame_asante', avatar: '🎵', followers: 125000, isFollowing: true, genre: 'Afrobeats', location: 'London, UK', verified: true },
  { id: '2', name: 'Sarah Johnson', username: '@sarah_j', avatar: '🎵', followers: 89000, isFollowing: true, genre: 'Gospel', location: 'Birmingham, UK', verified: false },
  { id: '3', name: 'Tommy B', username: '@tommy_b', avatar: '🎵', followers: 67000, isFollowing: false, genre: 'UK Drill', location: 'Manchester, UK', verified: true },
  { id: '4', name: 'Ada Grace', username: '@ada_grace', avatar: '🎵', followers: 45000, isFollowing: false, genre: 'Gospel', location: 'Lagos, Nigeria', verified: false },
  { id: '5', name: 'DJ Emeka', username: '@dj_emeka', avatar: '🎵', followers: 78000, isFollowing: true, genre: 'Afrobeats', location: 'Lagos, Nigeria', verified: true },
  { id: '6', name: 'Grace Community', username: '@grace_community', avatar: '🎵', followers: 34000, isFollowing: false, genre: 'Gospel', location: 'Abuja, Nigeria', verified: false }
];

const mockTracks: Track[] = [
  {
    id: '1',
    title: 'Lagos Nights',
    artist: mockCreators[0],
    duration: '3:45',
    plays: 12500,
    likes: 890,
    comments: 45,
    shares: 23,
    uploadedAt: '2 hours ago',
    artwork: '🎵',
    isLiked: false,
    isReposted: false,
    isBookmarked: false,
    genre: 'Afrobeats',
    waveform: [0.3, 0.8, 0.5, 0.9, 0.4, 0.7, 0.6, 0.8, 0.3, 0.9]
  },
  {
    id: '2',
    title: 'Gospel Fusion',
    artist: mockCreators[1],
    duration: '4:12',
    plays: 8900,
    likes: 567,
    comments: 32,
    shares: 18,
    uploadedAt: '5 hours ago',
    artwork: '🎵',
    isLiked: true,
    isReposted: false,
    isBookmarked: true,
    genre: 'Gospel',
    waveform: [0.4, 0.6, 0.8, 0.3, 0.7, 0.5, 0.9, 0.4, 0.6, 0.8]
  },
  {
    id: '3',
    title: 'UK Drill Mix',
    artist: mockCreators[2],
    duration: '3:28',
    plays: 15600,
    likes: 1200,
    comments: 78,
    shares: 45,
    uploadedAt: '1 day ago',
    artwork: '🎵',
    isLiked: false,
    isReposted: true,
    isBookmarked: false,
    genre: 'UK Drill',
    waveform: [0.5, 0.9, 0.3, 0.7, 0.6, 0.8, 0.4, 0.9, 0.5, 0.7]
  }
];

const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Gospel Night Live',
    creator: mockCreators[1],
    date: 'Tonight',
    time: '8:00 PM',
    location: 'Royal Festival Hall, London',
    attendees: 1200,
    capacity: 1500,
    price: '£25-45',
    category: 'Gospel',
    isInterested: true,
    isBookmarked: false
  },
  {
    id: '2',
    title: 'Afrobeats Carnival',
    creator: mockCreators[4],
    date: 'Friday',
    time: '7:00 PM',
    location: 'Tafawa Balewa Square, Lagos',
    attendees: 4500,
    capacity: 5000,
    price: '₦5000-15000',
    category: 'Afrobeats',
    isInterested: false,
    isBookmarked: true
  }
];

const mockActivityFeed: ActivityItem[] = [
  {
    id: '1',
    type: 'upload',
    creator: mockCreators[0],
    track: mockTracks[0],
    timestamp: '2 hours ago'
  },
  {
    id: '2',
    type: 'event',
    creator: mockCreators[1],
    event: mockEvents[0],
    timestamp: '3 hours ago'
  },
  {
    id: '3',
    type: 'upload',
    creator: mockCreators[1],
    track: mockTracks[1],
    timestamp: '5 hours ago'
  },
  {
    id: '4',
    type: 'collaboration',
    creator: mockCreators[2],
    content: 'Just collaborated with @kwame_asante on a new track!',
    timestamp: '1 day ago'
  },
  {
    id: '5',
    type: 'upload',
    creator: mockCreators[2],
    track: mockTracks[2],
    timestamp: '1 day ago'
  },
  {
    id: '6',
    type: 'event',
    creator: mockCreators[4],
    event: mockEvents[1],
    timestamp: '2 days ago'
  }
];

const mockFriendActivity: FriendActivity[] = [
  { id: '1', user: { name: 'John', avatar: '👤' }, action: 'is listening to', track: 'Praise Medley', timestamp: '5 min ago' },
  { id: '2', user: { name: 'Sarah', avatar: '👤' }, action: 'posted a new track', track: 'Gospel Vibes', timestamp: '1 hour ago' },
  { id: '3', user: { name: 'Mike', avatar: '👤' }, action: 'joined event', track: 'Gospel Night Live', timestamp: '2 hours ago' },
  { id: '4', user: { name: 'Emma', avatar: '👤' }, action: 'liked', track: 'Lagos Nights', timestamp: '3 hours ago' }
];

const mockRecentlyPlayed: Track[] = [
  { id: '1', title: 'Praise Medley', artist: mockCreators[1], duration: '4:30', plays: 0, likes: 0, comments: 0, shares: 0, uploadedAt: '', artwork: '🎵', isLiked: false, isReposted: false, isBookmarked: false, genre: 'Gospel', waveform: [] },
  { id: '2', title: 'Afro Fusion', artist: mockCreators[0], duration: '3:45', plays: 0, likes: 0, comments: 0, shares: 0, uploadedAt: '', artwork: '🎵', isLiked: false, isReposted: false, isBookmarked: false, genre: 'Afrobeats', waveform: [] },
  { id: '3', title: 'Worship Experience', artist: mockCreators[5], duration: '5:20', plays: 0, likes: 0, comments: 0, shares: 0, uploadedAt: '', artwork: '🎵', isLiked: false, isReposted: false, isBookmarked: false, genre: 'Gospel', waveform: [] }
];

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');
  const [activityFeed] = useState<ActivityItem[]>(mockActivityFeed);
  const [creators, setCreators] = useState<Creator[]>(mockCreators);

  const [friendActivity] = useState<FriendActivity[]>(mockFriendActivity);
  const [recentlyPlayed] = useState<Track[]>(mockRecentlyPlayed);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);


  const toggleFollow = (creatorId: string) => {
    setCreators(prev => prev.map(creator =>
      creator.id === creatorId
        ? { ...creator, isFollowing: !creator.isFollowing }
        : creator
    ));
  };



  const togglePlay = (trackId: string) => {
    setIsPlaying(isPlaying === trackId ? null : trackId);
  };

  const renderTrackCard = (track: Track) => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '15px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      marginBottom: '1rem',
      transition: 'all 0.3s ease'
    }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {/* Creator Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{
          width: '50px',
          height: '50px',
          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '1.2rem'
        }}>
          {track.artist.avatar}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'white', fontWeight: '600' }}>{track.artist.name}</span>
            {track.artist.verified && <span style={{ color: '#EC4899' }}>✓</span>}
          </div>
          <div style={{ color: '#999', fontSize: '0.9rem' }}>
            {track.artist.username} • {track.uploadedAt}
          </div>
        </div>
        <button
          onClick={() => toggleFollow(track.artist.id)}
          style={{
            padding: '0.5rem 1rem',
            background: track.artist.isFollowing
              ? 'rgba(255, 255, 255, 0.1)'
              : 'linear-gradient(45deg, #DC2626, #EC4899)',
            border: 'none',
            borderRadius: '20px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'all 0.3s ease'
          }}
        >
          {track.artist.isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>

      {/* Track Content */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '2rem',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
          onClick={() => togglePlay(track.id)}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isPlaying === track.id ? <Pause size={32} /> : <Play size={32} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'white', fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            {track.title}
          </div>
          <div style={{ color: '#999', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            {track.artist.name} • {track.duration} • {track.genre}
          </div>
          <div style={{ color: '#666', fontSize: '0.8rem' }}>
            {track.plays.toLocaleString()} plays • {track.uploadedAt}
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '1rem', height: '30px', alignItems: 'end' }}>
        {track.waveform.map((height, index) => (
          <div
            key={index}
            style={{
              width: '3px',
              height: `${height * 30}px`,
              background: isPlaying === track.id ? '#EC4899' : '#666',
              borderRadius: '2px',
              transition: 'all 0.3s ease'
            }}
          />
        ))}
      </div>

      {/* Social Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => toggleLike(track.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'none',
              border: 'none',
              color: track.isLiked ? '#EC4899' : '#999',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease'
            }}
          >
            <Heart size={16} fill={track.isLiked ? '#EC4899' : 'none'} />
            {track.likes.toLocaleString()}
          </button>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: '#999',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}>
            <MessageCircle size={16} />
            {track.comments}
          </button>
          <button
            onClick={() => toggleRepost(track.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'none',
              border: 'none',
              color: track.isReposted ? '#EC4899' : '#999',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease'
            }}
          >
            <Repeat size={16} />
            {track.shares}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => toggleBookmark(track.id)}
            style={{
              padding: '0.5rem',
              background: 'none',
              border: 'none',
              color: track.isBookmarked ? '#EC4899' : '#999',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            <Bookmark size={16} fill={track.isBookmarked ? '#EC4899' : 'none'} />
          </button>
          <button style={{
            padding: '0.5rem',
            background: 'none',
            border: 'none',
            color: '#999',
            cursor: 'pointer'
          }}>
            <Share2 size={16} />
          </button>
          <button style={{
            padding: '0.5rem',
            background: 'none',
            border: 'none',
            color: '#999',
            cursor: 'pointer'
          }}>
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderEventCard = (event: Event) => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '15px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      marginBottom: '1rem',
      transition: 'all 0.3s ease'
    }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {/* Creator Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{
          width: '50px',
          height: '50px',
          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '1.2rem'
        }}>
          {event.creator.avatar}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'white', fontWeight: '600' }}>{event.creator.name}</span>
            {event.creator.verified && <span style={{ color: '#EC4899' }}>✓</span>}
          </div>
          <div style={{ color: '#999', fontSize: '0.9rem' }}>
            {event.creator.username} • {event.category} event
          </div>
        </div>
        <button
          onClick={() => toggleFollow(event.creator.id)}
          style={{
            padding: '0.5rem 1rem',
            background: event.creator.isFollowing
              ? 'rgba(255, 255, 255, 0.1)'
              : 'linear-gradient(45deg, #DC2626, #EC4899)',
            border: 'none',
            borderRadius: '20px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'all 0.3s ease'
          }}
        >
          {event.creator.isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>

      {/* Event Content */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ color: 'white', fontWeight: '600', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
          {event.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', color: '#999', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calendar size={14} />
            {event.date} • {event.time}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <MapPin size={14} />
            {event.location}
          </div>
        </div>
        <div style={{ color: '#666', fontSize: '0.8rem' }}>
          {event.attendees.toLocaleString()} / {event.capacity.toLocaleString()} attendees • {event.price}
        </div>
      </div>

      {/* Event Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => toggleEventInterest(event.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: event.isInterested
                ? 'linear-gradient(45deg, #DC2626, #EC4899)'
                : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '20px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease'
            }}
          >
            <Heart size={16} />
            {event.isInterested ? 'Interested' : 'Interested'}
          </button>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '20px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}>
            <Share2 size={16} />
            Share
          </button>
        </div>
        <button style={{
          padding: '0.5rem',
          background: 'none',
          border: 'none',
          color: '#999',
          cursor: 'pointer'
        }}>
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );

  const renderActivityItem = (item: ActivityItem) => {
    switch (item.type) {
      case 'upload':
        return item.track ? renderTrackCard(item.track) : null;
      case 'event':
        return item.event ? renderEventCard(item.event) : null;
      case 'collaboration':
        return (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '15px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.2rem'
              }}>
                {item.creator.avatar}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'white', fontWeight: '600' }}>{item.creator.name}</span>
                  {item.creator.verified && <span style={{ color: '#EC4899' }}>✓</span>}
                </div>
                <div style={{ color: '#999', fontSize: '0.9rem' }}>
                  {item.creator.username} • {item.timestamp}
                </div>
              </div>
            </div>
            <div style={{ color: 'white', fontSize: '1rem' }}>
              {item.content}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderCreatorDiscovery = () => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '15px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      marginBottom: '1rem'
    }}>
      <h3 style={{ color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Sparkles size={20} />
        Discover Creators
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {creators.filter(c => !c.isFollowing).slice(0, 3).map((creator) => (
          <div key={creator.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '10px',
            transition: 'all 0.3s ease'
          }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
          >
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1rem'
            }}>
              {creator.avatar}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'white', fontWeight: '600' }}>{creator.name}</span>
                {creator.verified && <span style={{ color: '#EC4899' }}>✓</span>}
              </div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>
                {creator.genre} • {creator.followers.toLocaleString()} followers
              </div>
            </div>
            <button
              onClick={() => toggleFollow(creator.id)}
              style={{
                padding: '0.5rem 1rem',
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                border: 'none',
                borderRadius: '20px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease'
              }}
            >
              Follow
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRecentlyPlayed = () => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '15px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      marginBottom: '1rem'
    }}>
      <h3 style={{ color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Headphones size={20} />
        Recently Played
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {recentlyPlayed.map((track) => (
          <div key={track.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
            onClick={() => togglePlay(track.id)}
          >
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1rem'
            }}>
              {track.artwork}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'white', fontWeight: '600', fontSize: '0.9rem' }}>
                {track.title}
              </div>
              <div style={{ color: '#999', fontSize: '0.8rem' }}>
                {track.artist.name}
              </div>
            </div>
            <button style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer'
            }}>
              {isPlaying === track.id ? <Pause size={16} /> : <Play size={16} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFriendActivity = () => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '15px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      marginBottom: '1rem'
    }}>
      <h3 style={{ color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Activity size={20} />
        Friend Activity
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {friendActivity.map((activity) => (
          <div key={activity.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '8px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.8rem'
            }}>
              {activity.user.avatar}
            </div>
            <div style={{ flex: 1, fontSize: '0.9rem' }}>
              <span style={{ color: 'white', fontWeight: '600' }}>{activity.user.name}</span>
              <span style={{ color: '#999' }}> {activity.action} </span>
              <span style={{ color: '#EC4899' }}>&quot;{activity.track}&quot;</span>
            </div>
            <div style={{ color: '#666', fontSize: '0.8rem' }}>
              {activity.timestamp}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
      {/* Header */}
      <header style={{
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}>
              ←
            </button>
          </Link>
          <div>
            <h1 style={{ color: 'white', margin: 0, fontSize: '1.5rem' }}>Activity Feed</h1>
            <p style={{ color: '#999', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
              Stay updated with your favorite creators
            </p>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)' }}>
        {/* Main Content */}
        <div style={{ flex: 1, padding: '2rem' }}>
          {/* Feed Tabs */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button
              onClick={() => setActiveTab('for-you')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'for-you'
                  ? 'linear-gradient(45deg, #DC2626, #EC4899)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '25px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
            >
              <Sparkles size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              For You
            </button>
            <button
              onClick={() => setActiveTab('following')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'following'
                  ? 'linear-gradient(45deg, #DC2626, #EC4899)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '25px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
            >
              <Users size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Following
            </button>
          </div>

          {/* Activity Feed */}
          <div>
            {activeTab === 'for-you' && renderCreatorDiscovery()}
            {activityFeed.map(renderActivityItem)}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{
          width: '320px',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '2rem 1.5rem',
          overflowY: 'auto'
        }}>
          {renderRecentlyPlayed()}
          {renderFriendActivity()}
        </div>
      </div>
    </div>
  );
} 