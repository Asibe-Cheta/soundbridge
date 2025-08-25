'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Footer } from '../../src/components/layout/Footer';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import { AdvancedFilters } from '../../src/components/ui/AdvancedFilters';
import { useSearch } from '../../src/hooks/useSearch';
import { searchCreators } from '../../src/lib/creator';
import type { CreatorSearchResult, AudioTrack, Event } from '../../src/lib/types/creator';
import {
  Search,
  Filter,
  TrendingUp,
  Music,
  Users,
  Calendar,
  Mic,
  AlertCircle,
  User
} from 'lucide-react';

export default function DiscoverPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [sortBy, setSortBy] = useState('trending');
  const [activeTab, setActiveTab] = useState('music');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [creators, setCreators] = useState<CreatorSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Use the search hook for trending content
  const {
    results: trendingResults,
    loading: trendingLoading,
    error: trendingError,
    getTrendingContent
  } = useSearch();

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

  // Load trending content on mount
  useEffect(() => {
    getTrendingContent(20);
  }, [getTrendingContent]);

  useEffect(() => {
    const loadCreators = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const filters = {
          genre: selectedGenre !== 'all' ? selectedGenre : undefined,
          location: selectedLocation !== 'all' ? selectedLocation : undefined,
          country: selectedLocation.includes('nigeria') ? 'Nigeria' as const :
            selectedLocation.includes('uk') ? 'UK' as const : undefined
        };

        const { data: creatorsData, error } = await searchCreators(filters);

        if (error) {
          setError('Failed to load creators');
          return;
        }

        // Transform the data to match the expected interface
        const transformedCreators = (creatorsData || []).map(creator => ({
          profile: {
            id: creator.profile.id,
            username: creator.profile.username || '',
            display_name: creator.profile.display_name || creator.profile.full_name || 'Unknown Creator',
            bio: creator.profile.bio || null,
            avatar_url: creator.profile.avatar_url || null,
            banner_url: (creator.profile as Record<string, unknown>).banner_url as string | null || null,
            role: (creator.profile.role === 'organizer' ? 'creator' : creator.profile.role) as 'creator' | 'listener',
            location: creator.profile.location || null,
            country: creator.profile.country as 'UK' | 'Nigeria' | null,
            social_links: (creator.profile as Record<string, unknown>).social_links as Record<string, string> || {},
            created_at: creator.profile.created_at,
            updated_at: creator.profile.updated_at,
            followers_count: creator.stats.followers_count,
            following_count: (creator.stats as Record<string, unknown>).following_count as number || 0,
            tracks_count: creator.stats.tracks_count,
            events_count: creator.stats.events_count,
            is_following: false // Default value, would need separate API call to determine
          },
          stats: {
            followers_count: creator.stats.followers_count,
            following_count: (creator.stats as Record<string, unknown>).following_count as number || 0,
            tracks_count: creator.stats.tracks_count,
            events_count: creator.stats.events_count,
            total_plays: (creator.stats as Record<string, unknown>).total_plays as number || 0,
            total_likes: (creator.stats as Record<string, unknown>).total_likes as number || 0
          },
          recent_tracks: (creator as unknown as Record<string, unknown>).recent_tracks as AudioTrack[] || [],
          upcoming_events: (creator as unknown as Record<string, unknown>).upcoming_events as Event[] || []
        }));

        setCreators(transformedCreators);
      } catch (err) {
        console.error('Error loading creators:', err);
        setError('Failed to load creators');
      } finally {
        setIsLoading(false);
      }
    };

    loadCreators();
  }, [selectedGenre, selectedLocation]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedGenre('all');
    setSelectedLocation('all');
    setSelectedDate('all');
    setSelectedPrice('all');
    setSortBy('trending');
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'music':
        return (
          <div className="grid grid-6">
            {trendingLoading ? (
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
                      color: 'white',
                      fontSize: '2rem'
                    }}>
                      <Music size={32} />
                    </div>
                    <div className="play-button">▶</div>
                  </div>
                  <div style={{ fontWeight: '600' }}>Loading...</div>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>Loading...</div>
                  <div className="waveform"></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span style={{ color: '#EC4899', fontSize: '0.8rem' }}>Loading...</span>
                    <span style={{ color: '#999', fontSize: '0.8rem' }}>Loading...</span>
                  </div>
                </div>
              ))
            ) : trendingError ? (
              <div className="card" style={{ gridColumn: 'span 6', textAlign: 'center', padding: '2rem' }}>
                <AlertCircle size={48} style={{ color: '#DC2626', marginBottom: '1rem' }} />
                <h3 style={{ color: '#DC2626', marginBottom: '1rem' }}>Error Loading Music</h3>
                <p style={{ color: '#ccc', marginBottom: '1rem' }}>{trendingError}</p>
                <button onClick={() => getTrendingContent(20)} className="btn-primary">
                  Try Again
                </button>
              </div>
            ) : trendingResults?.music && trendingResults.music.length > 0 ? (
              trendingResults.music.map((track) => (
                <div key={track.id} className="card">
                  <div className="card-image">
                    {track.cover_art_url ? (
                      <Image
                        src={track.cover_art_url}
                        alt={track.title}
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
                        fontSize: '2rem'
                      }}>
                        <Music size={32} />
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
              ))
            ) : (
              <div className="card" style={{ gridColumn: 'span 6', textAlign: 'center', padding: '2rem' }}>
                <h3 style={{ color: '#EC4899', marginBottom: '1rem' }}>No Trending Music</h3>
                <p style={{ color: '#ccc' }}>Check back later for trending tracks.</p>
              </div>
            )}
          </div>
        );

      case 'creators':
        return (
          <div className="grid grid-3">
            {isLoading ? (
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
                      color: 'white',
                      fontSize: '2rem'
                    }}>
                      <User size={32} />
                    </div>
                    <div className="play-button">▶</div>
                  </div>
                  <div style={{ fontWeight: '600' }}>Loading...</div>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>Loading...</div>
                  <div className="stats">
                    <span>Loading...</span>
                    <span>Loading...</span>
                  </div>
                </div>
              ))
            ) : error ? (
              <div className="card" style={{ gridColumn: 'span 3', textAlign: 'center', padding: '2rem' }}>
                <AlertCircle size={48} style={{ color: '#DC2626', marginBottom: '1rem' }} />
                <h3 style={{ color: '#DC2626', marginBottom: '1rem' }}>Error Loading Creators</h3>
                <p style={{ color: '#ccc', marginBottom: '1rem' }}>{error}</p>
                <button onClick={() => window.location.reload()} className="btn-primary">
                  Try Again
                </button>
              </div>
            ) : creators.length > 0 ? (
              creators.map((creator) => (
                <Link key={creator.profile.id} href={`/creator/${creator.profile.username}`} style={{ textDecoration: 'none' }}>
                  <div className="card">
                    <div className="card-image">
                      {creator.profile.avatar_url ? (
                        <Image
                          src={creator.profile.avatar_url}
                          alt={creator.profile.display_name || 'Creator'}
                          width={60}
                          height={60}
                          style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }}
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
                          {creator.profile.display_name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="play-button">▶</div>
                    </div>
                    <div style={{ fontWeight: '600' }}>{creator.profile.display_name}</div>
                    <div style={{ color: '#999', fontSize: '0.9rem' }}>
                      {creator.profile.location || 'Location not set'}
                    </div>
                    <div className="stats">
                      <span>{creator.stats.followers_count.toLocaleString()} followers</span>
                      <span>{creator.stats.tracks_count} tracks</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="card" style={{ gridColumn: 'span 3', textAlign: 'center', padding: '2rem' }}>
                <h3 style={{ color: '#EC4899', marginBottom: '1rem' }}>No Creators Found</h3>
                <p style={{ color: '#ccc' }}>Try adjusting your filters or search terms.</p>
              </div>
            )}
          </div>
        );

      case 'events':
        return (
          <div className="grid grid-3">
            {trendingLoading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="event-card">
                  <div className="event-card-content">
                    <div style={{ fontSize: '0.9rem', color: '#EC4899' }}>Loading...</div>
                    <div style={{ fontWeight: '600', margin: '0.5rem 0' }}>Loading...</div>
                    <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Loading...</div>
                    <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#EC4899', padding: '0.25rem 0.5rem', borderRadius: '15px', fontSize: '0.8rem' }}>Loading...</span>
                      <span style={{ color: '#999', fontSize: '0.8rem' }}>Loading...</span>
                    </div>
                  </div>
                </div>
              ))
            ) : trendingError ? (
              <div className="card" style={{ gridColumn: 'span 3', textAlign: 'center', padding: '2rem' }}>
                <AlertCircle size={48} style={{ color: '#DC2626', marginBottom: '1rem' }} />
                <h3 style={{ color: '#DC2626', marginBottom: '1rem' }}>Error Loading Events</h3>
                <p style={{ color: '#ccc', marginBottom: '1rem' }}>{trendingError}</p>
                <button onClick={() => getTrendingContent(20)} className="btn-primary">
                  Try Again
                </button>
              </div>
            ) : trendingResults?.events && trendingResults.events.length > 0 ? (
              trendingResults.events.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
                  <div className="event-card">
                    <div className="event-card-content">
                      <div style={{ fontSize: '0.9rem', color: '#EC4899' }}>{event.formatted_date}</div>
                      <div style={{ fontWeight: '600', margin: '0.5rem 0' }}>{event.title}</div>
                      <div style={{ color: '#ccc', fontSize: '0.9rem' }}>{event.location}</div>
                      <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#EC4899', padding: '0.25rem 0.5rem', borderRadius: '15px', fontSize: '0.8rem' }}>{event.formatted_price}</span>
                        <span style={{ color: '#999', fontSize: '0.8rem' }}>{event.attendee_count?.toLocaleString() || 0} attending</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="card" style={{ gridColumn: 'span 3', textAlign: 'center', padding: '2rem' }}>
                <h3 style={{ color: '#EC4899', marginBottom: '1rem' }}>No Trending Events</h3>
                <p style={{ color: '#ccc' }}>Check back later for trending events.</p>
              </div>
            )}
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
          <Image
            src="/images/logos/logo-trans-lockup.png"
            alt="SoundBridge"
            width={150}
            height={40}
            style={{ objectFit: 'contain' }}
          />
        </div>
        <nav className="nav">
          <Link href="/" style={{ textDecoration: 'none', color: 'white' }}>For You</Link>
          <a href="#" style={{ color: '#EC4899' }}>Discover</a>
          <Link href="/events" style={{ textDecoration: 'none', color: 'white' }}>Events</Link>
          <a href="#">Creators</a>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, maxWidth: '600px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
            <input
              type="search"
              className="search-bar"
              placeholder="Search creators, events, podcasts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              style={{ paddingLeft: '40px' }}
            />
          </div>
          <button
            className="btn-secondary"
            onClick={() => setShowFilters(!showFilters)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Filter size={16} />
            Filters
          </button>
        </div>
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
        {/* Filters Section */}
        {showFilters && (
          <section className="section">
            <AdvancedFilters
              categories={categories}
              genres={genres}
              locations={locations}
              dateRanges={dateRanges}
              priceRanges={priceRanges}
              sortOptions={sortOptions}
              selectedCategory={selectedCategory}
              selectedGenre={selectedGenre}
              selectedLocation={selectedLocation}
              selectedDate={selectedDate}
              selectedPrice={selectedPrice}
              sortBy={sortBy}
              onCategoryChange={setSelectedCategory}
              onGenreChange={setSelectedGenre}
              onLocationChange={setSelectedLocation}
              onDateChange={setSelectedDate}
              onPriceChange={setSelectedPrice}
              onSortChange={setSortBy}
              onClearFilters={handleClearFilters}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
            />
          </section>
        )}

        {/* Tab Navigation */}
        <section className="section">
          <div className="tab-navigation">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(category.id)}
                  className={`tab-button ${activeTab === category.id ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  {category.label}
                </button>
              );
            })}
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
            <div className="quick-action">Upload Music</div>
          </Link>
          <div className="quick-action">Start Podcast</div>
          <div className="quick-action">Create Event</div>
          <div className="quick-action">Find Collaborators</div>
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