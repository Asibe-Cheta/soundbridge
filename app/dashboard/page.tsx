'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Home, 
  Music, 
  Calendar, 
  List, 
  Users, 
  BarChart3, 
  Settings,
  Menu,
  X,
  Play,
  Heart,
  Share2,
  Edit,
  Trash2,
  Plus,
  Eye,
  TrendingUp,
  Users as UsersIcon,
  Clock,
  Star
} from 'lucide-react';

interface DashboardStats {
  totalPlays: number;
  followers: number;
  following: number;
  totalTracks: number;
  totalEvents: number;
  totalPlaylists: number;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string;
  plays: number;
  likes: number;
  uploadedAt: string;
  artwork: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  attendees: number;
  capacity: number;
  status: 'upcoming' | 'ongoing' | 'completed';
}

interface Playlist {
  id: string;
  name: string;
  tracks: number;
  followers: number;
  isPublic: boolean;
  createdAt: string;
}

interface Creator {
  id: string;
  name: string;
  genre: string;
  followers: number;
  lastActive: string;
  avatar: string;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const stats: DashboardStats = {
    totalPlays: 125000,
    followers: 2840,
    following: 156,
    totalTracks: 23,
    totalEvents: 8,
    totalPlaylists: 12
  };

  const recentTracks: Track[] = [
    { id: '1', title: 'Lagos Nights', artist: 'You', duration: '3:45', plays: 12500, likes: 890, uploadedAt: '2 days ago', artwork: '🎵' },
    { id: '2', title: 'Gospel Fusion', artist: 'You', duration: '4:12', plays: 8900, likes: 567, uploadedAt: '1 week ago', artwork: '🎵' },
    { id: '3', title: 'UK Drill Mix', artist: 'You', duration: '3:28', plays: 15600, likes: 1200, uploadedAt: '2 weeks ago', artwork: '🎵' }
  ];

  const upcomingEvents: Event[] = [
    { id: '1', title: 'Gospel Night Live', date: 'Tonight • 8PM', location: 'Royal Festival Hall, London', attendees: 1200, capacity: 1500, status: 'upcoming' },
    { id: '2', title: 'Afrobeats Carnival', date: 'Friday • 7PM', location: 'Tafawa Balewa Square, Lagos', attendees: 4500, capacity: 5000, status: 'upcoming' },
    { id: '3', title: 'UK Drill Showcase', date: 'Saturday • 6PM', location: 'O2 Academy, Birmingham', attendees: 750, capacity: 800, status: 'upcoming' }
  ];

  const playlists: Playlist[] = [
    { id: '1', name: 'My Favorites', tracks: 45, followers: 0, isPublic: false, createdAt: '1 month ago' },
    { id: '2', name: 'Afrobeats Vibes', tracks: 23, followers: 156, isPublic: true, createdAt: '2 weeks ago' },
    { id: '3', name: 'Gospel Collection', tracks: 18, followers: 89, isPublic: true, createdAt: '1 week ago' }
  ];

  const following: Creator[] = [
    { id: '1', name: 'Kwame Asante', genre: 'Afrobeats', followers: 125000, lastActive: '2 hours ago', avatar: '🎵' },
    { id: '2', name: 'Sarah Johnson', genre: 'Gospel', followers: 89000, lastActive: '1 day ago', avatar: '🎵' },
    { id: '3', name: 'Tommy B', genre: 'UK Drill', followers: 67000, lastActive: '3 hours ago', avatar: '🎵' }
  ];

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'music', label: 'My Music', icon: Music },
    { id: 'events', label: 'My Events', icon: Calendar },
    { id: 'playlists', label: 'My Playlists', icon: List },
    { id: 'following', label: 'Following', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const renderOverview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #DC2626, #EC4899)',
          borderRadius: '15px',
          padding: '1.5rem',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalPlays.toLocaleString()}</div>
              <div style={{ fontSize: '0.9rem', opacity: '0.9' }}>Total Plays</div>
            </div>
            <Play size={32} />
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #059669, #10B981)',
          borderRadius: '15px',
          padding: '1.5rem',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.followers.toLocaleString()}</div>
              <div style={{ fontSize: '0.9rem', opacity: '0.9' }}>Followers</div>
            </div>
            <UsersIcon size={32} />
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
          borderRadius: '15px',
          padding: '1.5rem',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalTracks}</div>
              <div style={{ fontSize: '0.9rem', opacity: '0.9' }}>Tracks</div>
            </div>
            <Music size={32} />
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #EA580C, #F97316)',
          borderRadius: '15px',
          padding: '1.5rem',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalEvents}</div>
              <div style={{ fontSize: '0.9rem', opacity: '0.9' }}>Events</div>
            </div>
            <Calendar size={32} />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        {/* Recent Tracks */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '15px',
          padding: '1.5rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Music size={20} />
            Recent Tracks
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentTracks.map((track) => (
              <div key={track.id} style={{
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
                  width: '50px',
                  height: '50px',
                  background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1.2rem'
                }}>
                  {track.artwork}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'white', fontWeight: '600' }}>{track.title}</div>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>{track.artist} • {track.duration}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#EC4899', fontSize: '0.9rem', fontWeight: '600' }}>
                    {track.plays.toLocaleString()} plays
                  </div>
                  <div style={{ color: '#666', fontSize: '0.8rem' }}>{track.uploadedAt}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '15px',
          padding: '1.5rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} />
            Upcoming Events
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {upcomingEvents.map((event) => (
              <div key={event.id} style={{
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '10px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
              >
                <div style={{ color: '#EC4899', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  {event.date}
                </div>
                <div style={{ color: 'white', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {event.title}
                </div>
                <div style={{ color: '#999', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  {event.location}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#666', fontSize: '0.8rem' }}>
                    {event.attendees.toLocaleString()} / {event.capacity.toLocaleString()} attendees
                  </div>
                  <div style={{
                    padding: '0.25rem 0.5rem',
                    background: 'rgba(236, 72, 153, 0.2)',
                    color: '#EC4899',
                    borderRadius: '15px',
                    fontSize: '0.8rem'
                  }}>
                    {event.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderMusic = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'white', margin: 0 }}>My Music</h2>
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.5rem',
          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          cursor: 'pointer',
          fontSize: '0.9rem',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Plus size={16} />
          Upload New Track
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {recentTracks.map((track) => (
          <div key={track.id} style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '15px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.5rem'
              }}>
                {track.artwork}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'white', fontWeight: '600', fontSize: '1.1rem' }}>
                  {track.title}
                </div>
                <div style={{ color: '#999', fontSize: '0.9rem' }}>
                  {track.artist} • {track.duration}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#EC4899', fontWeight: '600' }}>{track.plays.toLocaleString()}</div>
                  <div style={{ color: '#666', fontSize: '0.8rem' }}>Plays</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#EC4899', fontWeight: '600' }}>{track.likes.toLocaleString()}</div>
                  <div style={{ color: '#666', fontSize: '0.8rem' }}>Likes</div>
                </div>
              </div>
              <div style={{ color: '#666', fontSize: '0.8rem' }}>
                {track.uploadedAt}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button style={{
                flex: 1,
                padding: '0.5rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.8rem',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              >
                <Edit size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                Edit
              </button>
              <button style={{
                flex: 1,
                padding: '0.5rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.8rem',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              >
                <Eye size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                View
              </button>
              <button style={{
                padding: '0.5rem',
                background: 'rgba(239, 68, 68, 0.2)',
                border: 'none',
                borderRadius: '6px',
                color: '#EF4444',
                cursor: 'pointer',
                fontSize: '0.8rem',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'music':
        return renderMusic();
      default:
        return (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#999' }}>
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>Coming Soon</h3>
            <p>This section is under development.</p>
          </div>
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
      {/* Mobile Sidebar Toggle */}
      <div style={{
        position: 'fixed',
        top: '1rem',
        left: '1rem',
        zIndex: 1000,
        display: { xs: 'block', md: 'none' }
      }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '280px',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 900,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        '@media (min-width: 768px)': {
          transform: 'translateX(0)'
        }
      }}>
        <div style={{ padding: '2rem 1.5rem' }}>
          {/* Logo */}
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            🌉 SoundBridge
          </div>

          {/* Navigation */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    background: activeTab === item.id ? 'linear-gradient(45deg, #DC2626, #EC4899)' : 'transparent',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'left',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => activeTab !== item.id && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                  onMouseLeave={(e) => activeTab !== item.id && (e.currentTarget.style.background = 'transparent')}
                >
                  <Icon size={20} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        marginLeft: { xs: 0, md: '280px' },
        padding: '2rem',
        minHeight: '100vh'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <div>
            <h1 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '2.5rem' }}>
              Dashboard
            </h1>
            <p style={{ color: '#999', margin: 0 }}>
              Welcome back! Here's what's happening with your music.
            </p>
          </div>
        </div>

        {/* Content */}
        {renderContent()}
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 800
          }}
        />
      )}
    </div>
  );
} 