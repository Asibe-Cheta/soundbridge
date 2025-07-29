'use client';

import React, { useState, use, useEffect } from 'react';
import Link from 'next/link';
import { Footer } from '../../../src/components/layout/Footer';
import { FloatingCard } from '../../../src/components/ui/FloatingCard';
import { useAuth } from '../../../src/contexts/AuthContext';
import { eventService } from '../../../src/lib/event-service';
import type { Event } from '../../../src/lib/types/event';
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Star,
  Heart,
  Share2,
  MessageCircle,
  Phone,
  Mail,
  Globe,
  Instagram,
  Twitter,
  Youtube,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock as ClockIcon,
  User,
  Music,
  DollarSign,
  Info,
  Loader2,
  Edit,
  Trash2
} from 'lucide-react';

export default function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRSVPed, setIsRSVPed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [rsvpLoading, setRsvpLoading] = useState(false);

  const resolvedParams = use(params);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await eventService.getEventById(resolvedParams.id);

        if (result.error) {
          setError(result.error);
          return;
        }

        if (!result.data) {
          setError('Event not found');
          return;
        }

        setEvent(result.data);
        setIsRSVPed(result.data.isAttending || false);
      } catch (err) {
        setError('Failed to load event');
        console.error('Error fetching event:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [resolvedParams.id]);

  const handleRSVP = async () => {
    if (!user) {
      // Redirect to login
      return;
    }

    if (!event) return;

    try {
      setRsvpLoading(true);
      const status = isRSVPed ? 'not_going' : 'attending';
      const result = await eventService.rsvpToEvent(event.id, status);

      if (result.success) {
        setIsRSVPed(!isRSVPed);
        // Update the event data
        setEvent(prev => prev ? {
          ...prev,
          isAttending: !isRSVPed,
          attendeeCount: isRSVPed ? (prev.attendeeCount || 1) - 1 : (prev.attendeeCount || 0) + 1
        } : null);
      } else {
        console.error('RSVP failed:', result.error);
      }
    } catch (err) {
      console.error('RSVP error:', err);
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const tabs = [
    { id: 'details', label: 'Details', icon: Info },
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'performers', label: 'Performers', icon: Music },
    { id: 'location', label: 'Location', icon: MapPin }
  ];

  const renderTabContent = () => {
    if (!event) return null;

    switch (activeTab) {
      case 'details':
        return (
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Event Description</h3>
            <div style={{ lineHeight: '1.6', color: '#ccc', marginBottom: '2rem' }}>
              {event.description ? (
                event.description.split('\n').map((paragraph, index) => (
                  <p key={index} style={{ marginBottom: '1rem' }}>{paragraph}</p>
                ))
              ) : (
                <p>No description available for this event.</p>
              )}
            </div>

            <h4 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Event Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <Music size={16} style={{ color: '#EC4899' }} />
                <span>{event.category}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <Users size={16} style={{ color: '#EC4899' }} />
                <span>{event.attendeeCount || 0} attending</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <DollarSign size={16} style={{ color: '#EC4899' }} />
                <span>{event.formattedPrice}</span>
              </div>
              {event.max_attendees && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                  <Users size={16} style={{ color: '#EC4899' }} />
                  <span>Max {event.max_attendees} attendees</span>
                </div>
              )}
            </div>
          </div>
        );

      case 'schedule':
        return (
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Event Schedule</h3>
            <div style={{ color: '#ccc' }}>
              <p>Event starts at {new Date(event.event_date).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}</p>
              <p>Please arrive 15-30 minutes before the event starts.</p>
            </div>
          </div>
        );

      case 'performers':
        return (
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Event Organizer</h3>
            {event.creator ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#333' }}></div>
                <div>
                  <h4 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{event.creator.display_name}</h4>
                  <p style={{ color: '#ccc', fontSize: '0.9rem' }}>{event.creator.bio || 'Event organizer'}</p>
                  {event.creator.location && (
                    <p style={{ color: '#999', fontSize: '0.8rem' }}>
                      <MapPin size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      {event.creator.location}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ color: '#ccc' }}>Organizer information not available.</p>
            )}
          </div>
        );

      case 'location':
        return (
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Event Location</h3>
            <div style={{ color: '#ccc', marginBottom: '1rem' }}>
              <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{event.venue || event.location}</p>
              <p>{event.location}</p>
            </div>
            {event.latitude && event.longitude ? (
              <div style={{
                width: '100%',
                height: '200px',
                background: '#333',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999'
              }}>
                Map placeholder - Coordinates: {event.latitude}, {event.longitude}
              </div>
            ) : (
              <div style={{
                width: '100%',
                height: '200px',
                background: '#333',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999'
              }}>
                Map not available
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <>
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

        <main className="main-container">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <Loader2 size={48} className="animate-spin" style={{ color: '#EC4899' }} />
          </div>
        </main>
      </>
    );
  }

  if (error || !event) {
    return (
      <>
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

        <main className="main-container">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
            <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Event Not Found</h2>
            <p style={{ color: '#999', marginBottom: '2rem' }}>{error || 'The event you are looking for does not exist.'}</p>
            <Link href="/events" style={{ textDecoration: 'none' }}>
              <button className="btn-primary">Back to Events</button>
            </Link>
          </div>
        </main>
      </>
    );
  }

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
        <section className="section">
          <Link href="/events" style={{ textDecoration: 'none' }}>
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowLeft size={16} />
              Back to Events
            </button>
          </Link>
        </section>

        {/* Event Header */}
        <section className="hero-section">
          <div className="featured-creator">
            <div className="featured-creator-content">
              {event.isFeatured && (
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '15px',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  Featured Event
                </div>
              )}
              <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>{event.title}</h1>
              <p style={{ fontSize: '1.2rem', color: '#ccc', marginBottom: '1rem' }}>
                {event.creator?.display_name || 'Unknown Creator'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={20} />
                  <span>{event.formattedDate}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={20} />
                  <span>{event.location}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} />
                  <span>{(event.attendeeCount || 0).toLocaleString()} attending</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {user ? (
                  <button
                    className={isRSVPed ? 'btn-secondary' : 'btn-primary'}
                    onClick={handleRSVP}
                    disabled={rsvpLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {rsvpLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : isRSVPed ? (
                      <CheckCircle size={16} />
                    ) : (
                      <Calendar size={16} />
                    )}
                    {isRSVPed ? 'Cancel RSVP' : 'RSVP Now'}
                  </button>
                ) : (
                  <Link href="/login" style={{ textDecoration: 'none' }}>
                    <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={16} />
                      Login to RSVP
                    </button>
                  </Link>
                )}
                <button
                  className="btn-secondary"
                  onClick={handleLike}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Heart size={16} style={{ color: isLiked ? '#EC4899' : 'white' }} />
                  Like
                </button>
                <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Share2 size={16} />
                  Share
                </button>
              </div>
            </div>
          </div>
          <div className="trending-panel">
            <h3 style={{ marginBottom: '1rem', color: '#EC4899' }}>Event Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Price</span>
                <span style={{ color: '#EC4899', fontWeight: '600' }}>{event.formattedPrice}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Genre</span>
                <span>{event.category}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Rating</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Star size={14} style={{ color: '#FFD700' }} />
                  {event.rating?.toFixed(1) || '4.5'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Capacity</span>
                <span>{(event.attendeeCount || 0).toLocaleString()}/{event.max_attendees?.toLocaleString() || '∞'}</span>
              </div>
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

          {/* Tab Content */}
          {renderTabContent()}
        </section>

        {/* Organizer Info */}
        <section className="section">
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Event Organizer</h3>
            {event.creator ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#333' }}></div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{event.creator.display_name}</h4>
                  <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    {event.creator.bio || 'Event organizer'}
                  </p>
                  {event.creator.location && (
                    <p style={{ color: '#999', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                      <MapPin size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      {event.creator.location}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>
                      <MessageCircle size={12} />
                      Contact
                    </button>
                    <Link href={`/creator/${event.creator.username}`} style={{ textDecoration: 'none' }}>
                      <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>
                        <User size={12} />
                        View Profile
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: '#ccc' }}>Organizer information not available.</p>
            )}
          </div>
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

        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Similar Events</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div>Gospel Choir Competition - Abuja</div>
          <div>Worship Experience - Lagos</div>
          <div>Christian Music Festival - London</div>
        </div>
      </FloatingCard>
    </>
  );
} 