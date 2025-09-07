'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAudioPlayer } from '@/src/contexts/AudioPlayerContext';
import { useSocial } from '@/src/hooks/useSocial';
import { usePersonalizedFeed } from '@/src/hooks/usePersonalizedFeed';
import { Footer } from '../src/components/layout/Footer';
import { FloatingCard } from '../src/components/ui/FloatingCard';
import { HomePageSEO } from '@/src/components/seo/HomePageSEO';
import { LogOut, User, Upload, Play, Pause, Heart, MessageCircle, Search, Bell, Settings, Home, Calendar, Mic, Users, Menu, X, Share2, Loader2, Star, Sparkles, MoreHorizontal, Link as LinkIcon } from 'lucide-react';
import ShareModal from '@/src/components/social/ShareModal';
import { ThemeToggle } from '@/src/components/ui/ThemeToggle';
import SearchDropdown from '@/src/components/search/SearchDropdown';

export default function HomePage() {
  const { user, signOut, loading, error: authError } = useAuth();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();
  const { toggleLike, isLiked } = useSocial();
  const { data: personalizedFeed, hasPersonalizedData } = usePersonalizedFeed();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [recentTracks, setRecentTracks] = React.useState<any[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = React.useState(true);
  const [likedTracks, setLikedTracks] = React.useState<Set<string>>(new Set());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedTrackForShare, setSelectedTrackForShare] = useState<any>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [hotCreators, setHotCreators] = useState<any[]>([]);
  const [hotCreatorsLoading, setHotCreatorsLoading] = useState(true);
  
  // Events state
  const [events, setEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  
  // Podcasts state
  const [podcasts, setPodcasts] = useState<any[]>([]);
  const [isLoadingPodcasts, setIsLoadingPodcasts] = useState(true);

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const mobileMenu = document.getElementById('mobile-menu');
      const mobileMenuButton = document.getElementById('mobile-menu-button');
      const userMenu = document.getElementById('user-menu');
      const userMenuButton = document.getElementById('user-menu-button');
      
      if (mobileMenu && mobileMenuButton && 
          !mobileMenu.contains(event.target as Node) && 
          !mobileMenuButton.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
      
      if (userMenu && userMenuButton && 
          !userMenu.contains(event.target as Node) && 
          !userMenuButton.contains(event.target as Node)) {
        userMenu.style.display = 'none';
      }

      // Close dropdown menus when clicking outside
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  // Fetch events - use personalized data if available, fallback to global
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoadingEvents(true);
        
        // Use personalized events if available and user is logged in
        if (personalizedFeed && personalizedFeed.events && personalizedFeed.events.length > 0) {
          console.log('🎯 Using personalized events data:', personalizedFeed.events.length);
          setEvents(personalizedFeed.events);
          setIsLoadingEvents(false);
          return;
        }
        
        // Fallback to global events
        const response = await fetch('/api/events?limit=4');
        
        if (response.ok) {
          const data = await response.json();
          console.log('📅 Events fetched:', data);
          setEvents(data.events || []);
        } else {
          console.error('Error fetching events:', response.statusText);
          setEvents([]);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [personalizedFeed]);

  // Fetch podcasts - use personalized data if available, fallback to global
  useEffect(() => {
    const fetchPodcasts = async () => {
      try {
        setIsLoadingPodcasts(true);
        
        // Use personalized podcasts if available and user is logged in
        if (personalizedFeed && personalizedFeed.podcasts && personalizedFeed.podcasts.length > 0) {
          console.log('🎯 Using personalized podcasts data:', personalizedFeed.podcasts.length);
          setPodcasts(personalizedFeed.podcasts);
          setIsLoadingPodcasts(false);
          return;
        }
        
        // Fallback to global podcasts
        console.log('🎙️ Fetching podcasts from API...');
        const response = await fetch('/api/podcasts/recent?limit=4');
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Podcasts API response:', data);
          setPodcasts(data.podcasts || []);
        } else {
          console.error('❌ API Error:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('❌ Error details:', errorText);
          setPodcasts([]);
        }
      } catch (error) {
        console.error('❌ Error loading podcasts:', error);
        setPodcasts([]);
      } finally {
        setIsLoadingPodcasts(false);
      }
    };

    fetchPodcasts();
  }, [personalizedFeed]);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}&limit=10`);
        if (response.ok) {
          const data = await response.json();
          console.log('Search results:', data);
          router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        } else {
          console.error('Search failed:', response.statusText);
          router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
      } catch (error) {
        console.error('Search error:', error);
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    }
  };

  const handlePlayTrack = (track: any) => {
    console.log('🎵 handlePlayTrack called with:', track);
    
    // Convert track data to AudioTrack format
    const audioTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist || track.creator?.name || 'Unknown Artist',
      album: '',
      duration: track.duration || 0,
      artwork: track.coverArt || '',
      url: track.url || '',
      liked: false
    };
    
    console.log('🎵 Converted to AudioTrack:', audioTrack);
    playTrack(audioTrack);
  };

  // Fetch hot creators - use personalized data if available, fallback to global
  useEffect(() => {
    const fetchHotCreators = async () => {
      try {
        setHotCreatorsLoading(true);
        
        // Use personalized creators if available and user is logged in
        if (personalizedFeed && personalizedFeed.creators && personalizedFeed.creators.length > 0) {
          console.log('🎯 Using personalized creators data:', personalizedFeed.creators.length);
          setHotCreators(personalizedFeed.creators);
          setHotCreatorsLoading(false);
          return;
        }
        
        // Fallback to global hot creators
        const response = await fetch('/api/creators/hot?limit=6');
        const data = await response.json();
        
        if (data.data) {
          setHotCreators(data.data);
        }
      } catch (error) {
        console.error('Error fetching hot creators:', error);
        setHotCreators([]);
      } finally {
        setHotCreatorsLoading(false);
      }
    };

    fetchHotCreators();
  }, [personalizedFeed]);

  const handleLikeTrack = async (track: any, e: React.MouseEvent) => {
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

        // Update the like count in recentTracks
        setRecentTracks(prevTracks => 
          prevTracks.map(t => {
            if (t.id === track.id) {
              const currentLikes = t.likes || 0;
              return {
                ...t,
                likes: isCurrentlyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1
              };
            }
            return t;
          })
        );
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleCopyLink = async (track: any) => {
    const trackUrl = `${window.location.origin}/track/${track.id}`;
    try {
      await navigator.clipboard.writeText(trackUrl);
      // You could add a toast notification here
      console.log('Link copied to clipboard');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
    setOpenDropdownId(null);
  };

  const handleShareTrack = (track: any) => {
    setSelectedTrackForShare(track);
    setShareModalOpen(true);
    setOpenDropdownId(null);
  };

  const toggleDropdown = (trackId: string) => {
    setOpenDropdownId(openDropdownId === trackId ? null : trackId);
  };

  // Format event date for display
  const formatEventDate = (eventDate: string) => {
    const date = new Date(eventDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today • ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else if (diffDays === 1) {
      return `Tomorrow • ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else {
      return `${date.toLocaleDateString('en-US', { weekday: 'long' })} • ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }
  };

  // Format event price for display
  const formatEventPrice = (event: any) => {
    if (event.price_gbp && event.price_gbp > 0) {
      return `£${event.price_gbp}`;
    } else if (event.price_ngn && event.price_ngn > 0) {
      return `₦${event.price_ngn.toLocaleString()}`;
    } else {
      return 'Free Entry';
    }
  };

  // Show loading state while auth is initializing (with timeout fallback)
  const [loadingTimeout, setLoadingTimeout] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      console.warn('Auth loading timeout - proceeding without auth');
      setLoadingTimeout(true);
    }, 3000); // 3 second timeout
    
    return () => clearTimeout(timer);
  }, []);

  // Load recent tracks - use personalized data if available, fallback to global
  React.useEffect(() => {
    const loadRecentTracks = async () => {
      try {
        console.log('🔄 Loading recent tracks...');
        setIsLoadingTracks(true);
        
        // Use personalized tracks if available and user is logged in
        if (personalizedFeed && personalizedFeed.music && personalizedFeed.music.length > 0) {
          console.log('🎯 Using personalized music data:', personalizedFeed.music.length);
          setRecentTracks(personalizedFeed.music);
          setIsLoadingTracks(false);
          return;
        }
        
        // Fallback to global recent tracks
        const response = await fetch('/api/audio/recent?t=' + Date.now());
        
        if (response.ok) {
          const result = await response.json();
          console.log('📊 API Response:', result);
          if (result.success && result.tracks) {
            console.log('✅ Setting tracks:', result.tracks.length);
            // Log each track's cover art status
            result.tracks.forEach((track: any, index: number) => {
              console.log(`Track ${index + 1}: "${track.title}" - Cover Art: ${track.coverArt ? 'Yes' : 'No'}`);
            });
            setRecentTracks(result.tracks);
          } else {
            console.log('❌ No tracks in response');
          }
        } else {
          console.error('❌ API Error:', response.status, response.statusText);
          console.error('❌ Response URL:', response.url);
          const errorText = await response.text();
          console.error('❌ Error response body:', errorText);
        }
      } catch (error) {
        console.error('❌ Error loading recent tracks:', error);
      } finally {
        setIsLoadingTracks(false);
      }
    };

    // Load tracks
    loadRecentTracks();
  }, [personalizedFeed]);

  // Check which tracks are liked by the current user
  React.useEffect(() => {
    const checkLikedTracks = async () => {
      if (!user || recentTracks.length === 0) return;

      try {
        const likedTrackIds = new Set<string>();
        
        for (const track of recentTracks) {
          const result = await isLiked(track.id, 'track');
          if (result.data) {
            likedTrackIds.add(track.id);
          }
        }
        
        setLikedTracks(likedTrackIds);
      } catch (error) {
        console.error('Error checking liked tracks:', error);
      }
    };

    checkLikedTracks();
  }, [user, recentTracks, isLiked]);

  // Show error state if auth failed
  if (authError) {
    return (
      <div style={{ 
        minHeight: '100vh',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
        color: 'white',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div>
          <h1 style={{ marginBottom: '1rem' }}>Authentication Error</h1>
          <p style={{ marginBottom: '1rem' }}>{authError}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading && !loadingTimeout) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
        color: 'white'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  try {
    return (
      <>
        <HomePageSEO />
        {/* Header */}
        <header className="header">
          {isMobile ? (
            /* Mobile Header - Apple Music Style */
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              width: '100%'
            }}>
              {/* LEFT - Hamburger Menu */}
              <button
                id="mobile-menu-button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <Menu size={24} color="white" />
              </button>

              {/* CENTER - Small Logo */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                flex: 1
              }}>
                <Image
                  src="/images/logos/logo-trans-lockup.png"
                  alt="SoundBridge Logo"
                  width={80}
                  height={22}
                  priority
                  style={{ height: 'auto' }}
                />
              </div>

              {/* RIGHT - Sign In / Profile */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {user ? (
                  <div style={{ position: 'relative' }}>
                    <button
                      id="user-menu-button"
                      onClick={(e) => {
                        e.preventDefault();
                        try {
                          const menu = document.getElementById('user-menu');
                          if (menu) {
                            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                          }
                        } catch (error) {
                          console.error('Error toggling user menu:', error);
                        }
                      }}
                      style={{
                        background: 'var(--bg-card)',
                        border: '2px solid var(--accent-primary)',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--hover-bg)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--bg-card)';
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                      }}
                    >
                      <User size={20} color="var(--accent-primary)" />
                    </button>
                    
                    <div
                      id="user-menu"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '0.5rem',
                        background: 'var(--bg-secondary)',
                        backdropFilter: 'blur(20px)',
                        border: '2px solid var(--accent-primary)',
                        borderRadius: '12px',
                        padding: '0.5rem',
                        minWidth: '200px',
                        display: 'none',
                        zIndex: 1000,
                        boxShadow: 'var(--shadow-lg)'
                      }}
                    >
                                             <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                         <div style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: '0.75rem',
                           padding: '0.75rem',
                           color: 'var(--text-primary)',
                           borderRadius: '8px',
                           transition: 'all 0.3s ease',
                           fontWeight: '500'
                         }}
                         onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                         >
                           <Home size={16} />
                           Dashboard
                         </div>
                       </Link>
                       <Link href="/notifications" style={{ textDecoration: 'none' }}>
                         <div style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: '0.75rem',
                           padding: '0.75rem',
                           color: 'var(--text-primary)',
                           borderRadius: '8px',
                           transition: 'all 0.3s ease',
                           fontWeight: '500'
                         }}
                         onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                         >
                           <Bell size={16} />
                           Notifications
                         </div>
                       </Link>
                       <Link href="/profile" style={{ textDecoration: 'none' }}>
                         <div style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: '0.75rem',
                           padding: '0.75rem',
                           color: 'var(--text-primary)',
                           borderRadius: '8px',
                           transition: 'all 0.3s ease',
                           fontWeight: '500'
                         }}
                         onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                         >
                           <User size={16} />
                           Profile
                         </div>
                       </Link>
                       <Link href="/settings" style={{ textDecoration: 'none' }}>
                         <div style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: '0.75rem',
                           padding: '0.75rem',
                           color: 'var(--text-primary)',
                           borderRadius: '8px',
                           transition: 'all 0.3s ease',
                           fontWeight: '500'
                         }}
                         onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                         >
                           <Settings size={16} />
                           Settings
                         </div>
                       </Link>
                      
                      {/* Theme Toggle */}
                      <ThemeToggle />
                      
                      <div style={{ height: '1px', background: 'var(--border-primary)', margin: '0.5rem 0' }}></div>
                      <button
                        onClick={handleSignOut}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          color: '#FCA5A5',
                          background: 'none',
                          border: 'none',
                          width: '100%',
                          textAlign: 'left',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <Link href="/login" style={{ textDecoration: 'none' }}>
                    <button 
                      style={{
                        background: 'none',
                        color: '#DC2626',
                        border: 'none',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '16px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      Sign In
                    </button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            /* Desktop Header - Original Style */
            <div className="navbar-main" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              width: '100%',
              gap: '1rem'
            }}>
              {/* LEFT SIDE */}
              <div className="navbar-left" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem',
                flexShrink: 0
              }}>
                <div className="logo">
                  <Image
                    src="/images/logos/logo-trans-lockup.png"
                    alt="SoundBridge Logo"
                    width={120}
                    height={32}
                    priority
                    style={{ height: 'auto' }}
                  />
                </div>
                {/* Desktop Navigation */}
                <nav className="nav" style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link href="/" className="active" style={{ 
                    textDecoration: 'none', 
                    color: 'var(--text-primary)',
                    transition: 'all 0.3s ease',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    For You
                  </Link>
                  <Link href="/discover" style={{ 
                    textDecoration: 'none', 
                    color: 'var(--text-primary)',
                    transition: 'all 0.3s ease',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Discover
                  </Link>
                  <Link href="/events" style={{ 
                    textDecoration: 'none', 
                    color: 'var(--text-primary)',
                    transition: 'all 0.3s ease',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Events
                  </Link>
                  <Link href="/creators" style={{ 
                    textDecoration: 'none', 
                    color: 'var(--text-primary)',
                    transition: 'all 0.3s ease',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Creators
                  </Link>
                </nav>
                
                {/* Spacer between navigation and search */}
                <div style={{ width: '0.25rem' }}></div>
              </div>

              {/* CENTER - Search Bar */}
              <div className="navbar-center">
                <SearchDropdown placeholder="Search creators, events, podcasts..." />
              </div>

              {/* RIGHT SIDE */}
              <div className="navbar-right" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                flexShrink: 0
              }}>
                {/* Upload Button */}
                <Link href="/upload" style={{ textDecoration: 'none' }}>
                  <button 
                    style={{
                      background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
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
                    <Upload size={16} />
                    Upload
                  </button>
                </Link>

                {/* User Menu */}
                {user ? (
                  <div style={{ position: 'relative' }}>
                    <button
                      id="user-menu-button"
                      onClick={(e) => {
                        e.preventDefault();
                        try {
                          const menu = document.getElementById('user-menu');
                          if (menu) {
                            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                          }
                        } catch (error) {
                          console.error('Error toggling user menu:', error);
                        }
                      }}
                      style={{
                        background: 'var(--bg-card)',
                        border: '2px solid var(--accent-primary)',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--hover-bg)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--bg-card)';
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                      }}
                    >
                      <User size={20} color="var(--accent-primary)" />
                    </button>
                    
                                         <div
                       id="user-menu"
                       style={{
                         position: 'absolute',
                         top: '100%',
                         right: 0,
                         marginTop: '0.5rem',
                         background: 'rgba(255, 255, 255, 0.05)',
                         backdropFilter: 'blur(20px)',
                         border: '1px solid rgba(255, 255, 255, 0.1)',
                         borderRadius: '12px',
                         padding: '0.5rem',
                         minWidth: '200px',
                         display: 'none',
                         zIndex: 1000,
                         boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                       }}
                     >
                       <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                         <div style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: '0.75rem',
                           padding: '0.75rem',
                           color: 'var(--text-primary)',
                           borderRadius: '8px',
                           transition: 'all 0.3s ease',
                           fontWeight: '500'
                         }}
                         onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                         >
                           <Home size={16} />
                           Dashboard
                         </div>
                       </Link>
                       <Link href="/notifications" style={{ textDecoration: 'none' }}>
                         <div style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: '0.75rem',
                           padding: '0.75rem',
                           color: 'var(--text-primary)',
                           borderRadius: '8px',
                           transition: 'all 0.3s ease',
                           fontWeight: '500'
                         }}
                         onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                         >
                           <Bell size={16} />
                           Notifications
                         </div>
                       </Link>
                       <Link href="/profile" style={{ textDecoration: 'none' }}>
                         <div style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: '0.75rem',
                           padding: '0.75rem',
                           color: 'var(--text-primary)',
                           borderRadius: '8px',
                           transition: 'all 0.3s ease',
                           fontWeight: '500'
                         }}
                         onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                         >
                           <User size={16} />
                           Profile
                         </div>
                       </Link>
                       <Link href="/settings" style={{ textDecoration: 'none' }}>
                         <div style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: '0.75rem',
                           padding: '0.75rem',
                           color: 'var(--text-primary)',
                           borderRadius: '8px',
                           transition: 'all 0.3s ease',
                           fontWeight: '500'
                         }}
                         onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                         >
                           <Settings size={16} />
                           Settings
                         </div>
                       </Link>
                      
                      {/* Theme Toggle */}
                      <ThemeToggle />
                      
                      <div style={{ height: '1px', background: 'var(--border-primary)', margin: '0.5rem 0' }}></div>
                      <button
                        onClick={handleSignOut}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          color: '#FCA5A5',
                          background: 'none',
                          border: 'none',
                          width: '100%',
                          textAlign: 'left',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '1rem' }}>
                                         <Link href="/login" style={{ textDecoration: 'none' }}>
                       <button 
                         style={{
                           background: 'transparent',
                           color: '#374151',
                           border: '1px solid #d1d5db',
                           padding: '0.75rem 1.5rem',
                           borderRadius: '12px',
                           cursor: 'pointer',
                           fontWeight: '600',
                           fontSize: '0.9rem',
                           transition: 'all 0.3s ease'
                         }}
                         onMouseEnter={(e) => {
                           e.currentTarget.style.background = '#f3f4f6';
                           e.currentTarget.style.borderColor = '#9ca3af';
                         }}
                         onMouseLeave={(e) => {
                           e.currentTarget.style.background = 'transparent';
                           e.currentTarget.style.borderColor = '#d1d5db';
                         }}
                       >
                         Sign in
                       </button>
                     </Link>
                    <Link href="/signup" style={{ textDecoration: 'none' }}>
                                             <button 
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
                        Sign up
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        {/* Mobile Menu Overlay - Apple Music Style */}
        {isMobile && isMobileMenuOpen && (
          <div
            id="mobile-menu"
            style={{
              position: 'fixed',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              background: 'rgba(0, 0, 0, 0.95)',
              backdropFilter: 'blur(20px)',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              padding: '1rem',
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            {/* Mobile Menu Header - Apple Music Style */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '2rem',
              padding: '1rem 0'
            }}>
              <div className="logo">
                <Image
                  src="/images/logos/logo-trans-lockup.png"
                  alt="SoundBridge Logo"
                  width={100}
                  height={28}
                  priority
                  style={{ height: 'auto' }}
                />
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              >
                <X size={16} color="white" />
              </button>
            </div>

            {/* Mobile Search Bar - Apple Music Style */}
            <div style={{ 
              marginBottom: '2rem',
              position: 'relative'
            }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#999', zIndex: 1 }} />
              <input 
                type="search" 
                placeholder="Search creators, events, podcasts..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                style={{ 
                  width: '100%', 
                  padding: '16px 16px 16px 48px',
                  fontSize: '16px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }} 
                onFocus={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.12)'}
                onBlur={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.08)'}
              />
            </div>

            {/* Mobile Navigation - Apple Music Style */}
            <nav style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.5rem',
              marginBottom: '2rem'
            }}>
              <Link 
                href="/" 
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ 
                  textDecoration: 'none', 
                  color: 'white',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  fontSize: '17px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
              >
                <Home size={20} style={{ color: '#DC2626' }} />
                For You
              </Link>
              <Link 
                href="/discover" 
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ 
                  textDecoration: 'none', 
                  color: 'white',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  fontSize: '17px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
              >
                <Search size={20} style={{ color: '#EC4899' }} />
                Discover
              </Link>
              <Link 
                href="/events" 
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ 
                  textDecoration: 'none', 
                  color: 'white',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  fontSize: '17px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
              >
                <Calendar size={20} style={{ color: '#F97316' }} />
                Events
              </Link>
              <Link 
                href="/creators" 
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ 
                  textDecoration: 'none', 
                  color: 'white',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  fontSize: '17px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
              >
                <Users size={20} style={{ color: '#10B981' }} />
                Creators
              </Link>
            </nav>

            {/* Mobile Action Buttons - Apple Music Style */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.5rem',
              marginBottom: '2rem'
            }}>
              <Link 
                href="/upload" 
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ textDecoration: 'none' }}
              >
                <div 
                  style={{
                    width: '100%',
                    background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                    color: 'white',
                    border: 'none',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '17px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <Upload size={20} />
                  Upload Content
                </div>
              </Link>
            </div>

            {/* Mobile User Section - Apple Music Style */}
            {user ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '16px 20px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    background: 'linear-gradient(135deg, #dc2626 0%, #ec4899 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <User size={18} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: 'white' }}>
                      {user.email}
                    </div>
                    <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                      Signed in
                    </div>
                  </div>
                </div>
                
                <Link 
                  href="/dashboard" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 20px',
                    color: 'white',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    fontSize: '17px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                  >
                    <Home size={20} style={{ color: '#DC2626' }} />
                    Dashboard
                  </div>
                </Link>
                
                <Link 
                  href="/shares" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 20px',
                    color: 'white',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    fontSize: '17px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                  >
                    <Share2 size={20} style={{ color: '#3B82F6' }} />
                    Shared Content
                  </div>
                </Link>
                
                <button
                  onClick={(e) => {
                    setIsMobileMenuOpen(false);
                    handleSignOut(e);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 20px',
                    color: '#FCA5A5',
                    background: 'rgba(220, 38, 38, 0.08)',
                    border: 'none',
                    borderRadius: '12px',
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '17px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.12)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)'}
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <Link 
                  href="/login" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ textDecoration: 'none' }}
                >
                  <div 
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'white',
                      border: 'none',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '17px',
                      transition: 'all 0.2s ease',
                      textAlign: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                  >
                    Sign in
                  </div>
                </Link>
                <Link 
                  href="/signup" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ textDecoration: 'none' }}
                >
                  <div 
                    style={{
                      width: '100%',
                      background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                      color: 'white',
                      border: 'none',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '17px',
                      transition: 'all 0.2s ease',
                      textAlign: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    Sign up
                  </div>
                </Link>
              </div>
            )}
          </div>
        )}

                {/* Main Content */}
        <main style={{
          padding: isMobile ? '1rem' : '2rem',
          paddingBottom: isMobile ? '6rem' : '7rem',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
        {/* Hero Section */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
          gap: isMobile ? '1rem' : '2rem',
          marginBottom: isMobile ? '2rem' : '3rem',
          height: isMobile ? 'auto' : '400px'
        }}>
          <Link href="/creator/kwame-asante" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.8), rgba(236, 72, 153, 0.6)), url("https://picsum.photos/800/400?random=hero")',
              backgroundSize: 'cover',
              borderRadius: '20px',
              padding: isMobile ? '1.5rem' : '2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              position: 'relative',
              overflow: 'hidden',
              minHeight: isMobile ? '300px' : '400px'
            }}>
              <div style={{
                position: 'relative',
                zIndex: 2
              }}>
                <h2 className={isMobile ? "heading-4 text-display" : "heading-2 text-display"} style={{ 
                  marginBottom: '0.5rem',
                  color: 'white'
                }}>Featured Creator: Kwame Asante</h2>
                <p className={isMobile ? "text-base text-body" : "text-large text-body"} style={{ 
                  color: '#ccc',
                  marginBottom: '1rem'
                }}>Afrobeats sensation taking UK by storm!</p>
                <div style={{ 
                  display: 'flex', 
                  gap: isMobile ? '0.5rem' : '1rem', 
                  marginTop: '1rem',
                  flexWrap: isMobile ? 'wrap' : 'nowrap'
                }}>
                  <button 
                    style={{
                      background: 'linear-gradient(45deg, #DC2626, #EC4899, #F97316)',
                      color: 'white',
                      border: 'none',
                      padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: isMobile ? '0.8rem' : '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)',
                      transform: 'translateY(0)'
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
                    <Play size={isMobile ? 14 : 16} />
                    Play Latest
                  </button>
                  <button 
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: isMobile ? '0.8rem' : '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.3s ease',
                      transform: 'translateY(0)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <Heart size={isMobile ? 14 : 16} />
                    Follow
                  </button>
                  <button 
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: isMobile ? '0.8rem' : '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.3s ease',
                      transform: 'translateY(0)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <MessageCircle size={isMobile ? 14 : 16} />
                    Message
                  </button>
                </div>
              </div>
            </div>
          </Link>
          <div style={{
            background: 'var(--card-bg)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: isMobile ? '1rem' : '1.5rem',
            border: '1px solid var(--border-color)',
            display: isMobile ? 'none' : 'block'
          }}>
                            <h3 className="heading-5 text-display" style={{ marginBottom: '1rem', color: '#EC4899' }}>Trending Now</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '50px', height: '50px', background: '#333', borderRadius: '8px' }}></div>
                <div>
                  <div style={{ fontWeight: '600' }}>Gospel Fusion</div>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>Ada Grace</div>
                </div>
                <button 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#DC2626', 
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: 'scale(1)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Play size={20} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '50px', height: '50px', background: '#333', borderRadius: '8px' }}></div>
                <div>
                  <div style={{ fontWeight: '600' }}>Lagos Nights</div>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>DJ Emeka</div>
                </div>
                <button 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#DC2626', 
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: 'scale(1)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Play size={20} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Recently Added Music - PERSONALIZED */}
        <section className="section">
          <div className="section-header">
            <h2 className="heading-3 text-display">
              {hasPersonalizedData && user ? (
                <>
                  Your Personalized Music
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: '#EC4899', 
                    marginLeft: '0.5rem',
                    background: 'rgba(236, 72, 153, 0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontWeight: '500'
                  }}>
                    <Sparkles size={12} style={{ marginRight: '4px' }} />
                    Personalized
                  </span>
                </>
              ) : (
                'Recently Added Music'
              )}
            </h2>
            <Link href="/discover?tab=music" className="view-all">View All</Link>
          </div>
          
          

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: isMobile ? '0.75rem' : '1rem',
            maxWidth: '100%'
          }}>
            {isLoadingTracks ? (
              // Loading state
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="modern-music-card">
                  <div className="card-image-container" style={{ background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255, 255, 255, 0.3)', borderRadius: '50%', borderTopColor: 'white', animation: 'spin 1s linear infinite' }}></div>
                  </div>
                  <div className="card-content">
                    <div style={{ fontWeight: '600', background: '#333', height: '16px', borderRadius: '4px', marginBottom: '0.5rem' }}></div>
                    <div style={{ color: '#999', fontSize: '0.9rem', background: '#333', height: '14px', borderRadius: '4px', width: '60%' }}></div>
                  </div>
                  <div className="waveform-visual">
                    <div className="waveform-bar" style={{ height: '20%' }}></div>
                    <div className="waveform-bar" style={{ height: '60%' }}></div>
                    <div className="waveform-bar" style={{ height: '40%' }}></div>
                    <div className="waveform-bar" style={{ height: '80%' }}></div>
                  </div>
                </div>
              ))
            ) : recentTracks.length > 0 ? (
              // REAL TRACKS FROM DATABASE - REDESIGNED CARDS
              recentTracks.map((track) => (
                <div key={track.id} className="modern-music-card">
                  {/* Card Image Container */}
                  <div className="card-image-container">
                    {track.coverArt ? (
                      <Image
                        src={track.coverArt}
                        alt={track.title}
                        width={200}
                        height={200}
                        className="card-cover-image"
                      />
                    ) : (
                      <div className="card-placeholder">
                        <Mic size={32} style={{ opacity: 0.8 }} />
                        <div className="placeholder-text">
                          {track.title ? track.title.substring(0, 20) + (track.title.length > 20 ? '...' : '') : 'No Cover'}
                        </div>
                      </div>
                    )}
                    
                    {/* Overlay with Play Button */}
                    <div className="card-overlay">
                      <button 
                        className="play-button-overlay"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handlePlayTrack(track);
                        }}
                      >
                        {currentTrack?.id === track.id && isPlaying ? (
                          <Pause size={24} />
                        ) : (
                          <Play size={24} />
                        )}
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="card-actions-overlay">
                      {/* Like Button */}
                      <button 
                        className="action-button like-button"
                        onClick={(e) => handleLikeTrack(track, e)}
                        title="Like track"
                      >
                        <Heart 
                          size={16} 
                          style={{ 
                            color: likedTracks.has(track.id) ? '#EC4899' : 'white',
                            fill: likedTracks.has(track.id) ? '#EC4899' : 'none'
                          }} 
                        />
                      </button>
                      
                      {/* Three Dots Menu */}
                      <div className="dropdown-container" style={{ position: 'relative' }}>
                        <button 
                          className="action-button menu-button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleDropdown(track.id);
                          }}
                          title="More options"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        
                        {/* Apple Music-style Dropdown */}
                        {openDropdownId === track.id && (
                          <div className="dropdown-menu open">
                            <button 
                              className="dropdown-item"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCopyLink(track);
                              }}
                            >
                              <LinkIcon className="dropdown-icon" />
                              Copy Link
                            </button>
                            <button 
                              className="dropdown-item"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleShareTrack(track);
                              }}
                            >
                              <Share2 className="dropdown-icon" />
                              Share
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="card-content">
                    <h3 className="track-title">
                      {track.title || 'Untitled Track'}
                    </h3>
                    <p className="track-artist">
                      {track.artist || track.creator?.name || 'Unknown Artist'}
                    </p>
                    <div className="track-stats">
                      <span className="stat-item">
                        <Play size={12} />
                        {track.plays || 0}
                      </span>
                      <span className="stat-item">
                        <Heart size={12} />
                        {track.likes || 0}
                      </span>
                    </div>
                  </div>

                  {/* Waveform Visual */}
                  <div className="waveform-visual">
                    <div className="waveform-bar" style={{ height: '20%' }}></div>
                    <div className="waveform-bar" style={{ height: '60%' }}></div>
                    <div className="waveform-bar" style={{ height: '40%' }}></div>
                    <div className="waveform-bar" style={{ height: '80%' }}></div>
                    <div className="waveform-bar" style={{ height: '30%' }}></div>
                    <div className="waveform-bar" style={{ height: '70%' }}></div>
                    <div className="waveform-bar" style={{ height: '50%' }}></div>
                    <div className="waveform-bar" style={{ height: '90%' }}></div>
                  </div>
                </div>
              ))
            ) : (
              // No tracks state
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#999' }}>
                <Mic size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>No recent tracks available</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  <Link href="/upload" style={{ color: '#EC4899', textDecoration: 'none' }}>
                    Be the first to upload a track →
                  </Link>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Hot Creators */}
        <section className="section">
          <div className="section-header">
            <h2 className="heading-3 text-display">
              {hasPersonalizedData && user ? (
                <>
                  Creators You&apos;ll Love
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: '#EC4899', 
                    marginLeft: '0.5rem',
                    background: 'rgba(236, 72, 153, 0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontWeight: '500'
                  }}>
                    <Sparkles size={12} style={{ marginRight: '4px' }} />
                    Personalized
                  </span>
                </>
              ) : (
                'Hot Creators Right Now'
              )}
            </h2>
            <Link href="/creators?sortBy=hot" className="view-all">View All</Link>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: isMobile ? '1rem' : '1.5rem'
          }}>
            {hotCreatorsLoading ? (
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
                      color: '#666'
                    }}>
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                  </div>
                  <div style={{ fontWeight: '600', color: '#666' }}>Loading...</div>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>Loading...</div>
                  <div className="stats">
                    <span style={{ color: '#666' }}>...</span>
                    <span style={{ color: '#666' }}>...</span>
                  </div>
                </div>
              ))
            ) : hotCreators.length > 0 ? (
              hotCreators.map((creator) => (
                <Link 
                  key={creator.id} 
                  href={`/creator/${creator.username}`} 
                  style={{ textDecoration: 'none' }}
                >
                  <div className="card">
                    <div className="card-image">
                      {creator.avatar_url ? (
                        <Image
                          src={creator.avatar_url}
                          alt={creator.display_name}
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
                          fontSize: '2rem',
                          fontWeight: '600'
                        }}>
                          {creator.display_name?.substring(0, 2).toUpperCase() || 'C'}
                        </div>
                      )}
                      <div className="play-button">
                        <Play size={20} />
                      </div>
                      {/* Hot Score Badge */}
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                      }}>
                        🔥 {creator.hot_score}
                      </div>
                    </div>
                    <div style={{ fontWeight: '600' }}>{creator.display_name}</div>
                    <div style={{ color: '#999', fontSize: '0.9rem' }}>
                      {creator.genre ? `${creator.genre} • ` : ''}
                      {creator.location || 'Location not set'}
                      {creator.content_types && (
                        <span style={{ marginLeft: '0.5rem' }}>
                          {creator.content_types.has_music && creator.content_types.has_podcasts && '🎵🎙️'}
                          {creator.content_types.has_music && !creator.content_types.has_podcasts && '🎵'}
                          {!creator.content_types.has_music && creator.content_types.has_podcasts && '🎙️'}
                        </span>
                      )}
                    </div>
                    <div className="stats">
                      <span>{creator.followers_count?.toLocaleString() || 0} followers</span>
                      <span>{creator.tracks_count || 0} tracks</span>
                      {creator.recent_tracks_count > 0 && (
                        <span style={{ color: '#EC4899', fontSize: '0.8rem' }}>
                          +{creator.recent_tracks_count} recent
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              // Empty state
              <div className="card" style={{ gridColumn: 'span 3', textAlign: 'center', padding: '2rem' }}>
                <div style={{ color: '#EC4899', marginBottom: '1rem' }}>
                  <Star size={48} style={{ opacity: 0.5 }} />
                </div>
                <h3 style={{ color: '#EC4899', marginBottom: '1rem' }}>No Hot Creators Yet</h3>
                <p style={{ color: '#ccc', marginBottom: '1rem' }}>
                  Be the first to upload amazing content and become a hot creator!
                </p>
                <Link href="/upload" style={{ textDecoration: 'none' }}>
                  <button style={{ 
                    background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}>
                    Start Creating
                  </button>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Live Events This Week */}
        <section className="section">
          <div className="section-header">
            <h2 className="heading-3 text-display">
              {hasPersonalizedData && user ? (
                <>
                  Events Near You
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: '#EC4899', 
                    marginLeft: '0.5rem',
                    background: 'rgba(236, 72, 153, 0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontWeight: '500'
                  }}>
                    <Sparkles size={12} style={{ marginRight: '4px' }} />
                    Personalized
                  </span>
                </>
              ) : (
                'Live Events This Week'
              )}
            </h2>
            <Link href="/events" className="view-all">View All</Link>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: isMobile ? '1rem' : '1.5rem'
          }}>
            {isLoadingEvents ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#999' }}>
                <Loader2 size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>Loading events...</p>
              </div>
            ) : events.length > 0 ? (
                             events.map((event) => {
                               console.log('🎯 Rendering event:', event.title, 'Image URL:', event.image_url);
                               return (
                 <Link key={event.id} href={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
                   <div 
                     className="event-card"
                     style={{
                       background: event.image_url 
                         ? `linear-gradient(135deg, rgba(220, 38, 38, 0.3), rgba(236, 72, 153, 0.3)), url('${event.image_url}')`
                         : `linear-gradient(135deg, rgba(220, 38, 38, 0.8), rgba(236, 72, 153, 0.6)), url("https://picsum.photos/400/300?random=${event.id}")`,
                       backgroundSize: 'cover',
                       backgroundPosition: 'center'
                     }}
                   >
                     <div className="event-card-content">
                       <div style={{ fontSize: '0.9rem', color: '#EC4899' }}>{formatEventDate(event.event_date)}</div>
                       <div style={{ fontWeight: '600', margin: '0.5rem 0' }}>{event.title}</div>
                       <div style={{ color: '#ccc', fontSize: '0.9rem' }}>{event.location}</div>
                       <div style={{ marginTop: '0.5rem' }}>
                         <span style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#EC4899', padding: '0.25rem 0.5rem', borderRadius: '15px', fontSize: '0.8rem' }}>{formatEventPrice(event)}</span>
                       </div>
                     </div>
                   </div>
                 </Link>
               );
                             })
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#999' }}>
                <p>No upcoming events</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  <Link href="/events" style={{ color: '#EC4899', textDecoration: 'none' }}>
                    View all events →
                  </Link>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Trending Podcasts */}
        <section className="section">
          <div className="section-header">
            <h2 className="heading-3 text-display">
              {hasPersonalizedData && user ? (
                <>
                  Podcasts for You
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: '#EC4899', 
                    marginLeft: '0.5rem',
                    background: 'rgba(236, 72, 153, 0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontWeight: '500'
                  }}>
                    <Sparkles size={12} style={{ marginRight: '4px' }} />
                    Personalized
                  </span>
                </>
              ) : (
                'Trending Podcasts'
              )}
            </h2>
            <Link href="/search?tab=podcasts" className="view-all">View All</Link>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: isMobile ? '1rem' : '1.5rem'
          }}>
            {isLoadingPodcasts ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#999' }}>
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p>Loading podcasts...</p>
              </div>
            ) : podcasts && podcasts.length > 0 ? (
              podcasts.map((podcast) => (
                <div key={podcast.id} className="card" style={{ cursor: 'pointer' }} onClick={() => {
                  // Convert podcast to AudioTrack format
                  const audioTrack = {
                    id: podcast.id,
                    title: podcast.title,
                    artist: podcast.creator_name || 'Unknown Creator',
                    album: '',
                    duration: podcast.duration || 0,
                    artwork: podcast.cover_art_url || '',
                    url: podcast.file_url || '',
                    liked: false
                  };
                  console.log('🎙️ Playing podcast:', audioTrack);
                  console.log('🎙️ Audio URL:', audioTrack.url);
                  playTrack(audioTrack);
                }}>
                  <div className="card-image">
                    {podcast.cover_art_url ? (
                      <Image
                        src={podcast.cover_art_url}
                        alt={podcast.title}
                        width={200}
                        height={200}
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      />
                    ) : (
                      <div style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.9rem'
                      }}>
                        Podcast Cover
                      </div>
                    )}
                    <div className="play-button">
                      <Play size={20} />
                    </div>
                  </div>
                  <div style={{ fontWeight: '600' }}>{podcast.title}</div>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>{podcast.creator_name}</div>
                  <div style={{ color: '#EC4899', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    {podcast.formatted_duration} • {podcast.formatted_play_count} plays
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#999' }}>
                <p>No podcasts available</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  <Link href="/podcast/upload" style={{ color: '#EC4899', textDecoration: 'none' }}>
                    Start your first podcast →
                  </Link>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </main>

      {/* Floating Quick Actions Card */}
      <FloatingCard title="Quick Actions" position="top-right">
        {/* Personalized Feed Status */}
        {user && (
          <div style={{ 
            marginBottom: '1rem',
            padding: '0.75rem',
            background: hasPersonalizedData ? 'rgba(236, 72, 153, 0.1)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${hasPersonalizedData ? 'rgba(236, 72, 153, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            {hasPersonalizedData ? (
              <>
                <div style={{ color: '#EC4899', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Sparkles size={12} />
                  Personalized Feed Active
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
                  Content tailored to your preferences
                </div>
              </>
            ) : (
              <>
                <div style={{ color: '#999', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  📋 Generic Feed
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem' }}>
                  Complete onboarding for personalized content
                </div>
              </>
            )}
          </div>
        )}
        
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
              <Upload size={18} color="white" />
              Upload Music
            </div>
          </Link>
          <Link href="/podcast/upload" style={{ textDecoration: 'none' }}>
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
              <Mic size={18} color="white" />
              Start Podcast
            </div>
          </Link>
          <Link href="/events/create" style={{ textDecoration: 'none' }}>
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
              <Calendar size={18} color="white" />
              Create Event
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
      {shareModalOpen && selectedTrackForShare && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setSelectedTrackForShare(null);
          }}
          content={{
            id: selectedTrackForShare.id,
            title: selectedTrackForShare.title,
            type: 'track',
            creator: {
              name: selectedTrackForShare.artist || selectedTrackForShare.creator?.name || 'Unknown Artist',
              username: selectedTrackForShare.creator?.username || 'unknown'
            },
            coverArt: selectedTrackForShare.coverArt,
            url: selectedTrackForShare.url
          }}
        />
      )}
    </>
  );
  } catch (error) {
    console.error('Error in HomePage component:', error);
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
        color: 'white',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div>
          <h1 style={{ marginBottom: '1rem' }}>Something went wrong</h1>
          <p>Please refresh the page or try again later.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
}
