'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { Footer } from '../../../src/components/layout/Footer';
import { FloatingCard } from '../../../src/components/ui/FloatingCard';
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
  Info
} from 'lucide-react';

export default function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const [isRSVPed, setIsRSVPed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const resolvedParams = use(params);

  // Mock event data
  const event = {
    id: resolvedParams.id,
    title: 'Gospel Night Live',
    creator: 'Royal Festival Hall',
    creatorId: 'royal-festival-hall',
    date: 'Tonight • 8PM',
    fullDate: 'December 15, 2024 • 8:00 PM',
    location: 'London, UK',
    address: 'Southbank Centre, Belvedere Rd, London SE1 8XX, UK',
    price: '£25-45',
    genre: 'Gospel',
    image: 'https://picsum.photos/800/400?random=gospel-event',
    attendees: 1200,
    maxAttendees: 1500,
    rating: 4.8,
    featured: true,
    description: 'Experience an unforgettable evening of gospel music featuring some of the most talented artists from across the UK and Nigeria. This special event brings together traditional gospel choirs with contemporary gospel fusion, creating a powerful and uplifting atmosphere.',
    longDescription: `Join us for an extraordinary evening of gospel music that transcends boundaries and brings together communities through the power of music. 

This special event features:
• Traditional gospel choirs from London and Birmingham
• Contemporary gospel fusion artists
• Special guest performances from Nigerian gospel stars
• Interactive worship sessions
• Community networking opportunities

The evening will include performances from:
- London Community Gospel Choir
- Birmingham Gospel Collective
- Special guest: Ada Grace (Nigerian Gospel Sensation)
- Manchester Gospel Fusion Band

Food and refreshments will be available throughout the evening. Early arrival is recommended as seating is limited.`,
    organizer: {
      name: 'Royal Festival Hall',
      bio: 'Leading venue for gospel and spiritual music events in London',
      contact: '+44 20 7960 4200',
      email: 'events@royalfestivalhall.co.uk',
      website: 'www.royalfestivalhall.co.uk',
      social: {
        instagram: '@royalfestivalhall',
        twitter: '@RFH_London',
        youtube: 'Royal Festival Hall'
      }
    },
    performers: [
      { name: 'London Community Gospel Choir', type: 'Choir' },
      { name: 'Birmingham Gospel Collective', type: 'Band' },
      { name: 'Ada Grace', type: 'Solo Artist' },
      { name: 'Manchester Gospel Fusion', type: 'Band' }
    ],
    schedule: [
      { time: '7:00 PM', activity: 'Doors Open & Registration' },
      { time: '7:30 PM', activity: 'Opening Prayer & Welcome' },
      { time: '8:00 PM', activity: 'London Community Gospel Choir' },
      { time: '8:30 PM', activity: 'Birmingham Gospel Collective' },
      { time: '9:00 PM', activity: 'Special Guest: Ada Grace' },
      { time: '9:30 PM', activity: 'Manchester Gospel Fusion' },
      { time: '10:00 PM', activity: 'Community Worship Session' },
      { time: '10:30 PM', activity: 'Networking & Refreshments' }
    ],
    coordinates: { lat: 51.5055, lng: -0.1168 }
  };

  const tabs = [
    { id: 'details', label: 'Details', icon: Info },
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'performers', label: 'Performers', icon: Music },
    { id: 'location', label: 'Location', icon: MapPin }
  ];

  const handleRSVP = () => {
    setIsRSVPed(!isRSVPed);
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return (
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Event Description</h3>
            <div style={{ lineHeight: '1.6', color: '#ccc', marginBottom: '2rem' }}>
              {event.longDescription.split('\n').map((paragraph, index) => (
                <p key={index} style={{ marginBottom: '1rem' }}>{paragraph}</p>
              ))}
            </div>
            
            <h4 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>What to Expect</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <Music size={16} style={{ color: '#EC4899' }} />
                <span>Live Gospel Music</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <Users size={16} style={{ color: '#EC4899' }} />
                <span>Community Networking</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <Heart size={16} style={{ color: '#EC4899' }} />
                <span>Interactive Worship</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <DollarSign size={16} style={{ color: '#EC4899' }} />
                <span>Food & Refreshments</span>
              </div>
            </div>
          </div>
        );

      case 'schedule':
        return (
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Event Schedule</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {event.schedule.map((item, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '1rem', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  borderRadius: '8px',
                  border: index === 2 ? '1px solid #EC4899' : '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ 
                    minWidth: '80px', 
                    textAlign: 'center', 
                    fontWeight: '600', 
                    color: index === 2 ? '#EC4899' : '#ccc'
                  }}>
                    {item.time}
                  </div>
                  <div style={{ 
                    flex: 1, 
                    color: index === 2 ? '#EC4899' : '#ccc',
                    fontWeight: index === 2 ? '600' : 'normal'
                  }}>
                    {item.activity}
                  </div>
                  {index === 2 && (
                    <div style={{ 
                      background: 'linear-gradient(45deg, #DC2626, #EC4899)', 
                      color: 'white', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '10px', 
                      fontSize: '0.8rem' 
                    }}>
                      Featured
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'performers':
        return (
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Performers</h3>
            <div className="grid grid-2">
              {event.performers.map((performer, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '1rem', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  borderRadius: '8px' 
                }}>
                  <div style={{ 
                    width: '50px', 
                    height: '50px', 
                    background: 'linear-gradient(45deg, #DC2626, #EC4899)', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 'bold'
                  }}>
                    {performer.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{performer.name}</div>
                    <div style={{ color: '#999', fontSize: '0.9rem' }}>{performer.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Location & Directions</h3>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <MapPin size={16} style={{ color: '#EC4899' }} />
                <span style={{ fontWeight: '600' }}>{event.creator}</span>
              </div>
              <div style={{ color: '#ccc', marginBottom: '1rem' }}>{event.address}</div>
            </div>
            
            {/* Mock Map */}
            <div style={{ 
              width: '100%', 
              height: '300px', 
              background: 'linear-gradient(45deg, #333, #555)', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#999',
              marginBottom: '1rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <MapPin size={48} style={{ marginBottom: '1rem', opacity: '0.5' }} />
                <div>Interactive Map</div>
                <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Coordinates: {event.coordinates.lat}, {event.coordinates.lng}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Getting There</div>
                <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                  • Waterloo Station (5 min walk)<br/>
                  • Southwark Station (10 min walk)<br/>
                  • Multiple bus routes
                </div>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Parking</div>
                <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                  • On-site parking available<br/>
                  • Street parking nearby<br/>
                  • Disabled access
                </div>
              </div>
            </div>
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

        {/* Event Hero Section */}
        <section className="hero-section" style={{ height: 'auto', minHeight: '400px' }}>
          <div className="featured-creator" style={{ position: 'relative' }}>
            <div className="featured-creator-content">
              {event.featured && (
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
              <p style={{ fontSize: '1.2rem', color: '#ccc', marginBottom: '1rem' }}>{event.creator}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={20} />
                  <span>{event.fullDate}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={20} />
                  <span>{event.location}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} />
                  <span>{event.attendees.toLocaleString()} attending</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button 
                  className={isRSVPed ? 'btn-secondary' : 'btn-primary'}
                  onClick={handleRSVP}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {isRSVPed ? <CheckCircle size={16} /> : <Users size={16} />}
                  {isRSVPed ? 'RSVPed' : 'RSVP Now'}
                </button>
                <button 
                  className="btn-secondary"
                  onClick={handleLike}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Heart size={16} style={{ color: isLiked ? '#EC4899' : 'white' }} />
                  {isLiked ? 'Liked' : 'Like'}
                </button>
                <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Share2 size={16} />
                  Share
                </button>
                <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MessageCircle size={16} />
                  Contact
                </button>
              </div>
            </div>
          </div>
          <div className="trending-panel">
            <h3 style={{ marginBottom: '1rem', color: '#EC4899' }}>Event Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Price</span>
                <span style={{ color: '#EC4899', fontWeight: '600' }}>{event.price}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Genre</span>
                <span>{event.genre}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Rating</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Star size={14} style={{ color: '#FFD700' }} />
                  {event.rating}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Capacity</span>
                <span>{event.attendees.toLocaleString()}/{event.maxAttendees.toLocaleString()}</span>
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
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Organizer</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                background: 'linear-gradient(45deg, #DC2626, #EC4899)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}>
                {event.organizer.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{event.organizer.name}</div>
                <div style={{ color: '#999', fontSize: '0.9rem' }}>{event.organizer.bio}</div>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={16} />
                <span>{event.organizer.contact}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={16} />
                <span>{event.organizer.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={16} />
                <span>{event.organizer.website}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <a href="#" style={{ color: '#999', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.2)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <Instagram size={20} />
              </a>
              <a href="#" style={{ color: '#999', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.2)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <Twitter size={20} />
              </a>
              <a href="#" style={{ color: '#999', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.2)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <Youtube size={20} />
              </a>
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