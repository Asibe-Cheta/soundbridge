'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Footer } from '../../src/components/layout/Footer';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import { AdvancedFilters } from '../../src/components/ui/AdvancedFilters';
import { useSearch } from '../../src/hooks/useSearch';
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
  Sliders,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(query);
  const [activeTab, setActiveTab] = useState('music');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedDate, setSelectedDate] = useState<'all' | 'today' | 'week' | 'month' | 'next-month'>('all');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);

  // Use the search hook
  const {
    results,
    loading,
    error,
    suggestions,
    search,
    updateFilters,
    loadMore,
    hasResults,
    totalResults,
    canLoadMore
  } = useSearch();

  // Initialize search when component mounts or query changes
  useEffect(() => {
    if (query.trim()) {
      const filters = {
        genre: selectedGenre !== 'all' ? selectedGenre : undefined,
        location: selectedLocation !== 'all' ? selectedLocation : undefined,
        date_range: selectedDate !== 'all' ? selectedDate : undefined,
        price_range: selectedPrice !== 'all' ? selectedPrice : undefined,
        sort_by: sortBy,
        content_types: [activeTab as 'music' | 'creators' | 'events' | 'podcasts']
      };
      search(query, filters);
    }
  }, [query, selectedGenre, selectedLocation, selectedDate, selectedPrice, sortBy, activeTab, search]);

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
    setSelectedDate('all' as const);
    setSelectedPrice('all');
    setSortBy('relevance');
  };

  const handleSearch = (newQuery: string) => {
    setSearchQuery(newQuery);
    if (newQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(newQuery)}`);
    }
  };

  const getResultCount = (type: string) => {
    if (!results) return 0;
    switch (type) {
      case 'music':
        return results.music.length;
      case 'creators':
        return results.creators.length;
      case 'events':
        return results.events.length;
      case 'podcasts':
        return results.podcasts.length;
      default:
        return 0;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#999' }}>
          <Loader2 size={64} style={{ marginBottom: '1rem', opacity: '0.5', animation: 'spin 1s linear infinite' }} />
          <h3 style={{ marginBottom: '1rem', color: '#ccc' }}>Searching...</h3>
          <p style={{ fontSize: '0.9rem' }}>
            Finding the best matches for your search
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#999' }}>
          <AlertCircle size={64} style={{ marginBottom: '1rem', opacity: '0.5', color: '#DC2626' }} />
          <h3 style={{ marginBottom: '1rem', color: '#DC2626' }}>Search Error</h3>
          <p style={{ marginBottom: '2rem', fontSize: '0.9rem' }}>
            {error}
          </p>
          <button
            onClick={() => search(query, {})}
            style={{
              background: '#EC4899',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    if (!hasResults) {
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
            {results?.music.map((track) => (
              <div key={track.id} className="card">
                <div className="card-image">
                  {track.cover_art_url ? (
                    <img
                      src={track.cover_art_url}
                      alt={track.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
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
                      🎵
                    </div>
                  )}
                  <div className="play-button">▶</div>
                </div>
                <div style={{ fontWeight: '600' }}>{track.title}</div>
                <div style={{ color: '#999', fontSize: '0.9rem' }}>{track.creator_name}</div>
                <div className="waveform"></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ color: '#EC4899', fontSize: '0.8rem' }}>{track.formatted_duration}</span>
                  <span style={{ color: '#999', fontSize: '0.8rem' }}>{track.formatted_play_count} plays</span>
                </div>
              </div>
            ))}
          </div>
        );

      case 'creators':
        return (
          <div className="grid grid-3">
            {results?.creators.map((creator) => (
              <Link key={creator.id} href={`/creator/${creator.username}`} style={{ textDecoration: 'none' }}>
                <div className="card">
                  <div className="card-image">
                    {creator.avatar_url ? (
                      <img
                        src={creator.avatar_url}
                        alt={creator.display_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
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
                        {creator.display_name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="play-button">▶</div>
                  </div>
                  <div style={{ fontWeight: '600' }}>{creator.display_name}</div>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>
                    {creator.location || 'Location not set'}
                  </div>
                  <div className="stats">
                    <span>{creator.followers_count?.toLocaleString() || 0} followers</span>
                    <span>{creator.tracks_count || 0} tracks</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        );

      case 'events':
        return (
          <div className="grid grid-4">
            {results?.events.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
                <div className="event-card">
                  <div className="event-card-content">
                    <div style={{ fontSize: '0.9rem', color: '#EC4899' }}>{event.formatted_date}</div>
                    <div style={{ fontWeight: '600', margin: '0.5rem 0', fontSize: '1.1rem' }}>{event.title}</div>
                    <div style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{event.creator_name}</div>
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
                        {event.formatted_price}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#999' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Users size={12} />
                        {event.attendee_count?.toLocaleString() || 0}
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
            {results?.podcasts.map((podcast) => (
              <div key={podcast.id} className="card">
                <div className="card-image">
                  {podcast.cover_art_url ? (
                    <img
                      src={podcast.cover_art_url}
                      alt={podcast.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
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
                      🎙️
                    </div>
                  )}
                  <div className="play-button">▶</div>
                </div>
                <div style={{ fontWeight: '600' }}>{podcast.title}</div>
                <div style={{ color: '#999', fontSize: '0.9rem' }}>{podcast.creator_name}</div>
                <div style={{ color: '#EC4899', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  {podcast.formatted_duration} • {podcast.formatted_play_count} plays
                </div>
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchQuery);
                  }
                }}
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
                Search results for &quot;{query}&quot;
              </h2>
              <p style={{ color: '#999', fontSize: '0.9rem' }}>
                Found {totalResults} total results • Showing {getResultCount(activeTab)} {activeTab}
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

          {/* Load More Button */}
          {canLoadMore && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button
                onClick={loadMore}
                disabled={loading}
                style={{
                  background: '#EC4899',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} style={{ marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} />
                    Loading...
                  </>
                ) : (
                  'Load More Results'
                )}
              </button>
            </div>
          )}
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