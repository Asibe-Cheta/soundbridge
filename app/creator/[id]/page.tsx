'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { Footer } from '../../../src/components/layout/Footer';
import { FloatingCard } from '../../../src/components/ui/FloatingCard';
import { 
  Music, 
  Calendar, 
  User, 
  MessageCircle, 
  Heart, 
  Share2, 
  Instagram, 
  Twitter, 
  Youtube, 
  Mail, 
  MapPin, 
  Users,
  Play,
  Clock,
  Star,
  Send
} from 'lucide-react';

export default function CreatorProfile({ params }: { params: Promise<{ id: string }> }) {
  const [activeTab, setActiveTab] = useState('music');
  const [messageText, setMessageText] = useState('');
  const [collaborationSubject, setCollaborationSubject] = useState('');
  const [collaborationMessage, setCollaborationMessage] = useState('');
  const [collaborationDeadline, setCollaborationDeadline] = useState('');
  const [chatMessage, setChatMessage] = useState('');

  // Unwrap params using React.use()
  const resolvedParams = use(params);

  // Mock creator data
  const creator = {
    id: resolvedParams.id,
    name: 'Kwame Asante',
    genre: 'Afrobeats',
    location: 'London, UK',
    followers: '125K',
    tracks: 45,
    bio: 'Afrobeats sensation taking the UK by storm. Known for blending traditional African rhythms with modern UK sounds. Collaborated with major artists across the diaspora.',
    social: {
      instagram: '@kwameasante',
      twitter: '@kwameasante',
      youtube: 'Kwame Asante Music'
    },
    contact: 'kwame@asante.com'
  };

  const tabs = [
    { id: 'music', label: 'Music', icon: Music },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'about', label: 'About', icon: User },
    { id: 'collaborate', label: 'Collaborate', icon: Send },
    { id: 'messages', label: 'Messages', icon: MessageCircle }
  ];

  const musicTracks = [
    { title: 'Lagos Nights', artist: 'Kwame Asante', duration: '3:45', plays: '12K' },
    { title: 'Gospel Fusion', artist: 'Kwame Asante', duration: '4:12', plays: '8K' },
    { title: 'UK Drill Mix', artist: 'Kwame Asante', duration: '3:28', plays: '15K' },
    { title: 'Afro Fusion', artist: 'Kwame Asante', duration: '3:55', plays: '9K' },
    { title: 'Praise & Worship', artist: 'Kwame Asante', duration: '4:30', plays: '6K' },
    { title: 'Lagos Anthem', artist: 'Kwame Asante', duration: '3:15', plays: '18K' }
  ];

  const events = [
    { title: 'Afrobeats Carnival', date: 'Friday • 7PM', location: 'Tafawa Balewa Square, Lagos', price: '₦5000-15000' },
    { title: 'Gospel Night Live', date: 'Tonight • 8PM', location: 'Royal Festival Hall, London', price: '£25-45' },
    { title: 'UK Drill Showcase', date: 'Saturday • 6PM', location: 'O2 Academy, Birmingham', price: '£15-35' }
  ];

  const chatMessages = [
    { id: 1, sender: 'user', message: 'Hey Kwame! Love your latest track "Lagos Nights"', timestamp: '2 hours ago' },
    { id: 2, sender: 'creator', message: 'Thanks! Really appreciate that. Working on something new right now.', timestamp: '1 hour ago' },
    { id: 3, sender: 'user', message: 'Would love to hear it when it\'s ready!', timestamp: '30 min ago' },
    { id: 4, sender: 'creator', message: 'For sure! I\'ll share it here first.', timestamp: '15 min ago' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'music':
        return (
          <div className="grid grid-6">
            {musicTracks.map((track, index) => (
              <div key={index} className="card">
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

      case 'events':
        return (
          <div className="grid grid-3">
            {events.map((event, index) => (
              <div key={index} className="event-card">
                <div className="event-card-content">
                  <div style={{ fontSize: '0.9rem', color: '#EC4899' }}>{event.date}</div>
                  <div style={{ fontWeight: '600', margin: '0.5rem 0' }}>{event.title}</div>
                  <div style={{ color: '#ccc', fontSize: '0.9rem' }}>{event.location}</div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <span style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#EC4899', padding: '0.25rem 0.5rem', borderRadius: '15px', fontSize: '0.8rem' }}>{event.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'about':
        return (
          <div className="grid grid-2">
            <div className="card">
              <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Bio</h3>
              <p style={{ lineHeight: '1.6', color: '#ccc' }}>{creator.bio}</p>
            </div>
            <div className="card">
              <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Contact & Social</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={16} />
                  <span>{creator.contact}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} />
                  <span>{creator.location}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Instagram size={16} />
                  <span>{creator.social.instagram}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Twitter size={16} />
                  <span>{creator.social.twitter}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Youtube size={16} />
                  <span>{creator.social.youtube}</span>
                </div>
              </div>
            </div>
          </div>
        );

             case 'collaborate':
         return (
           <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
             <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Send Collaboration Request</h3>
             <p style={{ color: '#ccc', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
               Send a formal collaboration proposal with deadlines for recording sessions, events, or joint projects.
             </p>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div>
                 <label className="form-label">Subject</label>
                 <input 
                   type="text" 
                   value={collaborationSubject}
                   onChange={(e) => setCollaborationSubject(e.target.value)}
                   placeholder="Collaboration request for..."
                   className="form-input"
                 />
               </div>
               <div>
                 <label className="form-label">Message</label>
                 <textarea 
                   value={collaborationMessage}
                   onChange={(e) => setCollaborationMessage(e.target.value)}
                   placeholder="Describe your collaboration idea, project details, and what you're looking for..."
                   rows={6}
                   className="form-textarea"
                 />
               </div>
               <div>
                 <label className="form-label">Reply Deadline</label>
                 <input 
                   type="date" 
                   value={collaborationDeadline}
                   onChange={(e) => setCollaborationDeadline(e.target.value)}
                   className="form-input"
                   style={{ minWidth: '200px' }}
                 />
                 <p style={{ color: '#999', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                   When do you need a response by? This helps creators prioritize urgent requests.
                 </p>
               </div>
               <button className="btn-primary" style={{ alignSelf: 'flex-start' }}>
                 Send Collaboration Request
               </button>
             </div>
           </div>
         );

       case 'messages':
         return (
           <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
             <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Messages</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', maxHeight: '400px', overflowY: 'auto' }}>
               {chatMessages.map((msg) => (
                 <div 
                   key={msg.id} 
                   className={`chat-message ${msg.sender}`}
                 >
                   <div className={`message-bubble ${msg.sender}`}>
                     <div>{msg.message}</div>
                     <div className="message-timestamp">{msg.timestamp}</div>
                   </div>
                 </div>
               ))}
             </div>
             <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
               <input 
                 type="text" 
                 value={chatMessage}
                 onChange={(e) => setChatMessage(e.target.value)}
                 placeholder="Type your message..."
                 className="form-input"
                 style={{ flex: 1 }}
               />
               <button className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                 Send
               </button>
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
          <a href="#">Events</a>
          <a href="#">Creators</a>
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
        <section className="hero-section" style={{ height: 'auto', minHeight: '400px' }}>
          <div className="featured-creator" style={{ position: 'relative' }}>
            <div className="featured-creator-content">
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
                <div className="creator-profile-photo">
                  KA
                </div>
                <div>
                  <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{creator.name}</h1>
                  <p style={{ fontSize: '1.2rem', color: '#ccc', marginBottom: '1rem' }}>{creator.genre} • {creator.location}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={20} />
                      <span>{creator.followers} followers</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Music size={20} />
                      <span>{creator.tracks} tracks</span>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button className="btn-primary">Follow</button>
                <button className="btn-secondary">Message</button>
                <button className="btn-secondary">Collaborate</button>
                <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Heart size={16} />
                  Favorite
                </button>
                <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Share2 size={16} />
                  Share
                </button>
              </div>
            </div>
          </div>
          <div className="trending-panel">
            <h3 style={{ marginBottom: '1rem', color: '#EC4899' }}>Latest Release</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: '60px', height: '60px', background: '#333', borderRadius: '8px' }}></div>
              <div>
                <div style={{ fontWeight: '600' }}>Lagos Nights</div>
                <div style={{ color: '#999', fontSize: '0.9rem' }}>Released 2 days ago</div>
              </div>
              <button style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '1.5rem' }}>▶</button>
            </div>
            <div className="waveform"></div>
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

        {/* Footer */}
        <Footer />
      </main>

      {/* Floating Quick Actions Card */}
      <FloatingCard title="Quick Actions">
        <div className="quick-actions">
          <div className="quick-action">🎵 Upload Music</div>
          <div className="quick-action">🎙️ Start Podcast</div>
          <div className="quick-action">📅 Create Event</div>
          <div className="quick-action">💬 Find Collaborators</div>
        </div>
        
        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Friends Activity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div>John is listening to "Praise Medley"</div>
          <div>Sarah posted a new track</div>
          <div>Mike joined Gospel Night event</div>
        </div>
      </FloatingCard>
    </>
  );
} 