'use client';

import React, { useState, use, useEffect } from 'react';
import Link from 'next/link';
import { Footer } from '../../../src/components/layout/Footer';
import { FloatingCard } from '../../../src/components/ui/FloatingCard';
import { CreatorProfileSkeleton } from '../../../src/components/ui/Skeleton';
import { useAuth } from '../../../src/contexts/AuthContext';
import {
  getCreatorByUsername,
  getCreatorTracks,
  getCreatorEvents,
  getMessages,
  sendMessage,
  followCreator,
  unfollowCreator
} from '../../../src/lib/creator';
import type { CreatorProfile, AudioTrack, Event, Message } from '../../../src/lib/types/creator';
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
  Send,
  UserPlus,
  UserMinus
} from 'lucide-react';

export default function CreatorProfile({ params }: { params: Promise<{ username: string }> }) {
  const [activeTab, setActiveTab] = useState('music');
  const [collaborationSubject, setCollaborationSubject] = useState('');
  const [collaborationMessage, setCollaborationMessage] = useState('');
  const [collaborationDeadline, setCollaborationDeadline] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);

  const { user } = useAuth();
  const resolvedParams = use(params);

  const tabs = [
    { id: 'music', label: 'Music', icon: Music },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'about', label: 'About', icon: User },
    { id: 'collaborate', label: 'Collaborate', icon: Send },
    { id: 'messages', label: 'Messages', icon: MessageCircle }
  ];

  useEffect(() => {
    const loadCreatorData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get creator profile by username
        const { data: creatorData, error: creatorError } = await getCreatorByUsername(
          resolvedParams.username
        );

        if (creatorError) {
          setError('Creator not found');
          return;
        }

        if (creatorData) {
          // Transform database record to CreatorProfile
          const creatorProfile: CreatorProfile = {
            id: creatorData.id,
            username: creatorData.username,
            display_name: creatorData.display_name || creatorData.full_name || 'Unknown',
            bio: creatorData.bio || null,
            avatar_url: creatorData.avatar_url || null,
            banner_url: creatorData.banner_url || null,
            role: creatorData.role as 'creator' | 'listener',
            location: creatorData.location || null,
            country: creatorData.country as 'UK' | 'Nigeria' | null,
            social_links: creatorData.social_links || {},
            created_at: creatorData.created_at,
            updated_at: creatorData.updated_at,
            followers_count: creatorData.followers_count || 0,
            following_count: 0, // Would need to calculate this
            tracks_count: creatorData.tracks_count || 0,
            events_count: 0, // Would need to calculate this
            is_following: false // Would need to check this separately
          };
          
          setCreator(creatorProfile);
          // Check if user is following this creator
          if (user?.id) {
            // You would need to implement a separate function to check follow status
            // For now, we'll assume not following
            setIsFollowing(false);
          }

          // Load tracks
          const { data: tracksData } = await getCreatorTracks(creatorData.id);
          setTracks(tracksData || []);

          // Load events
          const { data: eventsData } = await getCreatorEvents(creatorData.id);
          setEvents(eventsData || []);

          // Load messages if user is authenticated
          if (user?.id) {
            const { data: messagesData } = await getMessages(creatorData.id, user.id);
            setMessages(messagesData || []);
          }
        }
      } catch (err) {
        console.error('Error loading creator data:', err);
        setError('Failed to load creator data');
      } finally {
        setIsLoading(false);
      }
    };

    loadCreatorData();
  }, [resolvedParams.username, user?.id]);

  const handleFollowToggle = async () => {
    if (!user || !creator) return;

    try {
      setIsLoadingFollow(true);

      if (isFollowing) {
        const { error } = await unfollowCreator(user.id, creator.id);
        if (!error) {
          setIsFollowing(false);
          setCreator(prev => prev ? { ...prev, followers_count: (prev.followers_count || 0) - 1 } : null);
        }
      } else {
        const { error } = await followCreator(user.id, creator.id);
        if (!error) {
          setIsFollowing(true);
          setCreator(prev => prev ? { ...prev, followers_count: (prev.followers_count || 0) + 1 } : null);
        }
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setIsLoadingFollow(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !creator || !chatMessage.trim()) return;

    try {
      setIsLoadingMessage(true);

      const { data: newMessage, error } = await sendMessage(
        user.id,
        creator.id,
        chatMessage.trim()
      );

      if (!error && newMessage) {
        setMessages(prev => [...prev, newMessage]);
        setChatMessage('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsLoadingMessage(false);
    }
  };

  const handleSendCollaboration = async () => {
    if (!user || !creator || !collaborationSubject.trim() || !collaborationMessage.trim()) return;

    try {
      setIsLoadingMessage(true);

      const collaborationText = `Subject: ${collaborationSubject}\n\nMessage: ${collaborationMessage}\n\nDeadline: ${collaborationDeadline || 'No deadline specified'}`;

      const { error } = await sendMessage(
        user.id,
        creator.id,
        collaborationText,
        'collaboration'
      );

      if (!error) {
        setCollaborationSubject('');
        setCollaborationMessage('');
        setCollaborationDeadline('');
        alert('Collaboration request sent successfully!');
      }
    } catch (err) {
      console.error('Error sending collaboration:', err);
    } finally {
      setIsLoadingMessage(false);
    }
  };

  const renderTabContent = () => {
    if (isLoading) {
      return <CreatorProfileSkeleton />;
    }

    if (error || !creator) {
      return (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h3 style={{ color: '#EC4899', marginBottom: '1rem' }}>Creator Not Found</h3>
          <p style={{ color: '#ccc', marginBottom: '1rem' }}>
            {error || 'The creator you\'re looking for doesn\'t exist.'}
          </p>
          <Link href="/discover" style={{ textDecoration: 'none' }}>
            <button className="btn-primary">Discover Creators</button>
          </Link>
        </div>
      );
    }

    switch (activeTab) {
      case 'music':
        return (
          <div className="grid grid-6">
            {tracks.length > 0 ? (
              tracks.map((track) => (
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
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>{creator.display_name}</div>
                  <div className="waveform"></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span style={{ color: '#EC4899', fontSize: '0.8rem' }}>
                      {track.formatted_duration || '0:00'}
                    </span>
                    <span style={{ color: '#999', fontSize: '0.8rem' }}>
                      {track.formatted_play_count || '0'} plays
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="card" style={{ gridColumn: 'span 6', textAlign: 'center', padding: '2rem' }}>
                <h3 style={{ color: '#EC4899', marginBottom: '1rem' }}>No Tracks Yet</h3>
                <p style={{ color: '#ccc' }}>This creator hasn&apos;t uploaded any tracks yet.</p>
              </div>
            )}
          </div>
        );

      case 'events':
        return (
          <div className="grid grid-3">
            {events.length > 0 ? (
              events.map((event) => (
                <div key={event.id} className="event-card">
                  <div className="event-card-content">
                    <div style={{ fontSize: '0.9rem', color: '#EC4899' }}>
                      {event.formatted_date || 'Date TBD'}
                    </div>
                    <div style={{ fontWeight: '600', margin: '0.5rem 0' }}>{event.title}</div>
                    <div style={{ color: '#ccc', fontSize: '0.9rem' }}>{event.location}</div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <span style={{
                        background: 'rgba(236, 72, 153, 0.2)',
                        color: '#EC4899',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '15px',
                        fontSize: '0.8rem'
                      }}>
                        {event.formatted_price || 'Free'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="card" style={{ gridColumn: 'span 3', textAlign: 'center', padding: '2rem' }}>
                <h3 style={{ color: '#EC4899', marginBottom: '1rem' }}>No Events Yet</h3>
                <p style={{ color: '#ccc' }}>This creator hasn&apos;t created any events yet.</p>
              </div>
            )}
          </div>
        );

      case 'about':
        return (
          <div className="grid grid-2">
            <div className="card">
              <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Bio</h3>
              <p style={{ lineHeight: '1.6', color: '#ccc' }}>
                {creator.bio || 'No bio available yet.'}
              </p>
            </div>
            <div className="card">
              <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Contact & Social</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {creator.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={16} />
                    <span>{creator.location}</span>
                  </div>
                )}
                {creator.social_links?.instagram && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Instagram size={16} />
                    <span>{creator.social_links.instagram}</span>
                  </div>
                )}
                {creator.social_links?.twitter && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Twitter size={16} />
                    <span>{creator.social_links.twitter}</span>
                  </div>
                )}
                {creator.social_links?.youtube && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Youtube size={16} />
                    <span>{creator.social_links.youtube}</span>
                  </div>
                )}
                {creator.social_links?.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={16} />
                    <span>{creator.social_links.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'collaborate':
        if (!user) {
          return (
            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Login Required</h3>
              <p style={{ color: '#ccc', marginBottom: '1.5rem' }}>
                You need to be logged in to send collaboration requests.
              </p>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button className="btn-primary">Login to Collaborate</button>
              </Link>
            </div>
          );
        }

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
              <button
                className="btn-primary"
                style={{ alignSelf: 'flex-start' }}
                onClick={handleSendCollaboration}
                disabled={isLoadingMessage}
              >
                {isLoadingMessage ? 'Sending...' : 'Send Collaboration Request'}
              </button>
            </div>
          </div>
        );

      case 'messages':
        if (!user) {
          return (
            <div className="card" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Login Required</h3>
              <p style={{ color: '#ccc', marginBottom: '1.5rem' }}>
                You need to be logged in to send messages.
              </p>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button className="btn-primary">Login to Message</button>
              </Link>
            </div>
          );
        }

        return (
          <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Messages</h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              marginBottom: '1.5rem',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {messages.length > 0 ? (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-message ${msg.sender_id === user.id ? 'user' : 'creator'}`}
                  >
                    <div className={`message-bubble ${msg.sender_id === user.id ? 'user' : 'creator'}`}>
                      <div>{msg.content}</div>
                      <div className="message-timestamp">{msg.formatted_timestamp || 'Just now'}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
                  No messages yet. Start a conversation!
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="form-input"
                style={{ flex: 1 }}
                disabled={isLoadingMessage}
              />
              <button
                className="btn-primary"
                style={{ padding: '0.75rem 1.5rem' }}
                onClick={handleSendMessage}
                disabled={isLoadingMessage || !chatMessage.trim()}
              >
                {isLoadingMessage ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return <CreatorProfileSkeleton />;
  }

  if (error || !creator) {
    return (
      <>
        <header className="header">
          <div className="logo">🌉 SoundBridge</div>
          <nav className="nav">
            <Link href="/" style={{ textDecoration: 'none', color: 'white' }}>For You</Link>
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
        <main className="main-container">
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <h3 style={{ color: '#EC4899', marginBottom: '1rem' }}>Creator Not Found</h3>
            <p style={{ color: '#ccc', marginBottom: '1rem' }}>
              {error || 'The creator you\'re looking for doesn\'t exist.'}
            </p>
            <Link href="/discover" style={{ textDecoration: 'none' }}>
              <button className="btn-primary">Discover Creators</button>
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
        <div className="logo">🌉 SoundBridge</div>
        <nav className="nav">
          <Link href="/" style={{ textDecoration: 'none', color: 'white' }}>For You</Link>
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
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={creator.display_name}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    creator.display_name.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {creator.display_name}
                  </h1>
                  <p style={{ fontSize: '1.2rem', color: '#ccc', marginBottom: '1rem' }}>
                    {creator.role === 'creator' ? 'Creator' : 'Listener'} • {creator.location || 'Location not set'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={20} />
                      <span>{creator.followers_count?.toLocaleString() || '0'} followers</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Music size={20} />
                      <span>{creator.tracks_count || '0'} tracks</span>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {user && user.id !== creator.id && (
                  <button
                    className={`btn-${isFollowing ? 'secondary' : 'primary'}`}
                    onClick={handleFollowToggle}
                    disabled={isLoadingFollow}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {isLoadingFollow ? (
                      'Loading...'
                    ) : (
                      <>
                        {isFollowing ? <UserMinus size={16} /> : <UserPlus size={16} />}
                        {isFollowing ? 'Unfollow' : 'Follow'}
                      </>
                    )}
                  </button>
                )}
                {user && user.id !== creator.id && (
                  <button
                    className="btn-secondary"
                    onClick={() => setActiveTab('messages')}
                  >
                    Message
                  </button>
                )}
                {user && user.id !== creator.id && (
                  <button
                    className="btn-secondary"
                    onClick={() => setActiveTab('collaborate')}
                  >
                    Collaborate
                  </button>
                )}
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
          {tracks.length > 0 && (
            <div className="trending-panel">
              <h3 style={{ marginBottom: '1rem', color: '#EC4899' }}>Latest Release</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1.5rem'
                }}>
                  🎵
                </div>
                <div>
                  <div style={{ fontWeight: '600' }}>{tracks[0].title}</div>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>
                    Released {new Date(tracks[0].created_at).toLocaleDateString()}
                  </div>
                </div>
                <button style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '1.5rem' }}>▶</button>
              </div>
              <div className="waveform"></div>
            </div>
          )}
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