'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  Search,
  Filter,
  TrendingUp,
  Music,
  Users,
  Calendar,
  Mic,
  AlertCircle,
  User,
  Plus,
  LogOut,
  Bell,
  Settings,
  Play,
  Pause,
  Heart,
  Share2,
  Loader2,
  Upload,
  Menu,
  X,
  Home
} from 'lucide-react';
import { useAuth } from '../../src/contexts/AuthContext';
import { useEvents } from '../../src/hooks/useEvents';
import { Footer } from '../../src/components/layout/Footer';
import SearchDropdown from '../../src/components/search/SearchDropdown';
import { ThemeToggle } from '../../src/components/ui/ThemeToggle';
import type { EventCategory } from '../../src/lib/types/event';

// Virtual grid constants
const EVENT_CARD_WIDTH = 320;     // Width of each event card
const EVENT_ITEM_HEIGHT = 350;    // Height of each event card
const EVENT_CONTAINER_HEIGHT = 700;
const GRID_GAP = 20;              // Gap between grid items

// Event card component for virtual grid
interface VirtualEventItemProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    events: any[];
    columnsCount: number;
  };
}

const VirtualEventItem = ({ columnIndex, rowIndex, style, data }: VirtualEventItemProps) => {
  const { events, columnsCount } = data;
  const index = rowIndex * columnsCount + columnIndex;
  const event = events[index];

  if (!event) {
    return <div style={style}></div>;
  }

  return (
    <div style={{ ...style, padding: `${GRID_GAP / 2}px` }}>
      <Link 
        href={`/events/${event.id}`} 
        style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
      >
        <div className="event-card" style={{ 
          width: '100%',
          height: `${EVENT_ITEM_HEIGHT - GRID_GAP}px`,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          borderRadius: '16px',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
          e.currentTarget.style.borderColor = 'var(--accent-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = 'var(--border-primary)';
        }}
        >
          {/* Event Image */}
          <div style={{
            width: '100%',
            height: '180px',
            background: 'linear-gradient(45deg, #EC4899, #8B5CF6)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {event.image_url ? (
              <Image
                src={event.image_url}
                alt={event.title}
                fill
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'white',
                fontSize: '3rem'
              }}>
                <Music />
              </div>
            )}
            
            {/* Event Category Badge */}
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              {event.category}
            </div>

            {/* Price Badge */}
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}>
              {event.price === 0 ? 'Free' : `$${event.price}`}
            </div>
          </div>

          {/* Event Details */}
          <div style={{ padding: '1rem' }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              lineHeight: '1.3',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden'
            }}>
              {event.title}
            </h3>

            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              marginBottom: '0.75rem',
              lineHeight: '1.4',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden'
            }}>
              {event.description}
            </p>

            {/* Event Meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <Calendar size={14} />
                <span>{new Date(event.date).toLocaleDateString()}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <User size={14} />
                <span>{event.location}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <Users size={14} />
                <span>{event.attendeeCount || 0} attendees</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default function EventsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [showFilters, setShowFilters] = useState(false);

  // Get events data from the hook
  const [eventsState, eventsActions] = useEvents();

  // Events are loaded automatically by the useEvents hook

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Filter and sort events
  const filteredEvents = React.useMemo(() => {
    let filtered = [...(eventsState.events || [])];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query)
      );
    }

    // Genre filter
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(event => event.category === selectedGenre);
    }

    // Location filter
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(event => event.location === selectedLocation);
    }

    // Date filter
    if (selectedDate !== 'all') {
      const now = new Date();
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date);
        switch (selectedDate) {
          case 'today':
            return eventDate.toDateString() === now.toDateString();
          case 'tomorrow':
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return eventDate.toDateString() === tomorrow.toDateString();
          case 'this-week':
            const weekFromNow = new Date(now);
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            return eventDate >= now && eventDate <= weekFromNow;
          case 'this-month':
            const monthFromNow = new Date(now);
            monthFromNow.setMonth(monthFromNow.getMonth() + 1);
            return eventDate >= now && eventDate <= monthFromNow;
          default:
            return true;
        }
      });
    }

    // Price filter
    if (selectedPrice !== 'all') {
      filtered = filtered.filter(event => {
        const price = (event as any).price || 0;
        switch (selectedPrice) {
          case 'free':
            return price === 0;
          case 'under-50':
            return price > 0 && price < 50;
          case 'over-50':
            return price >= 50;
          default:
            return true;
        }
      });
    }

    // Sort events
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'upcoming':
        filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'popular':
        filtered.sort((a, b) => (b.attendeeCount || 0) - (a.attendeeCount || 0));
        break;
      case 'price-low':
        filtered.sort((a, b) => ((a as any).price || 0) - ((b as any).price || 0));
        break;
      case 'price-high':
        filtered.sort((a, b) => ((b as any).price || 0) - ((a as any).price || 0));
        break;
    }

    return filtered;
  }, [eventsState.events, searchQuery, selectedGenre, selectedLocation, selectedDate, selectedPrice, sortBy]);

  // Calculate grid dimensions
  const calculateColumns = useCallback((containerWidth: number) => {
    const availableWidth = containerWidth - GRID_GAP;
    const cardWidthWithGap = EVENT_CARD_WIDTH + GRID_GAP;
    return Math.max(1, Math.floor(availableWidth / cardWidthWithGap));
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Trigger re-render when window resizes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('resize'));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGenre('all');
    setSelectedLocation('all');
    setSelectedDate('all');
    setSelectedPrice('all');
    setSortBy('recent');
  };

  const hasActiveFilters = searchQuery || selectedGenre !== 'all' || selectedLocation !== 'all' || selectedDate !== 'all' || selectedPrice !== 'all';

  // Event categories
  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'music', label: 'Music' },
    { value: 'comedy', label: 'Comedy' },
    { value: 'sports', label: 'Sports' },
    { value: 'art', label: 'Art & Culture' },
    { value: 'food', label: 'Food & Drink' },
    { value: 'business', label: 'Business' },
    { value: 'education', label: 'Education' },
    { value: 'technology', label: 'Technology' },
    { value: 'health', label: 'Health & Wellness' }
  ];

  const locations = [
    { value: 'all', label: 'All Locations' },
    { value: 'london', label: 'London, UK' },
    { value: 'lagos', label: 'Lagos, Nigeria' },
    { value: 'abuja', label: 'Abuja, Nigeria' },
    { value: 'manchester', label: 'Manchester, UK' },
    { value: 'birmingham', label: 'Birmingham, UK' },
    { value: 'liverpool', label: 'Liverpool, UK' }
  ];

  const dateFilters = [
    { value: 'all', label: 'All Dates' },
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'this-week', label: 'This Week' },
    { value: 'this-month', label: 'This Month' }
  ];

  const priceFilters = [
    { value: 'all', label: 'All Prices' },
    { value: 'free', label: 'Free' },
    { value: 'under-50', label: 'Under $50' },
    { value: 'over-50', label: 'Over $50' }
  ];

  return (
    <>
      {/* Main Content */}
      <main className="main-container">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="featured-creator">
            <div className="featured-creator-content">
              <h2>Discover Amazing Events</h2>
              <p>Find and attend the best events in your area</p>
            </div>
          </div>
        </section>

        {/* Search and Filters */}
        <section className="section">
          <div className="search-filters">
            <div className="search-bar-container">
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#999', zIndex: 1 }} />
              <input
                  type="search" 
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '16px 16px 16px 48px',
                    fontSize: '16px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }} 
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-primary)'}
                />
              </div>
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
                <label>Category</label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  style={{ background: '#333', color: 'white', border: '1px solid #555', borderRadius: '8px', padding: '0.5rem' }}
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

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
                <label>Date</label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ background: '#333', color: 'white', border: '1px solid #555', borderRadius: '8px', padding: '0.5rem' }}
                >
                  {dateFilters.map((date) => (
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
                  {priceFilters.map((price) => (
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
                  <option value="recent">Most Recent</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="popular">Most Popular</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
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
          <div className="events-grid-container" style={{ height: EVENT_CONTAINER_HEIGHT }}>
            {eventsState.loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
                  <Loader2 size={24} className="animate-spin" />
                  <span>Loading events...</span>
                </div>
              </div>
            ) : eventsState.error ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--error)' }}>
                  <AlertCircle size={24} />
                  <span>Error loading events: {eventsState.error}</span>
                </div>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Calendar size={48} style={{ marginBottom: '1rem', opacity: '0.5' }} />
                  <h3>No events found</h3>
                  <p>Try adjusting your search criteria or filters.</p>
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="btn-primary" style={{ marginTop: '1rem' }}>
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <AutoSizer>
                {({ height, width }) => {
                  const columnsCount = Math.max(1, Math.floor((width - GRID_GAP) / (EVENT_CARD_WIDTH + GRID_GAP)));
                  const rowCount = Math.ceil(filteredEvents.length / columnsCount);

                  return (
                    <Grid
                      columnCount={columnsCount}
                      columnWidth={EVENT_CARD_WIDTH}
                      height={height}
                      rowCount={rowCount}
                      rowHeight={EVENT_ITEM_HEIGHT}
                      width={width}
                      itemData={{
                        events: filteredEvents,
                        columnsCount
                      }}
                    >
                      {VirtualEventItem}
                    </Grid>
                  );
                }}
              </AutoSizer>
            )}
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}