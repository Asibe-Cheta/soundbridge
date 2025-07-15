'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Footer } from '../../src/components/layout/Footer';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import { AdvancedFilters } from '../../src/components/ui/AdvancedFilters';
import { 
  Search, 
  Filter, 
  X, 
  MapPin, 
  Music, 
  Users, 
  Calendar, 
  Mic, 
  Play,
  Heart,
  Share2,
  MessageCircle,
  Star,
  Clock,
  TrendingUp,
  ArrowLeft,
  Sliders
} from 'lucide-react';

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(query);
  const [activeTab, setActiveTab] = useState('music');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);

  // Mock search results
  const searchResults = {
    music: [
      { id: 1, title: 'Lagos Nights', artist: 'Kwame Asante', genre: 'Afrobeats', plays: '12K', duration: '3:45', match: 'title' },
      { id: 2, title: 'Gospel Fusion', artist: 'Sarah Johnson', genre: 'Gospel', plays: '8K', duration: '4:12', match: 'artist' },
      { id: 3, title: 'UK Drill Mix', artist: 'Tommy B', genre: 'UK Drill', plays: '15K', duration: '3:28', match: 'genre' },
      { id: 4, title: 'Afro Fusion', artist: 'Michael Okafor', genre: 'Afrobeats', plays: '9K', duration: '3:55', match: 'title' },
      { id: 5, title: 'Praise & Worship', artist: 'Grace Community', genre: 'Gospel', plays: '6K', duration: '4:30', match: 'artist' },
      { id: 6, title: 'Lagos Anthem', artist: 'Wizkid Jr', genre: 'Afrobeats', plays: '18K', duration: '3:15', match: 'title' }
    ],
    creators: [
      { id: 1, name: 'Kwame Asante', genre: 'Afrobeats', location: 'London, UK', followers: '125K', tracks: 45, match: 'name' },
      { id: 2, name: 'Sarah Johnson', genre: 'Gospel', location: 'Birmingham, UK', followers: '89K', tracks: 32, match: 'name' },
      { id: 3, name: 'Tommy B', genre: 'UK Drill', location: 'Manchester, UK', followers: '67K', tracks: 28, match: 'name' },
      { id: 4, name: 'Ada Grace', genre: 'Gospel', location: 'Lagos, Nigeria', followers: '156K', tracks: 52, match: 'name' },
      { id: 5, name: 'DJ Emeka', genre: 'Afrobeats', location: 'Abuja, Nigeria', followers: '98K', tracks: 38, match: 'name' },
      { id: 6, name: 'Grace Community', genre: 'Gospel', location: 'London, UK', followers: '112K', tracks: 41, match: 'name' }
    ],
    events: [
      { id: 1, title: 'Gospel Night Live', creator: 'Royal Festival Hall', date: 'Tonight • 8PM', location: 'London, UK', price: '£25-45', attendees: 1200, featured: true, match: 'title' },
      { id: 2, title: 'Afrobeats Carnival', creator: 'Tafawa Balewa Square', date: 'Friday • 7PM', location: 'Lagos, Nigeria', price: '₦5000-15000', attendees: 5000, featured: true, match: 'title' },
      { id: 3, title: 'UK Drill Showcase', creator: 'O2 Academy', date: 'Saturday • 6PM', location: 'Birmingham, UK', price: '£15-35', attendees: 800, featured: false, match: 'title' },
      { id: 4, title: 'Worship Experience', creator: 'House on the Rock', date: 'Sunday • 4PM', location: 'Abuja, Nigeria', price: 'Free Entry', attendees: 2000, featured: false, match: 'title' }
    ],
    podcasts: [
      { id: 1, title: 'The Lagos Life', host: 'Ada Grace', episode: 'Episode 45: Music Industry', duration: '42 min', plays: '12K', match: 'title' },
      { id: 2, title: 'Faith & Beats', host: 'Sarah Johnson', episode: 'Gospel in Modern Music', duration: '35 min', plays: '8K', match: 'title' },
      { id: 3, title: 'UK Underground', host: 'Tommy B', episode: 'Drill Scene Deep Dive', duration: '28 min', plays: '15K', match: 'title' },
      { id: 4, title: 'Creator Stories', host: 'Kwame Asante', episode: 'From Bedroom to Billboard', duration: '52 min', plays: '9K', match: 'title' }
    ]
  };

  const genres = [
    { value: 'all', label: 'All Genres' },
    { value: 'afrobeats', label: 'Afrobeats' },
    { value: 'gospel', label: 'Gospel' },
    { value: 'uk-drill', label: 'UK Drill' },
    { value: 'highlife', label: 'Highlife' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'hip-hop', label: 'Hip Hop' }
  ];

  const locations = [
    { value: 'all', label: 'All Locations' },
    { value: 'london', label: 'London, UK' },
    { value: 'lagos', label: 'Lagos, Nigeria' },
    { value: 'abuja', label: 'Abuja, Nigeria' },
    { value: 'manchester', label: 'Manchester, UK' },
    { value: 'birmingham', label: 'Birmingham, UK' }
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
    { value: 'relevance', label: 'Relevance' },
    { value: 'trending', label: 'Trending' },
    { value: 'latest', label: 'Latest' },
    { value: 'popular', label: 'Most Popular' }
  ];

  const handleClearFilters = () => {
    setSelectedGenre('all');
    setSelectedLocation('all');
    setSelectedDate('all');
    setSelectedPrice('all');
  };

  const getResultCount = (type: string) => {
    return searchResults[type as keyof typeof searchResults]?.length || 0;
  };

  const renderContent = () => {
    const results = searchResults[activeTab as keyof typeof searchResults] || [];

    if (results.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#999' }}>
          <Search size={64} style={{ marginBottom: '1rem', opacity: '0.5' }} />
          <h3 style={{ marginBottom: '1rem', color: '#ccc' }}>No {activeTab} found</h3>
          <p style={{ marginBottom: '2rem', fontSize: '0.9rem' }}>
            Try adjusting your search terms or filters
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px', margin: '0 auto' }}>
            <div style={{ color: '#EC4899', fontWeight: '600' }}>Suggestions:</div>
            <div>• Check your spelling</div>
            <div>• Try different keywords</div>
            <div>• Use more general terms</div>
            <div>• Remove some filters</div>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'music':
        return (
          <div className="grid grid-6">
            {(results as typeof searchResults.music).map((track) => (
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
            {(results as typeof searchResults.creators).map((creator) => (
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
            {(results as typeof searchResults.events).map((event) => (
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
            {(results as typeof searchResults.podcasts).map((podcast) => (
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
        {/* Search Header */}
        <section className="section">
          <div style={{ marginBottom: '2rem' }}>
            <Link href="/discover" style={{ textDecoration: 'none' }}>
              <button style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                background: 'none', 
                border: 'none', 
                color: '#EC4899', 
                cursor: 'pointer',
                fontSize: '0.9rem',
                marginBottom: '1rem'
              }}>
                <ArrowLeft size={16} />
                Back to Discover
              </button>
            </Link>
            
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

          {/* Search Results Summary */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h2 style={{ color: '#ccc', marginBottom: '0.5rem' }}>
                Search results for "{query}"
              </h2>
              <p style={{ color: '#999', fontSize: '0.9rem' }}>
                Found {getResultCount(activeTab)} {activeTab} • Showing best matches
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
            </div>
          </div>

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
                    fontWeight: activeTab === tab ? '600' : 'normal',
                    position: 'relative'
                  }}
                >
                  {tab}
                  <span style={{ 
                    position: 'absolute', 
                    top: '0.5rem', 
                    right: '0.5rem',
                    background: '#EC4899',
                    color: 'white',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    fontSize: '0.7rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getResultCount(tab)}
                  </span>
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
        
        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Search Tips</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div>• Use quotes for exact phrases</div>
          <div>• Try different keywords</div>
          <div>• Filter by location or genre</div>
          <div>• Sort by relevance or popularity</div>
        </div>
      </FloatingCard>
    </>
  );
} 