'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAudioPlayer } from '@/src/contexts/AudioPlayerContext';
import { Footer } from '../src/components/layout/Footer';
import { FloatingCard } from '../src/components/ui/FloatingCard';
import { LogOut, User, Upload, Play, Pause, Heart, MessageCircle, Search, Bell, Settings, Home, Calendar, Mic, Users, Menu, X } from 'lucide-react';

export default function HomePage() {
  const { user, signOut, loading, error: authError } = useAuth();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [recentTracks, setRecentTracks] = React.useState<any[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = React.useState(true);

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
      if (mobileMenu && mobileMenuButton && 
          !mobileMenu.contains(event.target as Node) && 
          !mobileMenuButton.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handlePlayTrack = (track: any) => {
    console.log('🎵 handlePlayTrack called with:', track);
    
    // Convert track data to AudioTrack format
    const audioTrack = {
      id: track.id,
      title: track.title,
      artist: track.creator?.name || 'Unknown Artist',
      album: '',
      duration: track.duration || 0,
      artwork: track.coverArt || '',
      url: track.url || '',
      liked: false
    };
    
    console.log('🎵 Converted to AudioTrack:', audioTrack);
    playTrack(audioTrack);
  };

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

  // Show loading state while auth is initializing (with timeout fallback)
  const [loadingTimeout, setLoadingTimeout] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      console.warn('Auth loading timeout - proceeding without auth');
      setLoadingTimeout(true);
    }, 3000); // 3 second timeout
    
    return () => clearTimeout(timer);
  }, []);

  // Load recent tracks from all creators globally
  React.useEffect(() => {
    const loadRecentTracks = async () => {
      try {
        console.log('🔄 Loading recent tracks...');
        setIsLoadingTracks(true);
        const response = await fetch('/api/audio/recent');
        
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
          console.error('❌ API Error:', response.status);
        }
      } catch (error) {
        console.error('❌ Error loading recent tracks:', error);
      } finally {
        setIsLoadingTracks(false);
      }
    };

    // Load tracks regardless of user authentication status
    loadRecentTracks();
  }, []);

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
                      <User size={24} color="white" />
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
                          color: 'white',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
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
                          color: 'white',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
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
                          color: 'white',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
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
                          color: 'white',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Settings size={16} />
                          Settings
                        </div>
                      </Link>
                      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.2)', margin: '0.5rem 0' }}></div>
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
            <>
              {/* LEFT SIDE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
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
                <nav className="nav">
                  <Link href="/" className="active" style={{ textDecoration: 'none', color: 'white' }}>
                    For You
                  </Link>
                  <Link href="/discover" style={{ textDecoration: 'none', color: 'white' }}>
                    Discover
                  </Link>
                  <Link href="/events" style={{ textDecoration: 'none', color: 'white' }}>
                    Events
                  </Link>
                  <Link href="/creators" style={{ textDecoration: 'none', color: 'white' }}>
                    Creators
                  </Link>
                </nav>
              </div>

              {/* CENTER - Search Bar */}
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                justifyContent: 'center', 
                maxWidth: '500px', 
                marginRight: '2rem'
              }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666', zIndex: 1 }} />
                  <input 
                    type="search" 
                    className="search-bar" 
                    placeholder="Search creators, events, podcasts..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearch}
                    style={{ 
                      width: '100%', 
                      paddingLeft: '40px',
                      fontSize: '16px'
                    }} 
                  />
                </div>
              </div>

              {/* RIGHT SIDE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Upload Button */}
                <Link href="/upload" style={{ textDecoration: 'none' }}>
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
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
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    >
                      <User size={20} color="white" />
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
                          color: 'white',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
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
                          color: 'white',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
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
                          color: 'white',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
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
                          color: 'white',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Settings size={16} />
                          Settings
                        </div>
                      </Link>
                      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.2)', margin: '0.5rem 0' }}></div>
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
                          color: 'white',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
            </>
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
                <h2 style={{ 
                  fontSize: isMobile ? '1.5rem' : '2rem',
                  fontWeight: 'bold',
                  marginBottom: '0.5rem',
                  color: 'white'
                }}>Featured Creator: Kwame Asante</h2>
                <p style={{ 
                  fontSize: isMobile ? '1rem' : '1.1rem',
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
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: isMobile ? '1rem' : '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: isMobile ? 'none' : 'block'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#EC4899' }}>Trending Now</h3>
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

        {/* Recently Added Music - REAL DATA */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Recently Added Music</h2>
            <Link href="/discover?tab=music" className="view-all">View All</Link>
          </div>
          
          

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: isMobile ? '1rem' : '1.5rem'
          }}>
            {isLoadingTracks ? (
              // Loading state
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="card">
                  <div className="card-image" style={{ background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255, 255, 255, 0.3)', borderRadius: '50%', borderTopColor: 'white', animation: 'spin 1s linear infinite' }}></div>
                  </div>
                  <div style={{ fontWeight: '600', background: '#333', height: '16px', borderRadius: '4px', marginBottom: '0.5rem' }}></div>
                  <div style={{ color: '#999', fontSize: '0.9rem', background: '#333', height: '14px', borderRadius: '4px', width: '60%' }}></div>
                  <div className="waveform"></div>
                </div>
              ))
            ) : recentTracks.length > 0 ? (
              // REAL TRACKS FROM DATABASE
              recentTracks.map((track) => (
                <div key={track.id} className="card">
                  <div className="card-image">
                    {track.coverArt ? (
                      <Image
                        src={track.coverArt}
                        alt={track.title}
                        width={200}
                        height={200}
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                      />
                    ) : (
                      <div style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.9rem',
                        height: '200px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          textAlign: 'center'
                        }}>
                          <Mic size={32} style={{ marginBottom: '8px', opacity: 0.8 }} />
                          <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                            {track.title ? track.title.substring(0, 20) + (track.title.length > 20 ? '...' : '') : 'No Cover'}
                          </div>
                        </div>
                      </div>
                    )}
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
                        <Pause size={20} />
                      ) : (
                        <Play size={20} />
                      )}
                    </div>
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '0.5rem' }}>
                    {track.title || 'Untitled Track'}
                  </div>
                  <div style={{ color: '#999', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    {track.creator?.name || 'Unknown Artist'}
                  </div>
                  <div style={{ color: '#666', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    {track.plays || 0} plays • {track.likes || 0} likes
                  </div>
                  <div className="waveform"></div>
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
            <h2 className="section-title">Hot Creators Right Now</h2>
            <a href="#" className="view-all">View All</a>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: isMobile ? '1rem' : '1.5rem'
          }}>
            <Link href="/creator/adunni-adebayo" style={{ textDecoration: 'none' }}>
              <div className="card">
                <div className="card-image">
                  Creator Photo
                  <div className="play-button">
                    <Play size={20} />
                  </div>
                </div>
                <div style={{ fontWeight: '600' }}>Adunni Adebayo</div>
                <div style={{ color: '#999', fontSize: '0.9rem' }}>Afrobeats • Lagos</div>
                <div className="stats">
                  <span>125K followers</span>
                  <span>45 tracks</span>
                </div>
              </div>
            </Link>
            <div className="card">
              <div className="card-image">
                Creator Photo
                <div className="play-button">
                  <Play size={20} />
                </div>
              </div>
              <div style={{ fontWeight: '600' }}>James Mitchell</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Gospel • London</div>
              <div className="stats">
                <span>89K followers</span>
                <span>32 tracks</span>
              </div>
            </div>
            <div className="card">
              <div className="card-image">
                Creator Photo
                <div className="play-button">
                  <Play size={20} />
                </div>
              </div>
              <div style={{ fontWeight: '600' }}>Chiamaka Okonkwo</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Highlife • Abuja</div>
              <div className="stats">
                <span>67K followers</span>
                <span>28 tracks</span>
              </div>
            </div>
          </div>
        </section>

        {/* Live Events This Week */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Live Events This Week</h2>
            <a href="#" className="view-all">View All</a>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: isMobile ? '1rem' : '1.5rem'
          }}>
            <div className="event-card">
              <div className="event-card-content">
                <div style={{ fontSize: '0.9rem', color: '#EC4899' }}>Tonight • 8PM</div>
                <div style={{ fontWeight: '600', margin: '0.5rem 0' }}>Gospel Night Live</div>
                <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Royal Festival Hall, London</div>
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#EC4899', padding: '0.25rem 0.5rem', borderRadius: '15px', fontSize: '0.8rem' }}>£25-45</span>
                </div>
              </div>
            </div>
            <div className="event-card">
              <div className="event-card-content">
                <div style={{ fontSize: '0.9rem', color: '#EC4899' }}>Friday • 7PM</div>
                <div style={{ fontWeight: '600', margin: '0.5rem 0' }}>Afrobeats Carnival</div>
                <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Tafawa Balewa Square, Lagos</div>
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#EC4899', padding: '0.25rem 0.5rem', borderRadius: '15px', fontSize: '0.8rem' }}>₦5000-15000</span>
                </div>
              </div>
            </div>
            <div className="event-card">
              <div className="event-card-content">
                <div style={{ fontSize: '0.9rem', color: '#EC4899' }}>Saturday • 6PM</div>
                <div style={{ fontWeight: '600', margin: '0.5rem 0' }}>UK Drill Showcase</div>
                <div style={{ color: '#ccc', fontSize: '0.9rem' }}>O2 Academy, Birmingham</div>
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#EC4899', padding: '0.25rem 0.5rem', borderRadius: '15px', fontSize: '0.8rem' }}>£15-35</span>
                </div>
              </div>
            </div>
            <div className="event-card">
              <div className="event-card-content">
                <div style={{ fontSize: '0.9rem', color: '#EC4899' }}>Sunday • 4PM</div>
                <div style={{ fontWeight: '600', margin: '0.5rem 0' }}>Worship Experience</div>
                <div style={{ color: '#ccc', fontSize: '0.9rem' }}>House on the Rock, Abuja</div>
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#EC4899', padding: '0.25rem 0.5rem', borderRadius: '15px', fontSize: '0.8rem' }}>Free Entry</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trending Podcasts */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Trending Podcasts</h2>
            <a href="#" className="view-all">View All</a>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: isMobile ? '1rem' : '1.5rem'
          }}>
            <div className="card">
              <div className="card-image">
                Podcast Cover
                <div className="play-button">
                  <Play size={20} />
                </div>
              </div>
              <div style={{ fontWeight: '600' }}>The Lagos Life</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Episode 45: Music Industry</div>
              <div style={{ color: '#EC4899', fontSize: '0.8rem', marginTop: '0.5rem' }}>42 min • 12K plays</div>
            </div>
            <div className="card">
              <div className="card-image">
                Podcast Cover
                <div className="play-button">
                  <Play size={20} />
                </div>
              </div>
              <div style={{ fontWeight: '600' }}>Faith & Beats</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Gospel in Modern Music</div>
              <div style={{ color: '#EC4899', fontSize: '0.8rem', marginTop: '0.5rem' }}>35 min • 8K plays</div>
            </div>
            <div className="card">
              <div className="card-image">
                Podcast Cover
                <div className="play-button">
                  <Play size={20} />
                </div>
              </div>
              <div style={{ fontWeight: '600' }}>UK Underground</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Drill Scene Deep Dive</div>
              <div style={{ color: '#EC4899', fontSize: '0.8rem', marginTop: '0.5rem' }}>28 min • 15K plays</div>
            </div>
            <div className="card">
              <div className="card-image">
                Podcast Cover
                <div className="play-button">
                  <Play size={20} />
                </div>
              </div>
              <div style={{ fontWeight: '600' }}>Creator Stories</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>From Bedroom to Billboard</div>
              <div style={{ color: '#EC4899', fontSize: '0.8rem', marginTop: '0.5rem' }}>52 min • 9K plays</div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </main>

      {/* Floating Quick Actions Card */}
      <FloatingCard title="Quick Actions">
        <div className="quick-actions">
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <div className="quick-action">
              <Upload size={16} />
              Upload Music
            </div>
          </Link>
          <div className="quick-action">
            <Mic size={16} />
            Start Podcast
          </div>
          <div className="quick-action">
            <Calendar size={16} />
            Create Event
          </div>
          <div className="quick-action">
            <Users size={16} />
            Find Collaborators
          </div>
        </div>

        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Friends Activity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div>John is listening to &quot;Praise Medley&quot;</div>
          <div>Sarah posted a new track</div>
          <div>Mike joined Gospel Night event</div>
        </div>
      </FloatingCard>
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
