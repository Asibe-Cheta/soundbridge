'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Star,
  Filter,
  Search,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../src/contexts/AuthContext';
import { useEvents } from '../../src/hooks/useEvents';
import { Footer } from '../../src/components/layout/Footer';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import Image from 'next/image';

export default function EventsPage() {
  const { user } = useAuth();
  const [eventsState, eventsActions] = useEvents();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showFilters, setShowFilters] = useState(false);

  const locations = [
    { value: 'all', label: 'All Locations' },
    { value: 'london', label: 'London, UK' },
    { value: 'lagos', label: 'Lagos, Nigeria' },
    { value: 'abuja', label: 'Abuja, Nigeria' },
    { value: 'manchester', label: 'Manchester, UK' },
    { value: 'birmingham', label: 'Birmingham, UK' }
  ];

  const genres = [
    { value: 'all', label: 'All Genres' },
    { value: 'Gospel', label: 'Gospel' },
    { value: 'Hip-Hop', label: 'Hip Hop' },
    { value: 'Afrobeat', label: 'Afrobeat' },
    { value: 'Jazz', label: 'Jazz' },
    { value: 'Classical', label: 'Classical' },
    { value: 'Rock', label: 'Rock' },
    { value: 'Pop', label: 'Pop' },
    { value: 'Christian', label: 'Christian' },
    { value: 'Secular', label: 'Secular' },
    { value: 'Carnival', label: 'Carnival' },
    { value: 'Other', label: 'Other' }
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

  // Apply filters when they change
  useEffect(() => {
    const filters = {
      search: searchQuery || undefined,
      category: selectedGenre !== 'all' ? selectedGenre as string : undefined,
      location: selectedLocation !== 'all' ? selectedLocation : undefined,
      dateRange: selectedDate !== 'all' ? selectedDate as string : undefined,
      priceRange: selectedPrice !== 'all' ? selectedPrice as string : undefined,
      sortBy: sortBy as string
    };

    eventsActions.updateFilters(filters);
    eventsActions.fetchEvents(filters);
  }, [searchQuery, selectedLocation, selectedGenre, selectedDate, selectedPrice, sortBy, eventsActions]);

  const handleRSVP = async (eventId: string, status: 'attending' | 'interested' | 'not_going') => {
    if (!user) {
      // Redirect to login or show login modal
      return;
    }

    const result = await eventsActions.rsvpToEvent(eventId, status);
    if (!result.success) {
      console.error('RSVP failed:', result.error);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedLocation('all');
    setSelectedGenre('all');
    setSelectedDate('all');
    setSelectedPrice('all');
    setSortBy('date');
  };

  const filteredEvents = eventsState.events;
  const hasActiveFilters = searchQuery || selectedLocation !== 'all' || selectedGenre !== 'all' ||
    selectedDate !== 'all' || selectedPrice !== 'all';

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
          <Link href="/" style={{ textDecoration: 'none', color: 'white' }}>
            For You
          </Link>
          <a href="#">Discover</a>
          <Link href="/events" style={{ textDecoration: 'none', color: 'white' }}>
            Events
          </Link>
          <a href="#">Creators</a>
          <Link href="/upload" style={{ textDecoration: 'none', color: 'white' }}>
            Upload
          </Link>
        </nav>
        <input type="search" className="search-bar" placeholder="Search creators, events, podcasts..." />
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
        {/* Hero Section */}
        <section className="hero-section">
          <div className="featured-creator">
            <div className="featured-creator-content">
              <h2>Discover Amazing Events</h2>
              <p>Find the best music events, concerts, and performances across UK & Nigeria</p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <Link href="/events/create" style={{ textDecoration: 'none' }}>
                  <button className="btn-primary">Create Event</button>
                </Link>
                <Link href="/events/dashboard" style={{ textDecoration: 'none' }}>
                  <button className="btn-secondary">My Events</button>
                </Link>
              </div>
            </div>
          </div>
          <div className="trending-panel">
            <h3 style={{ marginBottom: '1rem', color: '#EC4899' }}>Trending Events</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredEvents.slice(0, 3).map((event) => (
                <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '50px', height: '50px', background: '#333', borderRadius: '8px' }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{event.title}</div>
                    <div style={{ color: '#999', fontSize: '0.8rem' }}>{event.formattedDate}</div>
                  </div>
                  <div style={{ color: '#EC4899', fontSize: '0.8rem' }}>
                    {event.attendeeCount} attending
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Search and Filters */}
        <section className="section">
          <div className="search-filters">
            <div className="search-bar-container">
              <Search size={20} style={{ color: '#999' }} />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Filter size={16} />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="filters-panel">
              <div className="filter-group">
                <label>Location</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  style={{ background: '#333', color: 'white', border: '1px solid #555', borderRadius: '8px', padding: '0.5rem' }}
                >
                  {locations.map((location) => (
                    <option key={location.value} value={location.value}>
                      {location.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Genre</label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  style={{ background: '#333', color: 'white', border: '1px solid #555', borderRadius: '8px', padding: '0.5rem' }}
                >
                  {genres.map((genre) => (
                    <option key={genre.value} value={genre.value}>
                      {genre.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Date</label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ background: '#333', color: 'white', border: '1px solid #555', borderRadius: '8px', padding: '0.5rem' }}
                >
                  {dateRanges.map((date) => (
                    <option key={date.value} value={date.value}>
                      {date.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Price</label>
                <select
                  value={selectedPrice}
                  onChange={(e) => setSelectedPrice(e.target.value)}
                  style={{ background: '#333', color: 'white', border: '1px solid #555', borderRadius: '8px', padding: '0.5rem' }}
                >
                  {priceRanges.map((price) => (
                    <option key={price.value} value={price.value}>
                      {price.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ background: '#333', color: 'white', border: '1px solid #555', borderRadius: '8px', padding: '0.5rem' }}
                >
                  <option value="date">Date</option>
                  <option value="price">Price</option>
                  <option value="attendees">Attendees</option>
                  <option value="rating">Rating</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="btn-secondary"
                  style={{ width: '100%' }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </section>

        {/* Events Grid */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">
              {eventsState.loading ? 'Loading events...' : `${filteredEvents.length} Events Found`}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {eventsState.error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
                  <AlertCircle size={16} />
                  <span>{eventsState.error}</span>
                </div>
              )}
            </div>
          </div>

          {eventsState.loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: '#EC4899' }} />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
              <p>No events found matching your criteria.</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="btn-primary" style={{ marginTop: '1rem' }}>
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-4">
              {filteredEvents.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
                  <div className="event-card">
                    <div className="event-card-content">
                      {event.isFeatured && (
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

                      <div className="event-image">
                        {event.image_url ? (
                          <img src={event.image_url} alt={event.title} />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '200px',
                            background: 'linear-gradient(45deg, #EC4899, #8B5CF6)',
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
                      </div>

                      <div className="event-info">
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                          {event.title}
                        </h3>
                        <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                          {event.creator?.display_name || 'Unknown Creator'}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#999' }}>
                          <Calendar size={14} />
                          <span>{event.formattedDate}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#999' }}>
                          <MapPin size={14} />
                          <span>{event.location}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#999' }}>
                          <DollarSign size={14} />
                          <span>{event.formattedPrice}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#999' }}>
                          <Users size={14} />
                          <span>{event.attendeeCount || 0} attending</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#999' }}>
                          <Star size={14} style={{ color: '#FFD700' }} />
                          <span>{event.rating?.toFixed(1) || '4.5'}</span>
                        </div>
                      </div>

                      <div className="event-actions">
                        {user ? (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleRSVP(event.id, event.isAttending ? 'not_going' : 'attending');
                            }}
                            className={event.isAttending ? 'btn-secondary' : 'btn-primary'}
                            style={{ width: '100%' }}
                          >
                            {event.isAttending ? 'Cancel RSVP' : 'RSVP'}
                          </button>
                        ) : (
                          <Link href="/login" style={{ textDecoration: 'none', width: '100%' }}>
                            <button className="btn-primary" style={{ width: '100%' }}>
                              Login to RSVP
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {eventsState.hasMore && !eventsState.loading && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button
                onClick={() => eventsActions.loadMore()}
                className="btn-secondary"
              >
                Load More Events
              </button>
            </div>
          )}
        </section>

        <Footer />
      </main>

      {/* Floating Quick Actions Card */}
      <FloatingCard title="Quick Actions">
        <div className="quick-actions">
          <Link href="/events/create" style={{ textDecoration: 'none' }}>
            <div className="quick-action">📅 Create Event</div>
          </Link>
          <Link href="/events/dashboard" style={{ textDecoration: 'none' }}>
            <div className="quick-action">📋 My Events</div>
          </Link>
          <div className="quick-action">🎵 Upload Music</div>
          <div className="quick-action">💬 Find Collaborators</div>
        </div>

        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Event Categories</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          {genres.slice(1).map((genre) => (
            <button
              key={genre.value}
              onClick={() => setSelectedGenre(genre.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: selectedGenre === genre.value ? '#EC4899' : '#ccc',
                textAlign: 'left',
                cursor: 'pointer',
                padding: '0.25rem 0'
              }}
            >
              {genre.label}
            </button>
          ))}
        </div>
      </FloatingCard>
    </>
  );
} 