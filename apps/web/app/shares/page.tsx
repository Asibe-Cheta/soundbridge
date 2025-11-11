'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Share2, Heart, Play, Pause, MessageCircle, Calendar, MapPin, User, Filter, Search, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useSocial } from '@/src/hooks/useSocial';
import { useAudioPlayer } from '@/src/contexts/AudioPlayerContext';
import type { AudioTrack } from '@/src/lib/types/audio';

interface SharedContent {
  id: string;
  content_id: string;
  content_type: 'track' | 'event';
  share_type: 'repost' | 'external_share';
  external_platform?: string;
  caption?: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  content: {
    id: string;
    title: string;
    creator_id: string;
    creator?: {
      username: string;
      display_name: string;
    };
    cover_art_url?: string;
    duration?: number;
    play_count?: number;
    like_count?: number;
    venue?: string;
    event_date?: string;
    start_time?: string;
  };
}

export default function SharesPage() {
  const { user } = useAuth();
  const { getShares, getUserShares } = useSocial();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();
  
  const [sharedContent, setSharedContent] = useState<SharedContent[]>([]);
  const [userShares, setUserShares] = useState<SharedContent[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'my-shares'>('all');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'track' | 'event'>('all');

  useEffect(() => {
    loadSharedContent();
  }, [activeTab]);

  const loadSharedContent = async () => {
    setLoading(true);
    try {
      if (activeTab === 'all') {
        // Load all shared content (in a real app, this would be from a feed or discovery)
        // For now, we'll load shares from tracks that exist
        const response = await fetch('/api/social/shares/discover');
        if (response.ok) {
          const data = await response.json();
          setSharedContent(data.shares || []);
        }
      } else {
        // Load user's own shares
        if (user) {
          const { data } = await getUserShares();
          setUserShares((data || []).filter(share => share.user) as SharedContent[]);
        }
      }
    } catch (error) {
      console.error('Error loading shared content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTrack = (track: any) => {
    console.log('🎵 handlePlayTrack called with:', track);
    console.log('🎵 Original track data:', {
      id: track.id,
      title: track.title,
      lyrics: track.lyrics,
      lyricsLanguage: track.lyricsLanguage
    });
    
    const audioTrack: AudioTrack = {
      id: track.id,
      title: track.title,
      artist: track.creator?.display_name || track.artist || 'Unknown Artist',
      album: track.creator?.display_name || 'Unknown Album',
      duration: track.duration || 0,
      artwork: track.cover_art_url || track.coverArt || '',
      url: track.file_url || track.url || '',
      liked: false,
      lyrics: track.lyrics || undefined,
      lyricsLanguage: track.lyricsLanguage || undefined
    };
    
    console.log('🎵 Converted to AudioTrack:', audioTrack);
    playTrack(audioTrack);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const filteredContent = (activeTab === 'all' ? sharedContent : userShares).filter(item => {
    const matchesSearch = item.content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.caption?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || item.content_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const renderTrackCard = (share: SharedContent) => (
    <div key={share.id} style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '15px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      marginBottom: '1rem'
    }}>
      {/* Share Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: share.user.avatar_url ? 'none' : 'linear-gradient(45deg, #3B82F6, #8B5CF6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: 'white'
        }}>
          {share.user.avatar_url ? (
            <img
              src={share.user.avatar_url}
              alt={share.user.display_name}
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            share.user.display_name.charAt(0)
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'white', fontWeight: '600', fontSize: '0.875rem' }}>
              {share.user.display_name}
            </span>
            <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
              @{share.user.username}
            </span>
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
            {formatDate(share.created_at)}
            {share.external_platform && (
              <span style={{ marginLeft: '0.5rem', color: '#3B82F6' }}>
                • Shared on {share.external_platform}
              </span>
            )}
          </div>
        </div>
        <Share2 size={16} style={{ color: '#9CA3AF' }} />
      </div>

      {/* Share Caption */}
      {share.caption && (
        <div style={{ color: 'white', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: '1.5' }}>
          {share.caption}
        </div>
      )}

      {/* Track Content */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <img
            src={share.content.cover_art_url || '/images/default-cover.jpg'}
            alt={share.content.title}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '12px',
              objectFit: 'cover'
            }}
          />
          <button
            onClick={() => handlePlayTrack(share.content)}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {currentTrack?.id === share.content.id && isPlaying ? (
              <Pause size={16} />
            ) : (
              <Play size={16} />
            )}
          </button>
        </div>
        
        <div style={{ flex: 1 }}>
          <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: '600', margin: '0 0 0.25rem 0' }}>
            {share.content.title}
          </h3>
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>
            by {share.content.creator?.display_name || 'Unknown Artist'}
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#9CA3AF' }}>
            <span>{formatDuration(share.content.duration || 0)}</span>
            <span>• {share.content.play_count || 0} plays</span>
            <span>• {share.content.like_count || 0} likes</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEventCard = (share: SharedContent) => (
    <div key={share.id} style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '15px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      marginBottom: '1rem'
    }}>
      {/* Share Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: share.user.avatar_url ? 'none' : 'linear-gradient(45deg, #3B82F6, #8B5CF6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: 'white'
        }}>
          {share.user.avatar_url ? (
            <img
              src={share.user.avatar_url}
              alt={share.user.display_name}
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            share.user.display_name.charAt(0)
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'white', fontWeight: '600', fontSize: '0.875rem' }}>
              {share.user.display_name}
            </span>
            <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
              @{share.user.username}
            </span>
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
            {formatDate(share.created_at)}
            {share.external_platform && (
              <span style={{ marginLeft: '0.5rem', color: '#3B82F6' }}>
                • Shared on {share.external_platform}
              </span>
            )}
          </div>
        </div>
        <Share2 size={16} style={{ color: '#9CA3AF' }} />
      </div>

      {/* Share Caption */}
      {share.caption && (
        <div style={{ color: 'white', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: '1.5' }}>
          {share.caption}
        </div>
      )}

      {/* Event Content */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '12px',
          background: 'linear-gradient(45deg, #EC4899, #8B5CF6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '1.5rem'
        }}>
          <Calendar size={24} />
        </div>
        
        <div style={{ flex: 1 }}>
          <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: '600', margin: '0 0 0.25rem 0' }}>
            {share.content.title}
          </h3>
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>
            by {share.content.creator?.display_name || 'Unknown Organizer'}
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#9CA3AF' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={12} />
              {share.content.event_date}
            </span>
            {share.content.venue && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <MapPin size={12} />
                {share.content.venue}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>
        Loading shared content...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1rem 1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <Link href="/" style={{ color: '#9CA3AF', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
            Shared Content
          </h1>
        </div>

        {/* Search and Filter */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9CA3AF'
            }} />
            <input
              type="text"
              placeholder="Search shared content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            style={{
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.875rem'
            }}
          >
            <option value="all">All</option>
            <option value="track">Tracks</option>
            <option value="event">Events</option>
          </select>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '0.5rem 1rem',
              background: activeTab === 'all' ? '#3B82F6' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid',
              borderColor: activeTab === 'all' ? '#3B82F6' : 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            All Shares
          </button>
          <button
            onClick={() => setActiveTab('my-shares')}
            style={{
              padding: '0.5rem 1rem',
              background: activeTab === 'my-shares' ? '#3B82F6' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid',
              borderColor: activeTab === 'my-shares' ? '#3B82F6' : 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            My Shares
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '1.5rem' }}>
        {filteredContent.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '3rem 1rem' }}>
            <Share2 size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>
              {activeTab === 'all' ? 'No shared content found' : 'You haven\'t shared anything yet'}
            </h3>
            <p style={{ fontSize: '0.875rem' }}>
              {activeTab === 'all' 
                ? 'When people share tracks and events, they\'ll appear here.'
                : 'Start sharing your favorite tracks and events with others!'
              }
            </p>
          </div>
        ) : (
          <div>
            {filteredContent.map((share) => (
              share.content_type === 'track' 
                ? renderTrackCard(share)
                : renderEventCard(share)
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
