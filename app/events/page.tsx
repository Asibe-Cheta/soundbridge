'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Star,
  Filter,
  Search,
  AlertCircle,
  Loader2,
  Music,
  Settings
} from 'lucide-react';
import { useAuth } from '../../src/contexts/AuthContext';
import { useEvents } from '../../src/hooks/useEvents';
import { Footer } from '../../src/components/layout/Footer';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import type { EventCategory } from '../../src/lib/types/event';

// Virtual grid constants
const EVENT_CARD_WIDTH = 320;     // Width of each event card
const EVENT_ITEM_HEIGHT = 350;    // Height of each event card
const EVENT_CONTAINER_HEIGHT = 700;
const GRID_GAP = 20;              // Gap between grid items

// Virtual event item component for grid
interface VirtualEventItemProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    events: any[];
    columnsCount: number;
    onEventClick: (event: any) => void;
  };
}

const VirtualEventItem = ({ columnIndex, rowIndex, style, data }: VirtualEventItemProps) => {
  const { events, columnsCount, onEventClick } = data;
  const index = rowIndex * columnsCount + columnIndex;
  const event = events[index];

  if (!event) {
    // Empty cell (no event data)
    return <div style={style}></div>;
  }

  return (
    <div style={{...style, padding: '0.75rem'}}>
      <div 
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '1.5rem',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          height: '300px',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={() => onEventClick(event)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-8px)';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.border = '1px solid rgba(236, 72, 153, 0.3)';
          e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Event Image */}
        <div style={{ 
          height: '140px', 
          borderRadius: '12px', 
          overflow: 'hidden', 
          marginBottom: '1rem',
          position: 'relative'
        }}>
          {event.image_url ? (
            <Image
              src={event.image_url}
              alt={event.title}
              width={300}
              height={140}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Music size={32} style={{ color: 'white' }} />
            </div>
          )}
          
          {/* Price Badge */}
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: event.price > 0 ? 'rgba(236, 72, 153, 0.9)' : 'rgba(34, 197, 94, 0.9)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            {event.price > 0 ? `£${event.price}` : 'FREE'}
          </div>

          {/* Date Badge */}
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            {new Date(event.date).toLocaleDateString('en-GB', { 
              day: 'numeric',
              month: 'short'
            })}
          </div>
        </div>

        {/* Event Details */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: '600', 
            marginBottom: '0.5rem',
            lineHeight: '1.3',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {event.title}
          </h3>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '0.5rem',
            color: '#999',
            fontSize: '0.85rem'
          }}>
            <MapPin size={14} style={{ marginRight: '0.25rem' }} />
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {event.venue}, {event.location}
            </span>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '0.5rem',
            color: '#999',
            fontSize: '0.85rem'
          }}>
            <Calendar size={14} style={{ marginRight: '0.25rem' }} />
            <span>
              {new Date(event.date).toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })} • {event.time}
            </span>
          </div>

          {event.capacity && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              color: '#999',
              fontSize: '0.85rem',
              marginTop: 'auto'
            }}>
              <Users size={14} style={{ marginRight: '0.25rem' }} />
              <span>{event.capacity} capacity</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function EventsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [eventsState, eventsActions] = useEvents();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showFilters, setShowFilters] = useState(false);
  const [columnsCount, setColumnsCount] = useState(3); // Number of columns in grid
  // Note: Navigation and authentication are handled by the layout Header component

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

  // Calculate columns based on container width
  const calculateColumns = (containerWidth: number) => {
    const availableWidth = containerWidth - GRID_GAP;
    const cardWidthWithGap = EVENT_CARD_WIDTH + GRID_GAP;
    return Math.max(1, Math.floor(availableWidth / cardWidthWithGap));
  };

  // Apply filters when they change
  useEffect(() => {
    const filters = {
      search: searchQuery || undefined,
      category: selectedGenre !== 'all' ? selectedGenre as EventCategory : undefined,
      location: selectedLocation !== 'all' ? selectedLocation : undefined,
      dateRange: selectedDate !== 'all' ? selectedDate as 'today' | 'week' | 'month' | 'next-month' : undefined,
      priceRange: selectedPrice !== 'all' ? selectedPrice as 'free' | 'low' | 'medium' | 'high' : undefined,
      sortBy: sortBy as 'date' | 'price' | 'attendees' | 'rating'
    };

    eventsActions.updateFilters(filters);
    eventsActions.fetchEvents(filters);
  }, [searchQuery, selectedLocation, selectedGenre, selectedDate, selectedPrice, sortBy]);

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
  
  // Calculate grid dimensions
  const rowCount = Math.ceil(filteredEvents.length / columnsCount);

  return (
    <>
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
            <>
              {/* Virtual Grid Container */}
              <div style={{
                width: '100%',
                height: `${EVENT_CONTAINER_HEIGHT}px`,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <AutoSizer>
                  {({ height, width }) => {
                    // Recalculate columns based on actual container width
                    const actualColumns = calculateColumns(width);
                    if (actualColumns !== columnsCount) {
                      setColumnsCount(actualColumns);
                    }
                    
                    return (
                      <Grid
                        columnCount={columnsCount}
                        columnWidth={(width - GRID_GAP) / columnsCount}
                        height={height}
                        rowCount={rowCount}
                        rowHeight={EVENT_ITEM_HEIGHT}
                        width={width}
                        itemData={{
                          events: filteredEvents,
                          columnsCount,
                          onEventClick: (event: any) => router.push(`/events/${event.id}`)
                        }}
                      >
                        {VirtualEventItem}
                      </Grid>
                    );
                  }}
                </AutoSizer>
              </div>

              {/* Performance Info (Development Only) */}
              {process.env.NODE_ENV === 'development' && (
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginTop: '2rem',
                  fontSize: '0.8rem',
                  color: '#22c55e'
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#22c55e' }}>🚀 Virtual Grid Active (Events)</h4>
                  <p style={{ margin: '0.25rem 0' }}>• Only rendering ~{Math.ceil(EVENT_CONTAINER_HEIGHT / EVENT_ITEM_HEIGHT) * columnsCount} items instead of {filteredEvents.length}</p>
                  <p style={{ margin: '0.25rem 0' }}>• Grid: {columnsCount} columns × {rowCount} rows</p>
                  <p style={{ margin: '0.25rem 0' }}>• Memory usage: ~{Math.round(((Math.ceil(EVENT_CONTAINER_HEIGHT / EVENT_ITEM_HEIGHT) * columnsCount) / Math.max(1, filteredEvents.length)) * 100)}% of traditional rendering</p>
                  <p style={{ margin: '0.25rem 0' }}>• Supports {filteredEvents.length} events without performance loss</p>
                </div>
              )}
            </>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/events/create" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'transparent',
              border: '1px solid white',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              width: '100%',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(45deg, #DC2626, #EC4899)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            >
              <Calendar size={18} color="white" />
              Create Event
            </div>
          </Link>
          <Link href="/events/dashboard" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'transparent',
              border: '1px solid white',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              width: '100%',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(45deg, #DC2626, #EC4899)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            >
              <Settings size={18} color="white" />
              My Events
            </div>
          </Link>
          <div style={{
            background: 'transparent',
            border: '1px solid white',
            padding: '0.375rem 0.75rem',
            borderRadius: '8px',
            textAlign: 'center',
            cursor: 'pointer',
            color: 'white',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(45deg, #DC2626, #EC4899)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          >
            <Music size={18} color="white" />
            Upload Music
          </div>
          <div style={{
            background: 'transparent',
            border: '1px solid white',
            padding: '0.375rem 0.75rem',
            borderRadius: '8px',
            textAlign: 'center',
            cursor: 'pointer',
            color: 'white',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(45deg, #DC2626, #EC4899)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          >
            <Users size={18} color="white" />
            Find Collaborators
          </div>
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
                color: selectedGenre === genre.value ? '#EC4899' : 'rgba(255, 255, 255, 0.7)',
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