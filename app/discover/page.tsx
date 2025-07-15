'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Footer } from '../../src/components/layout/Footer';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import { AdvancedFilters } from '../../src/components/ui/AdvancedFilters';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Clock, 
  Star, 
  MapPin, 
  Music, 
  Users, 
  Calendar, 
  Mic, 
  X,
  Play,
  Heart,
  Share2,
  MessageCircle,
  ArrowRight
} from 'lucide-react';

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [sortBy, setSortBy] = useState('trending');
  const [activeTab, setActiveTab] = useState('music');
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { id: 'all', label: 'All', icon: TrendingUp },
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

  const trendingMusic = [
    { id: 1, title: 'Lagos Nights', artist: 'Kwame Asante', genre: 'Afrobeats', plays: '12K', duration: '3:45' },
    { id: 2, title: 'Gospel Fusion', artist: 'Sarah Johnson', genre: 'Gospel', plays: '8K', duration: '4:12' },
    { id: 3, title: 'UK Drill Mix', artist: 'Tommy B', genre: 'UK Drill', plays: '15K', duration: '3:28' },
    { id: 4, title: 'Afro Fusion', artist: 'Michael Okafor', genre: 'Afrobeats', plays: '9K', duration: '3:55' },
    { id: 5, title: 'Praise & Worship', artist: 'Grace Community', genre: 'Gospel', plays: '6K', duration: '4:30' },
    { id: 6, title: 'Lagos Anthem', artist: 'Wizkid Jr', genre: 'Afrobeats', plays: '18K', duration: '3:15' }
  ];

  const trendingCreators = [
    { id: 1, name: 'Kwame Asante', genre: 'Afrobeats', location: 'London, UK', followers: '125K', tracks: 45 },
    { id: 2, name: 'Sarah Johnson', genre: 'Gospel', location: 'Birmingham, UK', followers: '89K', tracks: 32 },
    { id: 3, name: 'Tommy B', genre: 'UK Drill', location: 'Manchester, UK', followers: '67K', tracks: 28 },
    { id: 4, name: 'Ada Grace', genre: 'Gospel', location: 'Lagos, Nigeria', followers: '156K', tracks: 52 },
    { id: 5, name: 'DJ Emeka', genre: 'Afrobeats', location: 'Abuja, Nigeria', followers: '98K', tracks: 38 },
    { id: 6, name: 'Grace Community', genre: 'Gospel', location: 'London, UK', followers: '112K', tracks: 41 }
  ];

  const trendingEvents = [
    { id: 1, title: 'Gospel Night Live', creator: 'Royal Festival Hall', date: 'Tonight • 8PM', location: 'London, UK', price: '£25-45', attendees: 1200, featured: true },
    { id: 2, title: 'Afrobeats Carnival', creator: 'Tafawa Balewa Square', date: 'Friday • 7PM', location: 'Lagos, Nigeria', price: '₦5000-15000', attendees: 5000, featured: true },
    { id: 3, title: 'UK Drill Showcase', creator: 'O2 Academy', date: 'Saturday • 6PM', location: 'Birmingham, UK', price: '£15-35', attendees: 800, featured: false },
    { id: 4, title: 'Worship Experience', creator: 'House on the Rock', date: 'Sunday • 4PM', location: 'Abuja, Nigeria', price: 'Free Entry', attendees: 2000, featured: false }
  ];

  const trendingPodcasts = [
    { id: 1, title: 'The Lagos Life', host: 'Ada Grace', episode: 'Episode 45: Music Industry', duration: '42 min', plays: '12K' },
    { id: 2, title: 'Faith & Beats', host: 'Sarah Johnson', episode: 'Gospel in Modern Music', duration: '35 min', plays: '8K' },
    { id: 3, title: 'UK Underground', host: 'Tommy B', episode: 'Drill Scene Deep Dive', duration: '28 min', plays: '15K' },
    { id: 4, title: 'Creator Stories', host: 'Kwame Asante', episode: 'From Bedroom to Billboard', duration: '52 min', plays: '9K' }
  ];

  const handleClearFilters = () => {
    setSelectedGenre('all');
    setSelectedLocation('all');
    setSelectedDate('all');
    setSelectedPrice('all');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'music':
        return (
          <div className="grid grid-6">
            {trendingMusic.map((track) => (
              <div key={track.id} className="card">
                <div className="card-image">
                  Album Cover
                  <div className="play-button">▶</div>
                </div>
                <div style={{ fontWeight: '600' }}>{track.title}</div>
                <div style={{ color: '#999', fontSize: '0.9rem' }}>{track.artist}</div>
                <div className="waveform"></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ color: '#EC4899', fontSize: '0.8rem' }}>{track.duration}</span>
                  <span style={{ color: '#999', fontSize: '0.8rem' }}>{track.plays} plays</span>
                </div>
              </div>
            ))}
          </div>
        );

      case 'creators':
        return (
          <div className="grid grid-3">
            {trendingCreators.map((creator) => (
              <Link key={creator.id} href={`/creator/${creator.name.toLowerCase().replace(' ', '-')}`} style={{ textDecoration: 'none' }}>
                <div className="card">
                  <div className="card-image">
                    Creator Photo
                    <div className="play-button">▶</div>
                  </div>
                  <div style={{ fontWeight: '600' }}>{creator.name}</div>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>{creator.genre} • {creator.location}</div>
                  <div className="stats">
                    <span>{creator.followers} followers</span>
                    <span>{creator.tracks} tracks</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        );

      case 'events':
        return (
          <div className="grid grid-4">
            {trendingEvents.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
                <div className="event-card">
                  <div className="event-card-content">
                    {event.featured && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '0.5rem', 
                        right: '0.5rem',
                        background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        Featured
                      </div>
                    )}
                    <div style={{ fontSize: '0.9rem', color: '#EC4899' }}>{event.date}</div>
                    <div style={{ fontWeight: '600', margin: '0.5rem 0', fontSize: '1.1rem' }}>{event.title}</div>
                    <div style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{event.creator}</div>
                    <div style={{ color: '#999', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                      <MapPin size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      {event.location}
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ 
                        background: 'rgba(236, 72, 153, 0.2)', 
                        color: '#EC4899', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '15px', 
                        fontSize: '0.8rem' 
                      }}>
                        {event.price}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#999' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Users size={12} />
                        {event.attendees.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        );

      case 'podcasts':
        return (
          <div className="grid grid-4">
            {trendingPodcasts.map((podcast) => (
              <div key={podcast.id} className="card">
                <div className="card-image">
                  Podcast Cover
                  <div className="play-button">▶</div>
                </div>
                <div style={{ fontWeight: '600' }}>{podcast.title}</div>
                <div style={{ color: '#999', fontSize: '0.9rem' }}>{podcast.episode}</div>
                <div style={{ color: '#EC4899', fontSize: '0.8rem', marginTop: '0.5rem' }}>{podcast.duration} • {podcast.plays} plays</div>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="logo">
          🌉 SoundBridge
        </div>
        <nav className="nav">
          <Link href="/" style={{ textDecoration: 'none', color: 'white' }}>
            For You
          </Link>
          <Link href="/discover" className="active" style={{ textDecoration: 'none', color: 'white' }}>
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
        </nav>
        <Link href="/search?q=" style={{ textDecoration: 'none', flex: 1, maxWidth: '400px' }}>
          <input type="search" className="search-bar" placeholder="Search creators, events, podcasts..." readOnly style={{ cursor: 'pointer' }} />
        </Link>
        <div className="auth-buttons">
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button className="btn-secondary">Login</button>
          </Link>
          <Link href="/signup" style={{ textDecoration: 'none' }}>
            <button className="btn-primary">Sign Up</button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-container">
        {/* Search and Filters Section */}
        <section className="section">
          <div className="section-header">
            <h1 className="section-title">Discover</h1>
            <p style={{ color: '#ccc', marginTop: '0.5rem' }}>
              Explore the best music, creators, events, and podcasts from UK & Nigeria
            </p>
          </div>

          {/* Search Bar */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
              <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for music, creators, events, or podcasts..."
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#EC4899'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.5rem',
                      background: selectedCategory === category.id ? 'linear-gradient(45deg, #DC2626, #EC4899)' : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '25px',
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      fontSize: '0.9rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <Icon size={16} />
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced Filters */}
          <AdvancedFilters
            genres={genres}
            locations={locations}
            dateRanges={dateRanges}
            priceRanges={priceRanges}
            sortOptions={sortOptions}
            selectedGenre={selectedGenre}
            selectedLocation={selectedLocation}
            selectedDate={selectedDate}
            selectedPrice={selectedPrice}
            sortBy={sortBy}
            onGenreChange={setSelectedGenre}
            onLocationChange={setSelectedLocation}
            onDateChange={setSelectedDate}
            onPriceChange={setSelectedPrice}
            onSortChange={setSortBy}
            onClearFilters={handleClearFilters}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
          />

          {/* Content Tabs */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              {['music', 'creators', 'events', 'podcasts'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '1rem 2rem',
                    background: 'none',
                    border: 'none',
                    color: activeTab === tab ? '#EC4899' : '#999',
                    cursor: 'pointer',
                    borderBottom: activeTab === tab ? '2px solid #EC4899' : '2px solid transparent',
                    transition: 'all 0.3s ease',
                    textTransform: 'capitalize',
                    fontWeight: activeTab === tab ? '600' : 'normal'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {renderContent()}
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
        
        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Popular Searches</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div>Afrobeats in London</div>
          <div>Gospel events this week</div>
          <div>UK Drill artists</div>
          <div>Nigerian creators</div>
        </div>
      </FloatingCard>
    </>
  );
} 