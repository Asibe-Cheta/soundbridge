'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { Footer } from '../src/components/layout/Footer';
import { FloatingCard } from '../src/components/ui/FloatingCard';
import { LogOut, User, Upload, Play, Heart, MessageCircle, Search, Bell, Settings, Home, Calendar, Mic, Users } from 'lucide-react';

export default function HomePage() {
  const { user, signOut, loading, error: authError } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');

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
              onKeyDown={handleSearch}
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
                      borderRadius: '25px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.9rem',
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
                    <Play size={16} />
                    Play Latest
                  </button>
                  <button 
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.9rem',
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
                    <Heart size={16} />
                    Follow
                  </button>
                  <button 
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.9rem',
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

        {/* Recently Added Music */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Recently Added Music</h2>
            <a href="#" className="view-all">View All</a>
          </div>
          <div className="grid grid-6">
            <div className="card">
              <div className="card-image">
                Album Cover
                <div className="play-button">
                  <Play size={20} />
                </div>
              </div>
              <div style={{ fontWeight: '600' }}>New Song Title</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Artist Name</div>
              <div className="waveform"></div>
            </div>
            <div className="card">
              <div className="card-image">
                Album Cover
                <div className="play-button">
                  <Play size={20} />
                </div>
              </div>
              <div style={{ fontWeight: '600' }}>Gospel Vibes</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Sarah Johnson</div>
              <div className="waveform"></div>
            </div>
            <div className="card">
              <div className="card-image">
                Album Cover
                <div className="play-button">
                  <Play size={20} />
                </div>
              </div>
              <div style={{ fontWeight: '600' }}>Afro Fusion</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Michael Okafor</div>
              <div className="waveform"></div>
            </div>
            <div className="card">
              <div className="card-image">
                Album Cover
                <div className="play-button">
                  <Play size={20} />
                </div>
              </div>
              <div style={{ fontWeight: '600' }}>UK Drill Mix</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Tommy B</div>
              <div className="waveform"></div>
            </div>
            <div className="card">
              <div className="card-image">
                Album Cover
                <div className="play-button">
                  <Play size={20} />
                </div>
              </div>
              <div style={{ fontWeight: '600' }}>Praise & Worship</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Grace Community</div>
              <div className="waveform"></div>
            </div>
            <div className="card">
              <div className="card-image">
                Album Cover
                <div className="play-button">
                  <Play size={20} />
                </div>
              </div>
              <div style={{ fontWeight: '600' }}>Lagos Anthem</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Wizkid Jr</div>
              <div className="waveform"></div>
            </div>
          </div>
        </section>

        {/* Hot Creators */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Hot Creators Right Now</h2>
            <a href="#" className="view-all">View All</a>
          </div>
          <div className="grid grid-3">
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
            <a href="#" className="view-all">View All</a>
          </div>
          <div className="grid grid-4">
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
