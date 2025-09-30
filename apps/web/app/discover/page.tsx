'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAudioPlayer } from '@/src/contexts/AudioPlayerContext';
import { useSocial } from '@/src/hooks/useSocial';
import { Footer } from '../../src/components/layout/Footer';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import { AdvancedFilters } from '../../src/components/ui/AdvancedFilters';
import { ThemeToggle } from '@/src/components/ui/ThemeToggle';
import SearchDropdown from '@/src/components/search/SearchDropdown';
import { useSearch } from '../../src/hooks/useSearch';
import { searchCreators } from '../../src/lib/creator';
import type { CreatorSearchResult, Event } from '../../src/lib/types/creator';
import type { AudioTrack } from '../../src/lib/types/search';
import ShareModal from '@/src/components/social/ShareModal';
import {
  Search,
  Filter,
  TrendingUp,
  Music,
  Users,
  Calendar,
  Mic,
  AlertCircle,
  User,
  Plus,
  LogOut,
  Bell,
  Settings,
  Play,
  Pause,
  Heart,
  Share2,
  Loader2,
  Upload,
  Menu,
  X,
  Home
} from 'lucide-react';

export default function DiscoverPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();
  const { toggleLike } = useSocial();
  const [pageLoaded, setPageLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [sortBy, setSortBy] = useState('trending');
  const [activeTab, setActiveTab] = useState('music');

  // Handle URL parameters for tab selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['music', 'creators', 'events', 'podcasts'].includes(tabParam)) {
      setActiveTab(tabParam);
      }
    }
  }, []);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [creators, setCreators] = useState<CreatorSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedTrackForShare, setSelectedTrackForShare] = useState<AudioTrack | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Use the search hook for trending content
  const {
    results: trendingResults,
    loading: trendingLoading,
    error: trendingError,
    getTrendingContent
  } = useSearch();

  // Mobile responsiveness detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      try {
        const menu = document.getElementById('user-menu');
        const menuButton = document.getElementById('user-menu-button');
        if (menu && menuButton && !menu.contains(event.target as Node) && !menuButton.contains(event.target as Node)) {
          menu.style.display = 'none';
        }
      } catch (error) {
        console.error('Error in click outside handler:', error);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Mobile detection
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const categories = [
    { id: 'music', label: 'Music', icon: Music },
    { id: 'creators', label: 'Creators', icon: Users },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'podcasts', label: 'Podcasts', icon: Mic }
  ];

  const genres = [
    { value: 'all', label: 'All Genres' },
    { value: 'afrobeats', label: 'Afrobeats' },
    { value: 'gospel', label: 'Gospel' },
    { value: 'uk-drill', label: 'UK Drill' },
    { value: 'highlife', label: 'Highlife' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'hip-hop', label: 'Hip Hop' },
    { value: 'r&b', label: 'R&B' },
    { value: 'pop', label: 'Pop' },
    { value: 'electronic', label: 'Electronic' }
  ];

  const locations = [
    { value: 'all', label: 'All Locations' },
    { value: 'london', label: 'London, UK' },
    { value: 'lagos', label: 'Lagos, Nigeria' },
    { value: 'abuja', label: 'Abuja, Nigeria' },
    { value: 'manchester', label: 'Manchester, UK' },
    { value: 'birmingham', label: 'Birmingham, UK' },
    { value: 'liverpool', label: 'Liverpool, UK' },
    { value: 'port-harcourt', label: 'Port Harcourt, Nigeria' }
  ];

  const dateRanges = [
    { value: 'all', label: 'All Dates' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'next-month', label: 'Next Month' }
  ];

  const priceRanges = [
    { value: 'all', label: 'All Prices' },
    { value: 'free', label: 'Free' },
    { value: 'low', label: 'Under £20' },
    { value: 'medium', label: '£20-50' },
    { value: 'high', label: 'Over £50' }
  ];

  const sortOptions = [
    { value: 'trending', label: 'Trending' },
    { value: 'latest', label: 'Latest' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'nearest', label: 'Nearest Events' }
  ];

  // Load trending content on mount
  useEffect(() => {
    const loadTrendingContent = async () => {
      try {
        // Add a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          console.warn('Trending content loading timeout - falling back to empty state');
          setShowFallback(true);
        }, 10000); // 10 second timeout
        
        console.log('🔄 Loading trending content...');
        const result = await getTrendingContent(20);
        console.log('✅ Trending content result:', result);
        clearTimeout(timeoutId);
        setPageLoaded(true);
      } catch (error) {
        console.error('❌ Error loading trending content:', error);
        setPageLoaded(true); // Set to true even on error to show the page
      }
    };
    
    loadTrendingContent();
  }, [getTrendingContent]);

  useEffect(() => {
    const loadCreators = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const filters = {
          genre: selectedGenre !== 'all' ? selectedGenre : undefined,
          location: selectedLocation !== 'all' ? selectedLocation : undefined,
          country: selectedLocation.includes('nigeria') ? 'Nigeria' as const :
            selectedLocation.includes('uk') ? 'UK' as const : undefined
        };

        const { data: creatorsData, error } = await searchCreators(filters);

        if (error) {
          setError('Failed to load creators');
          return;
        }

        // Transform the data to match the expected interface
        const transformedCreators = (creatorsData || []).map(creator => ({
          profile: {
            id: creator.profile.id,
            username: creator.profile?.username || '',
            display_name: creator.profile.display_name || creator.profile.full_name || 'Unknown Creator',
            bio: creator.profile.bio || null,
            avatar_url: creator.profile.avatar_url || null,
            banner_url: (creator.profile as Record<string, unknown>).banner_url as string | null || null,
            role: (creator.profile.role === 'organizer' ? 'creator' : creator.profile.role) as 'creator' | 'listener',
            location: creator.profile.location || null,
            country: creator.profile.country as 'UK' | 'Nigeria' | null,
            social_links: (creator.profile as Record<string, unknown>).social_links as Record<string, string> || {},
            created_at: creator.profile.created_at,
            updated_at: creator.profile.updated_at,
            followers_count: creator.stats.followers_count,
            following_count: (creator.stats as Record<string, unknown>).following_count as number || 0,
            tracks_count: creator.stats.tracks_count,
            events_count: creator.stats.events_count,
            is_following: false // Default value, would need separate API call to determine
          },
          stats: {
            followers_count: creator.stats.followers_count,
            following_count: (creator.stats as Record<string, unknown>).following_count as number || 0,
            tracks_count: creator.stats.tracks_count,
            events_count: creator.stats.events_count,
            total_plays: (creator.stats as Record<string, unknown>).total_plays as number || 0,
            total_likes: (creator.stats as Record<string, unknown>).total_likes as number || 0
          },
          recent_tracks: [] as never[], // Use empty array to avoid type conflicts
          upcoming_events: (creator as unknown as Record<string, unknown>).upcoming_events as Event[] || []
        }));

        setCreators(transformedCreators);
      } catch (err) {
        console.error('Error loading creators:', err);
        setError('Failed to load creators');
      } finally {
        setIsLoading(false);
      }
    };

    loadCreators();
  }, [selectedGenre, selectedLocation]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedGenre('all');
    setSelectedLocation('all');
    setSelectedDate('all');
    setSelectedPrice('all');
    setSortBy('trending');
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handlePlayTrack = (track: AudioTrack) => {
    console.log('🎵 handlePlayTrack called with:', track);
    
    // Convert track data to AudioTrack format
    const audioTrack = {
      id: track.id,
      title: track.title,
      artist: track.creator?.display_name || 'Unknown Artist',
      album: '',
      duration: track.duration || 0,
      artwork: track.cover_art_url || '',
      url: track.file_url || '',
      liked: false
    };
    
    console.log('🎵 Converted to AudioTrack:', audioTrack);
    playTrack(audioTrack);
  };

  const handleLikeTrack = async (track: AudioTrack, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      alert('Please sign in to like tracks');
      return;
    }

    try {
      const result = await toggleLike({
        content_id: track.id,
        content_type: 'track'
      });
      
      if (!result.error) {
        // Update local state
        const newLikedTracks = new Set(likedTracks);
        const isCurrentlyLiked = newLikedTracks.has(track.id);
        
        if (isCurrentlyLiked) {
          newLikedTracks.delete(track.id);
        } else {
          newLikedTracks.add(track.id);
        }
        setLikedTracks(newLikedTracks);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleShareTrack = async (track: AudioTrack, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedTrackForShare(track);
    setShareModalOpen(true);
  };

  const renderEmptyState = (type: string) => {
    const emptyStates = {
      music: {
        icon: <Music size={48} className="mx-auto mb-4 opacity-50" />,
        title: "No Music Available Yet",
        description: "Be the first to upload amazing tracks and share your music with the world!",
        action: "Upload Music",
        actionLink: "/upload"
      },
      creators: {
        icon: <Users size={48} className="mx-auto mb-4 opacity-50" />,
        title: "No Creators Found",
        description: "Join our community of talented artists and creators!",
        action: "Become a Creator",
        actionLink: "/signup"
      },
      events: {
        icon: <Calendar size={48} className="mx-auto mb-4 opacity-50" />,
        title: "No Events Scheduled",
        description: "Create exciting events and bring people together through music!",
        action: "Create Event",
        actionLink: "/events/create"
      },
      podcasts: {
        icon: <Mic size={48} className="mx-auto mb-4 opacity-50" />,
        title: "No Podcasts Yet",
        description: "Start your podcast journey and share your stories with listeners!",
        action: "Start Podcast",
        actionLink: "/upload"
      }
    };

    const state = emptyStates[type as keyof typeof emptyStates] || emptyStates.music;

    return (
      <div className="card" style={{ 
        gridColumn: type === 'music' ? 'span 6' : 'span 3', 
        textAlign: 'center', 
        padding: '3rem 2rem',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px dashed rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ color: '#EC4899', marginBottom: '1rem' }}>
          {state.icon}
        </div>
        <h3 style={{ color: '#EC4899', marginBottom: '1rem', fontSize: '1.2rem' }}>
          {state.title}
        </h3>
        <p style={{ color: '#ccc', marginBottom: '2rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
          {state.description}
        </p>
        <Link href={state.actionLink} style={{ textDecoration: 'none' }}>
          <button style={{ 
            background: 'linear-gradient(45deg, #DC2626, #EC4899)',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.9rem',
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            margin: '0 auto',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
          }}
          >
            <Plus size={16} />
            {state.action}
          </button>
        </Link>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'music':
        return (
          <>
            {trendingLoading && !showFallback ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: '#EC4899' }} />
              </div>
            ) : showFallback ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <AlertCircle size={48} style={{ color: '#DC2626', marginBottom: '1rem' }} />
                <h3 style={{ color: '#DC2626', marginBottom: '1rem' }}>Content Loading Slowly</h3>
                <p style={{ color: '#ccc', marginBottom: '1rem' }}>We&apos;re having trouble loading content. Please try refreshing the page.</p>
                <button 
                  onClick={() => {
                    setShowFallback(false);
                    getTrendingContent(20);
                  }} 
                  style={{
                    background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : trendingError ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <AlertCircle size={48} style={{ color: '#DC2626', marginBottom: '1rem' }} />
                <h3 style={{ color: '#DC2626', marginBottom: '1rem' }}>Error Loading Music</h3>
                <p style={{ color: '#ccc', marginBottom: '1rem' }}>{trendingError}</p>
                <button 
                  onClick={() => getTrendingContent(20)} 
                  style={{
                    background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : (trendingResults?.music && trendingResults.music.length > 0) ? (
              <div style={{
                display: isMobile ? 'flex' : 'grid',
                gridTemplateColumns: isMobile ? 'none' : 'repeat(6, 1fr)',
                gap: isMobile ? '1rem' : '1rem',
                maxWidth: '100%',
                justifyContent: isMobile ? 'flex-start' : 'center',
                overflowX: isMobile ? 'auto' : 'visible',
                paddingBottom: isMobile ? '1rem' : '0',
                scrollbarWidth: isMobile ? 'thin' : 'auto',
                scrollbarColor: isMobile ? 'rgba(236, 72, 153, 0.5) transparent' : 'auto'
              }} className={isMobile ? 'horizontal-scroll' : ''}>
                {trendingResults.music.map((track) => (
                  <div key={track.id} className="card" style={{ 
                    cursor: 'pointer',
                    width: isMobile ? '140px' : 'auto',
                    minWidth: isMobile ? '140px' : 'auto',
                    minHeight: isMobile ? '140px' : 'auto',
                    flexShrink: isMobile ? '0' : '1'
                  }}>
                    <div className="card-image" style={{ position: 'relative' }}>
                      {track.cover_art_url ? (
                        <Image
                          src={track.cover_art_url}
                          alt={track.title}
                          width={200}
                          height={200}
                          style={{ 
                            width: '100%', 
                            height: isMobile ? '120px' : '100%', 
                            objectFit: 'cover', 
                            borderRadius: '8px' 
                          }}
                        />
                      ) : (
                <div style={{
                  width: '100%',
                          height: isMobile ? '120px' : '100%',
                          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: isMobile ? '1.5rem' : '2rem'
                        }}>
                          <Music size={isMobile ? 24 : 32} />
                        </div>
                      )}
                      {/* Play Button */}
                      <div 
                        className="play-button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handlePlayTrack(track);
                        }}
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: currentTrack?.id === track.id && isPlaying ? 'rgba(236, 72, 153, 0.9)' : 'rgba(0, 0, 0, 0.7)'
                        }}
                      >
                        {currentTrack?.id === track.id && isPlaying ? (
                          <Pause size={isMobile ? 16 : 20} />
                        ) : (
                          <Play size={isMobile ? 16 : 20} />
                        )}
                </div>
                      {/* Like Button */}
                      <div 
                        className="like-button"
                        onClick={(e) => handleLikeTrack(track, e)}
                        style={{ 
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          cursor: 'pointer',
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          zIndex: 10
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <Heart 
                          size={isMobile ? 12 : 16} 
                          style={{ 
                            color: likedTracks.has(track.id) ? '#EC4899' : 'white',
                            fill: likedTracks.has(track.id) ? '#EC4899' : 'none'
                          }}
                        />
                      </div>
                      {/* Share Button */}
                      <div 
                        className="share-button"
                        onClick={(e) => handleShareTrack(track, e)}
                        style={{ 
                          position: 'absolute',
                          top: '10px',
                          right: '50px',
                          cursor: 'pointer',
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          zIndex: 10
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <Share2 
                          size={16} 
                          style={{ 
                            color: 'white'
                          }} 
                        />
                      </div>
                    </div>
                                         <div style={{ fontWeight: '600', fontSize: isMobile ? '0.8rem' : 'inherit' }}>{track.title}</div>
                     <div style={{ color: '#999', fontSize: isMobile ? '0.7rem' : '0.9rem' }}>{track.creator?.display_name || 'Unknown Artist'}</div>
                    <div className="waveform"></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <span style={{ color: '#EC4899', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>{track.genre}</span>
                      <span style={{ color: '#999', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>{track.formatted_duration || '3:24'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Fallback content when trending content fails to load */}
                  <div style={{
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '2rem',
                  marginBottom: '2rem',
                  textAlign: 'center'
                }}>
                  <AlertCircle size={48} style={{ color: '#EC4899', marginBottom: '1rem' }} />
                  <h3 style={{ color: '#EC4899', marginBottom: '1rem' }}>Content Loading Issue</h3>
                  <p style={{ color: '#ccc', marginBottom: '1rem' }}>
                    We&apos;re having trouble loading trending content. This might be due to database connection issues.
                  </p>
                  <button 
                    onClick={() => {
                      setShowFallback(false);
                      getTrendingContent(20);
                    }} 
                    style={{
                      background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
                    }}
                  >
                    Try Again
                  </button>
                  </div>
                {renderEmptyState('music')}
              </>
            )}
          </>
        );

      case 'creators':
        return (
          <div className="grid grid-3">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card">
                  <div className="card-image">
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '2rem'
                    }}>
                      <User size={32} />
                    </div>
                    <div className="play-button">▶</div>
                  </div>
                  <div style={{ fontWeight: '600' }}>Loading...</div>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>Loading...</div>
                  <div className="stats">
                    <span>Loading...</span>
                    <span>Loading...</span>
                  </div>
                </div>
              ))
            ) : error ? (
              <div className="card" style={{ gridColumn: 'span 3', textAlign: 'center', padding: '2rem' }}>
                <AlertCircle size={48} style={{ color: '#DC2626', marginBottom: '1rem' }} />
                <h3 style={{ color: '#DC2626', marginBottom: '1rem' }}>Error Loading Creators</h3>
                <p style={{ color: '#ccc', marginBottom: '1rem' }}>{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  style={{
                    background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : creators.length > 0 ? (
              creators.map((creator) => (
                <Link key={creator.profile.id} href={`/creator/${creator.profile?.username || 'unknown'}`} style={{ textDecoration: 'none' }}>
                  <div className="card">
                    <div className="card-image">
                      {creator.profile.avatar_url ? (
                        <Image
                          src={creator.profile.avatar_url}
                          alt={creator.profile.display_name || 'Creator'}
                          width={60}
                          height={60}
                          style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '2rem'
                        }}>
                          {creator.profile.display_name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="play-button">▶</div>
                    </div>
                    <div style={{ fontWeight: '600' }}>{creator.profile.display_name}</div>
                    <div style={{ color: '#999', fontSize: '0.9rem' }}>
                      {creator.profile.location || 'Location not set'}
                    </div>
                    <div className="stats">
                      <span>{creator.stats.followers_count.toLocaleString()} followers</span>
                      <span>{creator.stats.tracks_count} tracks</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              renderEmptyState('creators')
            )}
          </div>
        );

      case 'events':
        return (
          <div className="grid grid-3">
            {trendingLoading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="event-card">
                  <div className="event-card-content">
                    <div style={{ fontSize: '0.9rem', color: '#EC4899' }}>Loading...</div>
                    <div style={{ fontWeight: '600', margin: '0.5rem 0' }}>Loading...</div>
                    <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Loading...</div>
                    <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#EC4899', padding: '0.25rem 0.5rem', borderRadius: '15px', fontSize: '0.8rem' }}>Loading...</span>
                      <span style={{ color: '#999', fontSize: '0.8rem' }}>Loading...</span>
                    </div>
                  </div>
                </div>
              ))
            ) : trendingError ? (
              <div className="card" style={{ gridColumn: 'span 3', textAlign: 'center', padding: '2rem' }}>
                <AlertCircle size={48} style={{ color: '#DC2626', marginBottom: '1rem' }} />
                <h3 style={{ color: '#DC2626', marginBottom: '1rem' }}>Error Loading Events</h3>
                <p style={{ color: '#ccc', marginBottom: '1rem' }}>{trendingError}</p>
                <button 
                  onClick={() => getTrendingContent(20)} 
                  style={{
                    background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : trendingResults?.events && trendingResults.events.length > 0 ? (
              trendingResults.events.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
                  <div className="event-card">
                    <div className="event-card-content">
                      <div style={{ fontSize: '0.9rem', color: '#EC4899' }}>{event.formatted_date}</div>
                      <div style={{ fontWeight: '600', margin: '0.5rem 0' }}>{event.title}</div>
                      <div style={{ color: '#ccc', fontSize: '0.9rem' }}>{event.location}</div>
                      <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#EC4899', padding: '0.25rem 0.5rem', borderRadius: '15px', fontSize: '0.8rem' }}>{event.formatted_price}</span>
                        <span style={{ color: '#999', fontSize: '0.8rem' }}>{event.attendee_count?.toLocaleString() || 0} attending</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              renderEmptyState('events')
            )}
          </div>
        );

      case 'podcasts':
        return (
          <div className="grid grid-4">
            {trendingLoading ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card">
                  <div className="card-image">
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '2rem'
                    }}>
                      <Mic size={32} />
                    </div>
                    <div className="play-button">▶</div>
                  </div>
                  <div style={{ fontWeight: '600' }}>Loading...</div>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>Loading...</div>
                  <div style={{ color: '#EC4899', fontSize: '0.8rem', marginTop: '0.5rem' }}>Loading...</div>
                </div>
              ))
            ) : trendingError ? (
              <div className="card" style={{ gridColumn: 'span 4', textAlign: 'center', padding: '2rem' }}>
                <AlertCircle size={48} style={{ color: '#DC2626', marginBottom: '1rem' }} />
                <h3 style={{ color: '#DC2626', marginBottom: '1rem' }}>Error Loading Podcasts</h3>
                <p style={{ color: '#ccc', marginBottom: '1rem' }}>{trendingError}</p>
                <button 
                  onClick={() => getTrendingContent(20)} 
                  style={{
                    background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : trendingResults?.podcasts && trendingResults.podcasts.length > 0 ? (
              trendingResults.podcasts.map((podcast) => (
                <div key={podcast.id} className="card" style={{ cursor: 'pointer' }}>
                  <div className="card-image" style={{ position: 'relative' }}>
                    {podcast.cover_art_url ? (
                      <Image
                        src={podcast.cover_art_url}
                        alt={podcast.title}
                        width={200}
                        height={200}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '2rem'
                      }}>
                        <Mic size={32} />
                      </div>
                    )}
                    {/* Play Button */}
                    <div 
                      className="play-button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePlayTrack(podcast);
                      }}
                      style={{ 
                        cursor: 'pointer',
                        backgroundColor: currentTrack?.id === podcast.id && isPlaying ? 'rgba(236, 72, 153, 0.9)' : 'rgba(0, 0, 0, 0.7)'
                      }}
                    >
                      {currentTrack?.id === podcast.id && isPlaying ? (
                        <Pause size={20} />
                      ) : (
                        <Play size={20} />
                      )}
                    </div>
                    {/* Like Button */}
                    <div 
                      className="like-button"
                      onClick={(e) => handleLikeTrack(podcast, e)}
                      style={{ 
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        cursor: 'pointer',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        zIndex: 10
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <Heart 
                        size={16} 
                        style={{ 
                          color: likedTracks.has(podcast.id) ? '#EC4899' : 'white',
                          fill: likedTracks.has(podcast.id) ? '#EC4899' : 'none'
                        }} 
                      />
                    </div>
                    {/* Share Button */}
                    <div 
                      className="share-button"
                      onClick={(e) => handleShareTrack(podcast, e)}
                      style={{ 
                        position: 'absolute',
                        top: '10px',
                        right: '50px',
                        cursor: 'pointer',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        zIndex: 10
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <Share2 
                        size={16} 
                        style={{ 
                          color: 'white'
                        }} 
                      />
                    </div>
                  </div>
                  <div style={{ fontWeight: '600' }}>{podcast.title}</div>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>{podcast.creator?.display_name || 'Unknown Creator'}</div>
                  <div style={{ color: '#EC4899', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    {podcast.formatted_duration} • {podcast.formatted_play_count} plays
                  </div>
                </div>
              ))
            ) : (
              renderEmptyState('podcasts')
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Mobile horizontal scroll styles */}
      <style jsx global>{`
        .horizontal-scroll {
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: rgba(236, 72, 153, 0.5) transparent;
        }
        
        .horizontal-scroll::-webkit-scrollbar {
          height: 4px;
        }
        
        .horizontal-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .horizontal-scroll::-webkit-scrollbar-thumb {
          background: rgba(236, 72, 153, 0.5);
          border-radius: 2px;
        }
        
        .horizontal-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(236, 72, 153, 0.7);
        }
        
        .tab-navigation::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      {/* Main Content */}
      <main className="main-container">
        {!pageLoaded && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '2rem',
            background: 'rgba(255, 255, 255, 0.05)',
            margin: '1rem 2rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <Loader2 size={24} className="animate-spin" style={{ color: '#EC4899', marginRight: '0.5rem' }} />
            <span style={{ color: 'white' }}>Loading discover page...</span>
          </div>
        )}
        {/* Filters Button - Top Right */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          padding: '1rem 2rem 0',
          marginBottom: '1rem'
        }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              background: 'transparent',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Filter size={16} />
            Filters
          </button>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <section className="section">
            <AdvancedFilters
              categories={categories}
              genres={genres}
              locations={locations}
              dateRanges={dateRanges}
              priceRanges={priceRanges}
              sortOptions={sortOptions}
              selectedCategory={selectedCategory}
              selectedGenre={selectedGenre}
              selectedLocation={selectedLocation}
              selectedDate={selectedDate}
              selectedPrice={selectedPrice}
              sortBy={sortBy}
              onCategoryChange={setSelectedCategory}
              onGenreChange={setSelectedGenre}
              onLocationChange={setSelectedLocation}
              onDateChange={setSelectedDate}
              onPriceChange={setSelectedPrice}
              onSortChange={setSortBy}
              onClearFilters={handleClearFilters}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
            />
          </section>
        )}

        {/* Tab Navigation */}
        <section className="section">
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.5rem',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            flexWrap: 'nowrap',
            whiteSpace: 'nowrap'
          }} className="tab-navigation">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeTab === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(category.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    border: 'none',
                    background: isActive ? 'linear-gradient(45deg, #DC2626, #EC4899)' : 'rgba(255, 255, 255, 0.1)',
                    color: isActive ? 'white' : '#ccc',
                    fontSize: '0.9rem',
                    fontWeight: isActive ? '600' : '400',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    flexShrink: '0',
                    minWidth: 'fit-content'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = '#ccc';
                    }
                  }}
                >
                  <Icon size={16} />
                  {category.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          {renderContent()}
        </section>

        {/* Footer */}
        <Footer />
      </main>

      {/* Floating Quick Actions Card */}
      <FloatingCard title="Quick Actions">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'transparent',
              border: '1px solid white',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              width: '100%',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(45deg, #DC2626, #EC4899)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            >
              <Music size={18} color="white" />
              Upload Music
            </div>
          </Link>
          <div style={{
            background: 'transparent',
            border: '1px solid white',
            padding: '0.375rem 0.75rem',
            borderRadius: '8px',
            textAlign: 'center',
            cursor: 'pointer',
            color: 'white',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(45deg, #DC2626, #EC4899)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          >
            <Mic size={18} color="white" />
            Start Podcast
          </div>
          <div style={{
            background: 'transparent',
            border: '1px solid white',
            padding: '0.375rem 0.75rem',
            borderRadius: '8px',
            textAlign: 'center',
            cursor: 'pointer',
            color: 'white',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(45deg, #DC2626, #EC4899)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          >
            <Calendar size={18} color="white" />
            Create Event
          </div>
          <div style={{
            background: 'transparent',
            border: '1px solid white',
            padding: '0.375rem 0.75rem',
            borderRadius: '8px',
            textAlign: 'center',
            cursor: 'pointer',
            color: 'white',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(45deg, #DC2626, #EC4899)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          >
            <Users size={18} color="white" />
            Find Collaborators
          </div>
        </div>

        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Friends Activity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
          <div>John is listening to &quot;Praise Medley&quot;</div>
          <div>Sarah posted a new track</div>
          <div>Mike joined Gospel Night event</div>
        </div>
      </FloatingCard>

      {/* Share Modal */}
      {selectedTrackForShare && (
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
          content={{
            id: selectedTrackForShare.id,
            title: selectedTrackForShare.title,
            type: 'track' as const,
            creator: {
              name: selectedTrackForShare.creator?.display_name || 'Unknown Artist',
              username: selectedTrackForShare.creator?.username || 'unknown'
            },
            coverArt: selectedTrackForShare.cover_art_url,
            url: selectedTrackForShare.file_url
          }}
        />
      )}
    </>
  );
}
