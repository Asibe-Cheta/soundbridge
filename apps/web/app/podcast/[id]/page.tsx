'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAudioPlayer } from '@/src/contexts/AudioPlayerContext';
import { Footer } from '@/src/components/layout/Footer';
import { ThemeToggle } from '@/src/components/ui/ThemeToggle';
import SearchDropdown from '@/src/components/search/SearchDropdown';
import { ArrowLeft, Play, Pause, Heart, Share2, MoreHorizontal, Loader2, AlertCircle, Clock, Copy, User, Upload, Bell, Settings, Home, Calendar, Users, Menu, X, LogOut, Mic } from 'lucide-react';

interface Podcast {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  cover_art_url?: string;
  duration?: number;
  genre?: string;
  created_at: string;
  play_count?: number;
  like_count?: number;
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    bio?: string;
    location?: string;
    country?: string;
    social_links?: Record<string, string>;
  };
}

interface PodcastPageProps {
  params: Promise<{ id: string }>;
}

export default function PodcastPage({ params }: PodcastPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [similarArtists, setSimilarArtists] = useState<any[]>([]);
  const [moreByArtist, setMoreByArtist] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const { user, signOut } = useAuth();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();
  const router = useRouter();

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  useEffect(() => {
    if (!resolvedParams) return;

    const loadPodcast = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/podcast/${resolvedParams.id}`);
        const data = await response.json();
        
        if (data.success) {
          setPodcast(data.data.podcast);
          setSimilarArtists(data.data.similarArtists);
          setMoreByArtist(data.data.moreByArtist);
        } else {
          setError(data.error || 'Failed to load podcast');
        }
      } catch (err) {
        console.error('Error loading podcast:', err);
        setError('Failed to load podcast');
      } finally {
        setIsLoading(false);
      }
    };

    loadPodcast();
  }, [resolvedParams]);

  const handlePlayPodcast = () => {
    if (!podcast) return;
    
    const audioTrack = {
      id: podcast.id,
      title: podcast.title,
      artist: podcast.profiles.display_name,
      album: '',
      duration: podcast.duration || 0,
      artwork: podcast.cover_art_url || '',
      url: podcast.file_url || '',
      liked: isLiked
    };
    
    playTrack(audioTrack);
  };

  const handleLikePodcast = async () => {
    if (!user) {
      alert('Please sign in to like podcasts');
      return;
    }

    try {
      const response = await fetch('/api/social/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_id: podcast?.id,
          content_type: 'podcast'
        }),
      });

      if (response.ok) {
        setIsLiked(!isLiked);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!resolvedParams) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading podcast...</p>
        </div>
      </div>
    );
  }

  if (error || !podcast) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Podcast Not Found</h3>
          <p className="text-gray-400 mb-4">{error || 'The requested podcast could not be found.'}</p>
          <button
            onClick={() => router.back()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Navbar */}
      <header className="header">
        {isMobile ? (
          /* Mobile Header */
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            width: '100%'
          }}>
            {/* LEFT - Back Button */}
            <button
              onClick={() => router.back()}
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
              <ArrowLeft size={24} color="white" />
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

            {/* RIGHT - User Menu */}
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
          /* Desktop Header */
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

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Podcast Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8 mb-8">
          {/* Cover Art */}
          <div className="flex-shrink-0">
            {podcast.cover_art_url ? (
              <img
                src={podcast.cover_art_url}
                alt={podcast.title}
                className="w-64 h-64 md:w-80 md:h-80 rounded-lg object-cover shadow-2xl"
              />
            ) : (
              <div className="w-64 h-64 md:w-80 md:h-80 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center shadow-2xl">
                <Mic className="h-24 w-24 text-white" />
              </div>
            )}
          </div>

          {/* Podcast Info */}
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
                {podcast.title}
              </h1>
              <div className="flex items-center space-x-2 text-lg text-gray-300 mb-4">
                <Link 
                  href={`/creator/${podcast.profiles.username}`}
                  className="hover:text-red-400 transition-colors"
                >
                  {podcast.profiles.display_name}
                </Link>
                <span>•</span>
                <span>{formatDate(podcast.created_at)}</span>
              </div>
              {podcast.genre && (
                <span className="inline-block px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm font-medium">
                  {podcast.genre}
                </span>
              )}
            </div>

            {/* Play Button */}
            <div className="mb-6">
              <button
                onClick={handlePlayPodcast}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-semibold text-lg transition-colors flex items-center space-x-3"
              >
                {currentTrack?.id === podcast.id && isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
                <span>{currentTrack?.id === podcast.id && isPlaying ? 'Pause' : 'Play'}</span>
              </button>
            </div>

            {/* Podcast Stats */}
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{formatDuration(podcast.duration || 0)}</span>
              </div>
              {podcast.play_count && (
                <div className="flex items-center space-x-1">
                  <Play className="h-4 w-4" />
                  <span>{podcast.play_count.toLocaleString()} plays</span>
                </div>
              )}
              {podcast.like_count && (
                <div className="flex items-center space-x-1">
                  <Heart className="h-4 w-4" />
                  <span>{podcast.like_count.toLocaleString()} likes</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4 mt-6">
              <button
                onClick={handleLikePodcast}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Heart 
                  className="h-6 w-6" 
                  fill={isLiked ? 'currentColor' : 'none'}
                />
              </button>
              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <Share2 className="h-6 w-6" />
              </button>
              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <MoreHorizontal className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Similar Artists Section */}
        {similarArtists.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Similar Podcasts</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {similarArtists.map((similarPodcast) => (
                <Link
                  key={similarPodcast.id}
                  href={`/podcast/${similarPodcast.id}`}
                  className="group"
                >
                  <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
                    {similarPodcast.cover_art_url ? (
                      <img
                        src={similarPodcast.cover_art_url}
                        alt={similarPodcast.title}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center mb-3">
                        <Mic className="h-8 w-8 text-white" />
                      </div>
                    )}
                    <h3 className="font-semibold text-white text-sm mb-1 group-hover:text-red-400 transition-colors line-clamp-2">
                      {similarPodcast.title}
                    </h3>
                    <p className="text-gray-400 text-xs">
                      {similarPodcast.profiles.display_name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* More by Artist Section */}
        {moreByArtist.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                More by {podcast.profiles.display_name}
              </h2>
              <Link
                href={`/creator/${podcast.profiles.username}`}
                className="text-red-400 hover:text-red-300 transition-colors text-sm font-medium"
              >
                View All
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {moreByArtist.map((artistPodcast) => (
                <Link
                  key={artistPodcast.id}
                  href={`/podcast/${artistPodcast.id}`}
                  className="group"
                >
                  <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
                    {artistPodcast.cover_art_url ? (
                      <img
                        src={artistPodcast.cover_art_url}
                        alt={artistPodcast.title}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center mb-3">
                        <Mic className="h-8 w-8 text-white" />
                      </div>
                    )}
                    <h3 className="font-semibold text-white text-sm mb-1 group-hover:text-red-400 transition-colors line-clamp-2">
                      {artistPodcast.title}
                    </h3>
                    <p className="text-gray-400 text-xs">
                      {formatDate(artistPodcast.created_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
