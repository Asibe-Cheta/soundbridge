'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Footer } from '../../src/components/layout/Footer';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Music, 
  DollarSign, 
  Filter,
  Star,
  Users,
  Clock,
  TrendingUp
} from 'lucide-react';

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [sortBy, setSortBy] = useState('trending');

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
    { value: 'afrobeats', label: 'Afrobeats' },
    { value: 'gospel', label: 'Gospel' },
    { value: 'uk-drill', label: 'UK Drill' },
    { value: 'highlife', label: 'Highlife' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'hip-hop', label: 'Hip Hop' }
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

  const events = [
    {
      id: 1,
      title: 'Gospel Night Live',
      creator: 'Royal Festival Hall',
      date: 'Tonight • 8PM',
      location: 'London, UK',
      price: '£25-45',
      genre: 'Gospel',
      image: 'https://picsum.photos/400/300?random=gospel',
      attendees: 1200,
      rating: 4.8,
      featured: true
    },
    {
      id: 2,
      title: 'Afrobeats Carnival',
      creator: 'Tafawa Balewa Square',
      date: 'Friday • 7PM',
      location: 'Lagos, Nigeria',
      price: '₦5000-15000',
      genre: 'Afrobeats',
      image: 'https://picsum.photos/400/300?random=afrobeats',
      attendees: 5000,
      rating: 4.9,
      featured: true
    },
    {
      id: 3,
      title: 'UK Drill Showcase',
      creator: 'O2 Academy',
      date: 'Saturday • 6PM',
      location: 'Birmingham, UK',
      price: '£15-35',
      genre: 'UK Drill',
      image: 'https://picsum.photos/400/300?random=drill',
      attendees: 800,
      rating: 4.6,
      featured: false
    },
    {
      id: 4,
      title: 'Worship Experience',
      creator: 'House on the Rock',
      date: 'Sunday • 4PM',
      location: 'Abuja, Nigeria',
      price: 'Free Entry',
      genre: 'Gospel',
      image: 'https://picsum.photos/400/300?random=worship',
      attendees: 2000,
      rating: 4.7,
      featured: false
    },
    {
      id: 5,
      title: 'Jazz Fusion Night',
      creator: 'Blue Note Club',
      date: 'Wednesday • 9PM',
      location: 'Manchester, UK',
      price: '£30-60',
      genre: 'Jazz',
      image: 'https://picsum.photos/400/300?random=jazz',
      attendees: 300,
      rating: 4.5,
      featured: false
    },
    {
      id: 6,
      title: 'Highlife Festival',
      creator: 'National Theatre',
      date: 'Next Saturday • 5PM',
      location: 'Lagos, Nigeria',
      price: '₦3000-8000',
      genre: 'Highlife',
      image: 'https://picsum.photos/400/300?random=highlife',
      attendees: 1500,
      rating: 4.4,
      featured: false
    },
    {
      id: 7,
      title: 'Hip Hop Battle',
      creator: 'Underground Arena',
      date: 'Friday • 10PM',
      location: 'London, UK',
      price: '£20-40',
      genre: 'Hip Hop',
      image: 'https://picsum.photos/400/300?random=hiphop',
      attendees: 600,
      rating: 4.3,
      featured: false
    },
    {
      id: 8,
      title: 'Gospel Choir Competition',
      creator: 'Cathedral Hall',
      date: 'Sunday • 3PM',
      location: 'Abuja, Nigeria',
      price: '₦2000-5000',
      genre: 'Gospel',
      image: 'https://picsum.photos/400/300?random=choir',
      attendees: 800,
      rating: 4.6,
      featured: false
    }
  ];

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.creator.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = selectedLocation === 'all' || event.location.toLowerCase().includes(selectedLocation);
    const matchesGenre = selectedGenre === 'all' || event.genre.toLowerCase().includes(selectedGenre);
    const matchesPrice = selectedPrice === 'all' || 
                        (selectedPrice === 'free' && event.price.includes('Free')) ||
                        (selectedPrice === 'low' && event.price.includes('£') && parseInt(event.price.match(/\d+/)?.[0] || '0') < 20) ||
                        (selectedPrice === 'medium' && event.price.includes('£') && parseInt(event.price.match(/\d+/)?.[0] || '0') >= 20 && parseInt(event.price.match(/\d+/)?.[0] || '0') <= 50) ||
                        (selectedPrice === 'high' && event.price.includes('£') && parseInt(event.price.match(/\d+/)?.[0] || '0') > 50);

    return matchesSearch && matchesLocation && matchesGenre && matchesPrice;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sortBy) {
      case 'trending':
        return b.attendees - a.attendees;
      case 'rating':
        return b.rating - a.rating;
      case 'date':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'price':
        return a.price.localeCompare(b.price);
      default:
        return 0;
    }
  });

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
          <a href="#">Discover</a>
          <Link href="/events" className="active" style={{ textDecoration: 'none', color: '#EC4899' }}>
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
              {events.slice(0, 3).map((event) => (
                <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '50px', height: '50px', background: '#333', borderRadius: '8px' }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{event.title}</div>
                    <div style={{ color: '#999', fontSize: '0.8rem' }}>{event.date}</div>
                  </div>
                  <div style={{ color: '#EC4899', fontSize: '0.8rem' }}>{event.price}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="section">
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <Filter size={20} style={{ color: '#EC4899' }} />
              <h3 style={{ fontWeight: '600', color: '#EC4899' }}>Filters & Search</h3>
            </div>
            
            <div className="grid grid-4" style={{ gap: '1rem' }}>
              {/* Search */}
              <div>
                <label className="form-label">Search Events</label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search events, venues, artists..."
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              {/* Location Filter */}
              <div>
                <label className="form-label">Location</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="form-input"
                >
                  {locations.map((location) => (
                    <option key={location.value} value={location.value}>{location.label}</option>
                  ))}
                </select>
              </div>

              {/* Genre Filter */}
              <div>
                <label className="form-label">Genre</label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="form-input"
                >
                  {genres.map((genre) => (
                    <option key={genre.value} value={genre.value}>{genre.label}</option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <label className="form-label">Date</label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="form-input"
                >
                  {dateRanges.map((date) => (
                    <option key={date.value} value={date.value}>{date.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-3" style={{ gap: '1rem', marginTop: '1rem' }}>
              {/* Price Filter */}
              <div>
                <label className="form-label">Price Range</label>
                <select
                  value={selectedPrice}
                  onChange={(e) => setSelectedPrice(e.target.value)}
                  className="form-input"
                >
                  {priceRanges.map((price) => (
                    <option key={price.value} value={price.value}>{price.label}</option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="form-label">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="form-input"
                >
                  <option value="trending">Trending</option>
                  <option value="rating">Highest Rated</option>
                  <option value="date">Date</option>
                  <option value="price">Price</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div style={{ display: 'flex', alignItems: 'end' }}>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedLocation('all');
                    setSelectedGenre('all');
                    setSelectedDate('all');
                    setSelectedPrice('all');
                    setSortBy('trending');
                  }}
                  className="btn-secondary"
                  style={{ width: '100%' }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Events Grid */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">
              {filteredEvents.length} Events Found
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: '#999', fontSize: '0.9rem' }}>
                Showing {sortedEvents.length} of {events.length} events
              </span>
            </div>
          </div>

          <div className="grid grid-4">
            {sortedEvents.map((event) => (
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Star size={12} style={{ color: '#FFD700' }} />
                        {event.rating}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {sortedEvents.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
              <Music size={48} style={{ marginBottom: '1rem', opacity: '0.5' }} />
              <h3>No events found</h3>
              <p>Try adjusting your filters or search terms</p>
            </div>
          )}
        </section>

        {/* Footer */}
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
        
        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Popular Locations</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div>London, UK - 45 events</div>
          <div>Lagos, Nigeria - 32 events</div>
          <div>Abuja, Nigeria - 18 events</div>
          <div>Manchester, UK - 12 events</div>
        </div>
      </FloatingCard>
    </>
  );
} 