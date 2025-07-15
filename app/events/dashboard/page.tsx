'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Footer } from '../../../src/components/layout/Footer';
import { FloatingCard } from '../../../src/components/ui/FloatingCard';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Star, 
  Heart, 
  Share2, 
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Plus,
  Filter,
  Search
} from 'lucide-react';

export default function EventDashboardPage() {
  const [activeTab, setActiveTab] = useState('attending');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'attending', label: 'Attending', icon: Users },
    { id: 'created', label: 'Created', icon: Calendar },
    { id: 'past', label: 'Past Events', icon: Clock }
  ];

  const attendingEvents = [
    {
      id: 1,
      title: 'Gospel Night Live',
      creator: 'Royal Festival Hall',
      date: 'Tonight • 8PM',
      location: 'London, UK',
      price: '£25-45',
      status: 'confirmed',
      rsvpDate: '2024-12-10'
    },
    {
      id: 2,
      title: 'Afrobeats Carnival',
      creator: 'Tafawa Balewa Square',
      date: 'Friday • 7PM',
      location: 'Lagos, Nigeria',
      price: '₦5000-15000',
      status: 'confirmed',
      rsvpDate: '2024-12-08'
    },
    {
      id: 3,
      title: 'Jazz Fusion Night',
      creator: 'Blue Note Club',
      date: 'Wednesday • 9PM',
      location: 'Manchester, UK',
      price: '£30-60',
      status: 'pending',
      rsvpDate: '2024-12-12'
    }
  ];

  const createdEvents = [
    {
      id: 4,
      title: 'Worship Experience',
      creator: 'House on the Rock',
      date: 'Sunday • 4PM',
      location: 'Abuja, Nigeria',
      price: 'Free Entry',
      status: 'published',
      attendees: 2000,
      views: 5000
    },
    {
      id: 5,
      title: 'Hip Hop Battle',
      creator: 'Underground Arena',
      date: 'Friday • 10PM',
      location: 'London, UK',
      price: '£20-40',
      status: 'draft',
      attendees: 0,
      views: 0
    }
  ];

  const pastEvents = [
    {
      id: 6,
      title: 'Gospel Choir Competition',
      creator: 'Cathedral Hall',
      date: 'December 1 • 3PM',
      location: 'Abuja, Nigeria',
      price: '₦2000-5000',
      status: 'completed',
      attendees: 800,
      rating: 4.6
    },
    {
      id: 7,
      title: 'UK Drill Showcase',
      creator: 'O2 Academy',
      date: 'November 25 • 6PM',
      location: 'Birmingham, UK',
      price: '£15-35',
      status: 'completed',
      attendees: 600,
      rating: 4.3
    }
  ];

  const getFilteredEvents = () => {
    let events: any[] = [];
    switch (activeTab) {
      case 'attending':
        events = attendingEvents;
        break;
      case 'created':
        events = createdEvents;
        break;
      case 'past':
        events = pastEvents;
        break;
      default:
        events = [];
    }

    return events.filter(event => 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.creator.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'published':
      case 'completed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'draft':
        return '#6B7280';
      default:
        return '#999';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'published':
      case 'completed':
        return <CheckCircle size={16} />;
      case 'pending':
        return <AlertCircle size={16} />;
      case 'draft':
        return <Eye size={16} />;
      default:
        return <Clock size={16} />;
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
        {/* Back Button */}
        <div style={{ marginBottom: '1rem' }}>
          <Link href="/events" style={{ textDecoration: 'none' }}>
            <button style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: 'none', 
              border: 'none', 
              color: '#EC4899', 
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}>
              <ArrowLeft size={16} />
              Back to Events
            </button>
          </Link>
        </div>

        <div className="section-header">
          <h1 className="section-title">My Events</h1>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Link href="/events/create" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={16} />
                Create Event
              </button>
            </Link>
          </div>
        </div>

        {/* Search & Filters */}
        <section className="section">
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <Filter size={20} style={{ color: '#EC4899' }} />
              <h3 style={{ fontWeight: '600', color: '#EC4899' }}>Search Events</h3>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Search</label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your events..."
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="btn-secondary"
              >
                Clear
              </button>
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="section">
          <div className="tab-navigation">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Events Grid */}
          <div className="grid grid-4">
            {getFilteredEvents().map((event) => (
              <div key={event.id} className="event-card">
                <div className="event-card-content">
                  <div style={{ 
                    position: 'absolute', 
                    top: '0.5rem', 
                    right: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    color: getStatusColor(event.status),
                    fontSize: '0.8rem',
                    fontWeight: '600'
                  }}>
                    {getStatusIcon(event.status)}
                    {event.status}
                  </div>
                  
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

                  {/* Event-specific info */}
                  {activeTab === 'attending' && (
                    <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.5rem' }}>
                      RSVP'd: {event.rsvpDate}
                    </div>
                  )}

                  {activeTab === 'created' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#999', marginTop: '0.5rem' }}>
                      <div>Views: {event.views}</div>
                      <div>Attendees: {event.attendees}</div>
                    </div>
                  )}

                  {activeTab === 'past' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#999', marginTop: '0.5rem' }}>
                      <div>Attendees: {event.attendees}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Star size={12} style={{ color: '#FFD700' }} />
                        {event.rating}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <Link href={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
                      <button className="btn-secondary" style={{ padding: '0.5rem', fontSize: '0.8rem' }}>
                        View
                      </button>
                    </Link>
                    
                    {activeTab === 'created' && event.status === 'draft' && (
                      <>
                        <button className="btn-secondary" style={{ padding: '0.5rem', fontSize: '0.8rem' }}>
                          <Edit size={12} />
                        </button>
                        <button className="btn-secondary" style={{ padding: '0.5rem', fontSize: '0.8rem' }}>
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {getFilteredEvents().length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
              <Calendar size={48} style={{ marginBottom: '1rem', opacity: '0.5' }} />
              <h3>No {activeTab} events found</h3>
              <p>Try adjusting your search or create a new event</p>
            </div>
          )}
        </section>

        {/* Stats Summary */}
        <section className="section">
          <div className="grid grid-4">
            <div className="card">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#EC4899', marginBottom: '0.5rem' }}>
                  {attendingEvents.length}
                </div>
                <div style={{ color: '#999', fontSize: '0.9rem' }}>Attending</div>
              </div>
            </div>
            <div className="card">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#EC4899', marginBottom: '0.5rem' }}>
                  {createdEvents.length}
                </div>
                <div style={{ color: '#999', fontSize: '0.9rem' }}>Created</div>
              </div>
            </div>
            <div className="card">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#EC4899', marginBottom: '0.5rem' }}>
                  {pastEvents.length}
                </div>
                <div style={{ color: '#999', fontSize: '0.9rem' }}>Past Events</div>
              </div>
            </div>
            <div className="card">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#EC4899', marginBottom: '0.5rem' }}>
                  {pastEvents.reduce((sum, event) => sum + (event.attendees || 0), 0).toLocaleString()}
                </div>
                <div style={{ color: '#999', fontSize: '0.9rem' }}>Total Attendees</div>
              </div>
            </div>
          </div>
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
          <Link href="/events" style={{ textDecoration: 'none' }}>
            <div className="quick-action">🔍 Browse Events</div>
          </Link>
          <div className="quick-action">🎵 Upload Music</div>
          <div className="quick-action">💬 Find Collaborators</div>
        </div>
        
        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Event Status</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={12} style={{ color: '#10B981' }} />
            Confirmed: 2 events
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={12} style={{ color: '#F59E0B' }} />
            Pending: 1 event
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={12} style={{ color: '#6B7280' }} />
            Draft: 1 event
          </div>
        </div>
      </FloatingCard>
    </>
  );
} 