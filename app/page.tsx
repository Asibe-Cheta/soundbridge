'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/src/contexts/AuthContext';
import { Footer } from '../src/components/layout/Footer';
import { FloatingCard } from '../src/components/ui/FloatingCard';
import { LogOut, User } from 'lucide-react';

export default function HomePage() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="logo">
          <Image
            src="/images/logos/logo-trans-lockup.png"
            alt="SoundBridge Logo"
            width={150}
            height={40}
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
          <a href="#">Creators</a>
          <Link href="/upload" style={{ textDecoration: 'none', color: 'white' }}>
            Upload
          </Link>
          <Link href="/player-demo" style={{ textDecoration: 'none', color: 'white' }}>
            Player Demo
          </Link>
          <Link href="/dashboard" style={{ textDecoration: 'none', color: 'white' }}>
            Dashboard
          </Link>
          <Link href="/notifications" style={{ textDecoration: 'none', color: 'white' }}>
            Notifications
          </Link>
          <Link href="/feed" style={{ textDecoration: 'none', color: 'white' }}>
            Feed
          </Link>
          <Link href="/messaging" style={{ textDecoration: 'none', color: 'white' }}>
            Messages
          </Link>
        </nav>
        <Link href="/search?q=" style={{ textDecoration: 'none', flex: 1, maxWidth: '400px' }}>
          <input type="search" className="search-bar" placeholder="Search creators, events, podcasts..." readOnly style={{ cursor: 'pointer' }} />
        </Link>
        <div className="auth-buttons">
          {user ? (
            // Authenticated user - show profile and logout
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                <button
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <User size={16} />
                  Dashboard
                </button>
              </Link>
              <button
                onClick={handleSignOut}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          ) : (
            // Unauthenticated user - show login/signup
            <>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button className="btn-secondary">Login</button>
              </Link>
              <Link href="/signup" style={{ textDecoration: 'none' }}>
                <button className="btn-primary">Sign Up</button>
              </Link>
            </>
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
                  <button className="btn-primary">▶ Play Latest</button>
                  <button className="btn-secondary">Follow</button>
                  <button className="btn-secondary">Message</button>
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
                <button style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '1.2rem' }}>▶</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '50px', height: '50px', background: '#333', borderRadius: '8px' }}></div>
                <div>
                  <div style={{ fontWeight: '600' }}>Lagos Nights</div>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>DJ Emeka</div>
                </div>
                <button style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '1.2rem' }}>▶</button>
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
                <div className="play-button">▶</div>
              </div>
              <div style={{ fontWeight: '600' }}>New Song Title</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Artist Name</div>
              <div className="waveform"></div>
            </div>
            <div className="card">
              <div className="card-image">
                Album Cover
                <div className="play-button">▶</div>
              </div>
              <div style={{ fontWeight: '600' }}>Gospel Vibes</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Sarah Johnson</div>
              <div className="waveform"></div>
            </div>
            <div className="card">
              <div className="card-image">
                Album Cover
                <div className="play-button">▶</div>
              </div>
              <div style={{ fontWeight: '600' }}>Afro Fusion</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Michael Okafor</div>
              <div className="waveform"></div>
            </div>
            <div className="card">
              <div className="card-image">
                Album Cover
                <div className="play-button">▶</div>
              </div>
              <div style={{ fontWeight: '600' }}>UK Drill Mix</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Tommy B</div>
              <div className="waveform"></div>
            </div>
            <div className="card">
              <div className="card-image">
                Album Cover
                <div className="play-button">▶</div>
              </div>
              <div style={{ fontWeight: '600' }}>Praise & Worship</div>
              <div style={{ color: '#999', fontSize: '0.9rem' }}>Grace Community</div>
              <div className="waveform"></div>
            </div>
            <div className="card">
              <div className="card-image">
                Album Cover
                <div className="play-button">▶</div>
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

      {/* Floating Quick Actions Card */}
      <FloatingCard title="Quick Actions">
        <div className="quick-actions">
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <div className="quick-action">🎵 Upload Music</div>
          </Link>
          <div className="quick-action">🎙️ Start Podcast</div>
          <div className="quick-action">📅 Create Event</div>
          <div className="quick-action">💬 Find Collaborators</div>
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
}