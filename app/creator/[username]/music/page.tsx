'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAudioPlayer } from '@/src/contexts/AudioPlayerContext';
import { getCreatorTracks } from '@/src/lib/creator';
import type { AudioTrack } from '@/src/lib/types/creator';
import { Footer } from '@/src/components/layout/Footer';
import { ThemeToggle } from '@/src/components/ui/ThemeToggle';
import SearchDropdown from '@/src/components/search/SearchDropdown';
import { 
  ArrowLeft, 
  Music, 
  Play, 
  Pause, 
  Heart, 
  Share2, 
  MoreHorizontal,
  Loader2,
  AlertCircle,
  Copy,
  User,
  Upload,
  Bell,
  Settings,
  Home,
  Calendar,
  Mic,
  Users,
  Menu,
  X,
  LogOut
} from 'lucide-react';

interface MusicPageProps {
  params: Promise<{ username: string }>;
}

export default function MusicPage({ params }: MusicPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ username: string } | null>(null);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [copiedTrackId, setCopiedTrackId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const { user, signOut } = useAuth();
  const audioPlayer = useAudioPlayer();
  const router = useRouter();

  // Safely destructure audio player with fallbacks
  const playTrack = audioPlayer?.playTrack || (() => console.warn('Audio player not available'));
  const currentTrack = audioPlayer?.currentTrack || null;
  const isPlaying = audioPlayer?.isPlaying || false;

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global error handler for script errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      // Don't set error state for script errors that don't affect our functionality
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Don't set error state for unhandled rejections that don't affect our functionality
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);


  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setResolvedParams(resolved);
    };
    resolveParams();
  }, [params]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenuId) {
        const target = event.target as Element;
        // Don't close if clicking inside the dropdown menu
        if (!target.closest('.dropdown-menu')) {
          console.log('Clicking outside dropdown, closing menu');
          setActiveMenuId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuId]);

  useEffect(() => {
    if (!resolvedParams) return;

    const loadTracks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Loading tracks for username:', resolvedParams.username);
        
        // Add a timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`/api/creator/${resolvedParams.username}/tracks`, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API response:', data);
        
        if (data.success && Array.isArray(data.data)) {
          // Sort by release date (created_at) with latest on top
          const sortedTracks = data.data.sort((a: AudioTrack, b: AudioTrack) => 
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          );
          console.log('Sorted tracks:', sortedTracks);
          setTracks(sortedTracks);
        } else {
          console.error('API returned error or invalid data:', data);
          setError(data.error || 'Failed to load tracks - invalid response');
        }
      } catch (err) {
        console.error('Error loading tracks:', err);
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            setError('Request timed out. Please try again.');
          } else {
            setError(`Failed to load tracks: ${err.message}`);
          }
        } else {
          setError('Failed to load tracks: Unknown error');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadTracks();
  }, [resolvedParams]);

  const handlePlayTrack = (track: AudioTrack) => {
    try {
      const audioTrack = {
        id: track.id,
        title: track.title,
        artist: track.creator?.display_name || 'Unknown Artist',
        album: '',
        duration: track.duration || 0,
        artwork: track.cover_art_url || '',
        url: track.file_url || '',
        liked: likedTracks.has(track.id)
      };
      
      console.log('Playing track:', audioTrack);
      playTrack(audioTrack);
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const handleLikeTrack = async (track: AudioTrack, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      alert('Please sign in to like tracks');
      return;
    }

    try {
      const response = await fetch('/api/social/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_id: track.id,
          content_type: 'track'
        }),
      });

      if (response.ok) {
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

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyTrackLink = async (track: AudioTrack) => {
    console.log('🚀 copyTrackLink function called with track:', track);
    try {
      // Always use the public track page URL from soundbridge.live
      const trackUrl = `https://soundbridge.live/track/${track.id}`;
      
      console.log('Attempting to copy:', trackUrl);
      
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(trackUrl);
          console.log('✅ Copied using modern clipboard API:', trackUrl);
        } catch (clipboardError) {
          console.warn('Modern clipboard failed, trying fallback:', clipboardError);
          throw clipboardError; // This will trigger the fallback
        }
      } else {
        // Fallback for older browsers or non-secure contexts
        console.log('Using fallback copy method');
        const textArea = document.createElement('textarea');
        textArea.value = trackUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          console.log('✅ Copied using fallback method:', trackUrl);
        } else {
          throw new Error('Fallback copy failed');
        }
      }
      
      // Show feedback immediately
      setCopiedTrackId(track.id);
      
      // Keep menu open for 1.5 seconds to show feedback, then close
      setTimeout(() => {
        setActiveMenuId(null);
        setCopiedTrackId(null);
      }, 1500);
      
    } catch (error) {
      console.error('❌ Failed to copy link:', error);
      
      // Still show visual feedback
      setCopiedTrackId(track.id);
      setTimeout(() => {
        setActiveMenuId(null);
        setCopiedTrackId(null);
      }, 1500);
    }
  };

  if (!resolvedParams) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Navbar */}
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
              <Link href="/" style={{ textDecoration: 'none' }}>
                <Image
                  src="/images/logos/logo-trans-lockup.png"
                  alt="SoundBridge Logo"
                  width={80}
                  height={22}
                  priority
                  style={{ height: 'auto' }}
                />
              </Link>
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
                        transition: 'all 0.3s ease',
                        fontWeight: '500'
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
                <>
                  <Link href="/login" style={{ textDecoration: 'none' }}>
                    <button style={{
                      background: 'transparent',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.8rem',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Sign in
                    </button>
                  </Link>
                  <Link href="/signup" style={{ textDecoration: 'none' }}>
                    <button style={{
                      background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.8rem',
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
                      Sign up
                    </button>
                  </Link>
                </>
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
                <Link href="/" style={{ textDecoration: 'none' }}>
                  <Image
                    src="/images/logos/logo-trans-lockup.png"
                    alt="SoundBridge Logo"
                    width={120}
                    height={32}
                    priority
                    style={{ height: 'auto' }}
                  />
                </Link>
              </div>
              {/* Desktop Navigation */}
              <nav className="nav" style={{ display: 'flex', gap: '0.5rem' }}>
                <Link href="/" style={{ 
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
                        transition: 'all 0.3s ease',
                        fontWeight: '500'
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
                <>
                  <Link href="/login" style={{ textDecoration: 'none' }}>
                    <button style={{
                      background: 'transparent',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.8rem',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Sign in
                    </button>
                  </Link>
                  <Link href="/signup" style={{ textDecoration: 'none' }}>
                    <button style={{
                      background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.8rem',
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
                      Sign up
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">All Music</h1>
            <p className="text-gray-400">by {resolvedParams.username}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
            <span className="ml-2 text-gray-400">Loading tracks...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Error Loading Music</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <div className="space-x-4">
              <button
                onClick={() => {
                  setError(null);
                  setRetryCount(prev => prev + 1);
                  // Trigger a reload of tracks
                  if (resolvedParams) {
                    const loadTracks = async () => {
                      try {
                        setIsLoading(true);
                        setError(null);
                        
                        const response = await fetch(`/api/creator/${resolvedParams.username}/tracks`);
                        
                        if (!response.ok) {
                          throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        
                        const data = await response.json();
                        
                        if (data.success && Array.isArray(data.data)) {
                          const sortedTracks = data.data.sort((a: AudioTrack, b: AudioTrack) => 
                            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                          );
                          setTracks(sortedTracks);
                        } else {
                          setError(data.error || 'Failed to load tracks - invalid response');
                        }
                      } catch (err) {
                        console.error('Error loading tracks:', err);
                        setError(`Failed to load tracks: ${err instanceof Error ? err.message : 'Unknown error'}`);
                      } finally {
                        setIsLoading(false);
                      }
                    };
                    loadTracks();
                  }
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        ) : tracks.length > 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            {/* Tracklist Header */}
            <div className="bg-gray-700 px-6 py-3 border-b border-gray-600">
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <div className="w-8 text-center">#</div>
                <div className="flex-1">Title</div>
                <div className="w-20 text-center">Duration</div>
                <div className="w-12"></div>
              </div>
            </div>

            {/* Tracklist */}
            <div className="divide-y divide-gray-700">
              {tracks.map((track, index) => (
                <div
                  key={track.id}
                  className="flex items-center space-x-4 px-6 py-3 hover:bg-gray-700/50 transition-colors group"
                >
                  {/* Track Number / Play Button */}
                  <div className="w-8 text-center">
                    {currentTrack?.id === track.id && isPlaying ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePlayTrack(track)}
                        className="text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {currentTrack?.id === track.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <span className="text-gray-400 text-sm group-hover:hidden">
                      {index + 1}
                    </span>
                  </div>

                  {/* Cover Art */}
                  <div className="w-12 h-12 flex-shrink-0">
                    {track.cover_art_url && track.cover_art_url.trim() !== '' ? (
                      <img
                        src={track.cover_art_url}
                        alt={track.title}
                        className="w-12 h-12 rounded object-cover"
                        onError={(e) => {
                          console.error('Image load error for track:', track.title, track.cover_art_url);
                          // Hide the image and show fallback
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully for track:', track.title);
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded flex items-center justify-center"
                      style={{ display: (track.cover_art_url && track.cover_art_url.trim() !== '') ? 'none' : 'flex' }}
                    >
                      <Music className="h-6 w-6 text-white" />
                    </div>
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">
                      {track.title}
                    </h3>
                    <p className="text-sm text-gray-400 truncate">
                      {track.creator?.display_name || 'Unknown Artist'}
                    </p>
                  </div>

                  {/* Duration */}
                  <div className="w-20 text-center text-sm text-gray-400">
                    {formatDuration(track.duration || 0)}
                  </div>

                  {/* Actions */}
                  <div className="w-12 flex items-center justify-end space-x-2">
                    <button
                      onClick={(e) => handleLikeTrack(track, e)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Heart 
                        className="h-4 w-4" 
                        fill={likedTracks.has(track.id) ? 'currentColor' : 'none'}
                      />
                    </button>
                    <div className="relative">
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === track.id ? null : track.id)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      
                      
                      {/* Dropdown Menu */}
                      {activeMenuId === track.id && (
                        <div className="dropdown-menu absolute right-0 top-8 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[120px]">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Copy button clicked for track:', track.id);
                              // Small delay to ensure the click is processed before menu closes
                              setTimeout(() => {
                                copyTrackLink(track);
                              }, 10);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center space-x-2"
                            style={{ zIndex: 1000 }}
                          >
                            <Copy className="h-4 w-4" />
                            <span>{copiedTrackId === track.id ? 'Link Copied!' : 'Copy Link'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Copy Success Indicator */}
                    {copiedTrackId === track.id && (
                      <div className="absolute top-0 right-0 bg-green-600 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                        ✓ Copied!
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Music className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Music Found</h3>
            <p className="text-gray-400">
              This creator hasn't uploaded any music yet.
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
