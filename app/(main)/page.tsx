'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { Footer } from '../../src/components/layout/Footer';
import { LogOut, User, Upload, Play, Heart, MessageCircle, Search, Bell, Settings, Home, Music } from 'lucide-react';
import { ThemeToggle } from '../../src/components/ui/ThemeToggle';

export default function HomePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [recentTracks, setRecentTracks] = React.useState<Array<{
    id: string;
    title: string;
    creator: { display_name: string; username: string };
    cover_art_url?: string;
    duration?: number;
    play_count?: number;
    like_count?: number;
  }>>([]);
  const [isLoadingTracks, setIsLoadingTracks] = React.useState(true);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Load recent tracks from all creators globally
  React.useEffect(() => {
    const loadRecentTracks = async () => {
      try {
        console.log('🔄 Loading recent tracks...');
        setIsLoadingTracks(true);
        const response = await fetch('/api/audio?recent=true');
        
        if (response.ok) {
          const result = await response.json();
          console.log('📊 API Response:', result);
          if (result.success && result.tracks) {
            console.log('✅ Setting tracks:', result.tracks.length);
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

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const menu = document.getElementById('user-menu');
      const menuButton = document.getElementById('user-menu-button');
      if (menu && menuButton && !menu.contains(event.target as Node) && !menuButton.contains(event.target as Node)) {
        menu.style.display = 'none';
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div>
      {/* Header */}
      <header className="header">
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

        {/* CENTER */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', maxWidth: '500px', marginRight: '2rem' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666', zIndex: 1 }} />
            <input 
              type="search" 
              className="search-bar" 
              placeholder="Search creators, events, podcasts..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearch}
              style={{ width: '100%', paddingLeft: '40px' }} 
            />
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Upload Button */}
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <button 
              style={{
                background: 'linear-gradient(45deg, #DC2626, #EC4899, #F97316)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
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
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onClick={() => {
                  const menu = document.getElementById('user-menu');
                  if (menu) {
                    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                  }
                }}
              >
                <User size={16} />
                <span>Menu</span>
                <span style={{ fontSize: '0.8rem' }}>▼</span>
              </button>
              
              {/* Dropdown Menu */}
              <div 
                id="user-menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.9)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '0.5rem 0',
                  minWidth: '180px',
                  display: 'none',
                  zIndex: 1000
                }}
              >
                <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '0.75rem 1rem', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Home size={16} />
                    Dashboard
                  </div>
                </Link>
                <Link href="/notifications" style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '0.75rem 1rem', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Bell size={16} />
                    Notifications
                  </div>
                </Link>
                <Link href="/profile" style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '0.75rem 1rem', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={16} />
                    Profile
                  </div>
                </Link>
                <Link href="/settings" style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '0.75rem 1rem', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Settings size={16} />
                    Settings
                  </div>
                </Link>
                
                {/* Theme Toggle */}
                <ThemeToggle />
                
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', margin: '0.5rem 0' }}></div>
                <button
                  onClick={handleSignOut}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#EF4444',
                    padding: '0.75rem 1rem',
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.color = '#FCA5A5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#EF4444';
                  }}
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            /* Login/Signup Buttons */
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button 
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  Login
                </button>
              </Link>
              <Link href="/signup" style={{ textDecoration: 'none' }}>
                <button 
                  style={{
                    background: 'linear-gradient(45deg, #DC2626, #EC4899, #F97316)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
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
                  Sign Up
                </button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="main-container">
        {/* Hero Section */}
        <section className="hero-section">
          <Link href="/creator/kwame-asante" style={{ textDecoration: 'none' }}>
            <div className="featured-creator">
              <div className="featured-creator-content">
                <h2>Featured Creator: Kwame Asante</h2>
                <p>Afrobeats sensation taking UK by storm!</p>
                <div className="waveform"></div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button 
                    style={{
                      background: 'linear-gradient(45deg, #DC2626, #EC4899, #F97316)',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
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
                    <Play size={16} />
                    Play Latest
                  </button>
                  <button 
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    <Heart size={16} />
                    Follow
                  </button>
                  <button 
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    <MessageCircle size={16} />
                    Message
                  </button>
                </div>
              </div>
            </div>
          </Link>
          <div className="trending-panel">
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
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#DC2626',
                    padding: '0.5rem',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.color = '#EF4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = '#DC2626';
                  }}
                >
                  <Play size={12} />
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
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#DC2626',
                    padding: '0.5rem',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.color = '#EF4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = '#DC2626';
                  }}
                >
                  <Play size={12} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Recently Added Music - FRESH VERSION */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Recently Added Music</h2>
            <a href="/profile" className="view-all">View All</a>
          </div>
          
          {/* Debug Info */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            padding: '1rem', 
            marginBottom: '1rem', 
            borderRadius: '8px',
            fontSize: '0.9rem',
            color: '#ccc'
          }}>
            <div>🔄 Loading: {isLoadingTracks ? 'Yes' : 'No'}</div>
            <div>📊 Tracks Count: {recentTracks.length}</div>
            <div>🎵 API Status: Working</div>
          </div>

          <div className="grid grid-6">
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
                    {track.cover_art_url ? (
                      <Image
                        src={track.cover_art_url}
                        alt={track.title}
                        width={200}
                        height={200}
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                      />
                    ) : (
                      <div style={{ 
                        background: 'linear-gradient(45deg, #DC2626, #EC4899)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.9rem',
                        height: '200px'
                      }}>
                        <Music size={24} />
                      </div>
                    )}
                    <div className="play-button">▶</div>
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '0.5rem' }}>
                    {track.title || 'Untitled Track'}
                  </div>
                  <div style={{ color: '#999', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    {track.creator?.display_name || 'Unknown Artist'}
                  </div>
                  <div style={{ color: '#666', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    {track.play_count || 0} plays • {track.like_count || 0} likes
                  </div>
                  <div className="waveform"></div>
                </div>
              ))
            ) : (
              // No tracks state
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#999' }}>
                <Music size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
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
            <Link href="/creators" className="view-all">View All</Link>
          </div>
          <div className="grid grid-3">
            <Link href="/creator/adunni-adebayo" style={{ textDecoration: 'none' }}>
              <div className="card">
                <div className="card-image">
                  Creator Photo
                  <div className="play-button">▶</div>
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
                <div className="play-button">▶</div>
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
                <div className="play-button">▶</div>
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
            <Link href="/events" className="view-all">View All</Link>
          </div>
          <div className="grid grid-4">
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
            <a href="/discover" className="view-all">View All</a>
          </div>
          <div className="grid grid-4">
            <div className="card">
              <div className="card-image">
                Podcast Cover
                <div className="play-button">▶</div>
              </div>
              <div style={{ fontWeight: '600' }}>The Lagos Life</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Episode 45: Music Industry</div>
              <div style={{ color: '#EC4899', fontSize: '0.8rem', marginTop: '0.5rem' }}>42 min • 12K plays</div>
            </div>
            <div className="card">
              <div className="card-image">
                Podcast Cover
                <div className="play-button">▶</div>
              </div>
              <div style={{ fontWeight: '600' }}>Faith & Beats</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Gospel in Modern Music</div>
              <div style={{ color: '#EC4899', fontSize: '0.8rem', marginTop: '0.5rem' }}>35 min • 8K plays</div>
            </div>
            <div className="card">
              <div className="card-image">
                Podcast Cover
                <div className="play-button">▶</div>
              </div>
              <div style={{ fontWeight: '600' }}>UK Underground</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Drill Scene Deep Dive</div>
              <div style={{ color: '#EC4899', fontSize: '0.8rem', marginTop: '0.5rem' }}>28 min • 15K plays</div>
            </div>
            <div className="card">
              <div className="card-image">
                Podcast Cover
                <div className="play-button">▶</div>
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
    </div>
  );
}