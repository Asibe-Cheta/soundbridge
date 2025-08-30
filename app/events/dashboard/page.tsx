'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Footer } from '../../../src/components/layout/Footer';
import { FloatingCard } from '../../../src/components/ui/FloatingCard';
import { useAuth } from '../../../src/contexts/AuthContext';
import { eventService } from '../../../src/lib/event-service';
import type { Event } from '../../../src/lib/types/event';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Star,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Plus,
  Search,
  Loader2,
  Music,
  DollarSign,
  LogOut,
  User,
  Upload,
  Bell,
  Settings,
  Home,
  Menu
} from 'lucide-react';

export default function EventDashboardPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('attending');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendingEvents, setAttendingEvents] = useState<Event[]>([]);
  const [createdEvents, setCreatedEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const tabs = [
    { id: 'attending', label: 'Attending', icon: Users },
    { id: 'created', label: 'Created', icon: Calendar },
    { id: 'past', label: 'Past Events', icon: Clock }
  ];

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const mobileMenu = document.getElementById('mobile-menu');
      const mobileMenuButton = document.getElementById('mobile-menu-button');
      if (mobileMenu && mobileMenuButton && 
          !mobileMenu.contains(event.target as Node) && 
          !mobileMenuButton.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  useEffect(() => {
    const fetchUserEvents = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch attending events
        const attendingResult = await eventService.getUserAttendingEvents(user.id);
        if (attendingResult.error) {
          console.error('Error fetching attending events:', attendingResult.error);
        } else {
          setAttendingEvents(attendingResult.data);
        }

        // Fetch created events
        const createdResult = await eventService.getEventsByCreator(user.id);
        if (createdResult.error) {
          console.error('Error fetching created events:', createdResult.error);
        } else {
          setCreatedEvents(createdResult.data);
        }

        // For past events, we'll filter from created events for now
        // In a real implementation, you might want a separate endpoint
        const now = new Date();
        const past = createdResult.data?.filter(event => new Date(event.event_date) < now) || [];
        setPastEvents(past);

      } catch (err) {
        setError('Failed to load events');
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserEvents();
  }, [user]);

  const handleDeleteEvent = async (eventId: string) => {
    if (!user) return;

    try {
      const result = await eventService.deleteEvent(eventId);
      if (result.success) {
        // Remove from created events
        setCreatedEvents(prev => prev.filter(event => event.id !== eventId));
        // Remove from past events
        setPastEvents(prev => prev.filter(event => event.id !== eventId));
      } else {
        console.error('Failed to delete event:', result.error);
      }
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  const handleCancelRSVP = async (eventId: string) => {
    if (!user) return;

    try {
      const result = await eventService.rsvpToEvent(eventId, 'not_going');
      if (result.success) {
        // Remove from attending events
        setAttendingEvents(prev => prev.filter(event => event.id !== eventId));
      } else {
        console.error('Failed to cancel RSVP:', result.error);
      }
    } catch (err) {
      console.error('Error canceling RSVP:', err);
    }
  };

  const getCurrentEvents = () => {
    switch (activeTab) {
      case 'attending':
        return attendingEvents.filter(event =>
          !searchQuery ||
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.creator?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      case 'created':
        return createdEvents.filter(event =>
          !searchQuery ||
          event.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
      case 'past':
        return pastEvents.filter(event =>
          !searchQuery ||
          event.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
      default:
        return [];
    }
  };

  const currentEvents = getCurrentEvents();

  if (!user) {
    return (
      <>
        <header className="header">
          {isMobile ? (
            /* Mobile Header - Apple Music Style */
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              width: '100%'
            }}>
              {/* LEFT - Hamburger Menu */}
              <button
                id="mobile-menu-button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <Menu size={24} color="white" />
              </button>

              {/* CENTER - Small Logo */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                flex: 1
              }}>
                <Image
                  src="/images/logos/logo-trans-lockup.png"
                  alt="SoundBridge Logo"
                  width={80}
                  height={22}
                  priority
                  style={{ height: 'auto' }}
                />
              </div>

              {/* RIGHT - Sign In / Profile */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {user ? (
                  <div style={{ position: 'relative' }}>
                    <button
                      id="user-menu-button"
                      onClick={(e) => {
                        e.preventDefault();
                        try {
                          const menu = document.getElementById('user-menu');
                          if (menu) {
                            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                          }
                        } catch (error) {
                          console.error('Error toggling user menu:', error);
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <User size={24} color="white" />
                    </button>
                    
                    <div
                      id="user-menu"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '0.5rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '0.5rem',
                        minWidth: '200px',
                        display: 'none',
                        zIndex: 1000,
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          color: 'white',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Home size={16} />
                          Dashboard
                        </div>
                      </Link>
                      <Link href="/notifications" style={{ textDecoration: 'none' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          color: 'white',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Bell size={16} />
                          Notifications
                        </div>
                      </Link>
                      <Link href="/profile" style={{ textDecoration: 'none' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          color: 'white',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <User size={16} />
                          Profile
                        </div>
                      </Link>
                      <Link href="/settings" style={{ textDecoration: 'none' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          color: 'white',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Settings size={16} />
                          Settings
                        </div>
                      </Link>
                      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.2)', margin: '0.5rem 0' }}></div>
                      <button
                        onClick={handleSignOut}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          color: '#FCA5A5',
                          background: 'none',
                          border: 'none',
                          width: '100%',
                          textAlign: 'left',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <Link href="/login" style={{ textDecoration: 'none' }}>
                    <button 
                      style={{
                        background: 'none',
                        color: '#DC2626',
                        border: 'none',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '16px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      Sign In
                    </button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            /* Desktop Header - Original Style */
            <>
              {/* LEFT SIDE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <div className="logo">
                  <Image
                    src="/images/logos/logo-trans-lockup.png"
                    alt="SoundBridge Logo"
                    width={120}
                    height={32}
                    priority
                    style={{ height: 'auto' }}
                  />
                </div>
                {/* Desktop Navigation */}
                <nav className="nav">
                  <Link href="/" style={{ textDecoration: 'none', color: 'white' }}>
                    For You
                  </Link>
                  <Link href="/discover" style={{ textDecoration: 'none', color: 'white' }}>
                    Discover
                  </Link>
                  <Link href="/events" className="active" style={{ textDecoration: 'none', color: 'white' }}>
                    Events
                  </Link>
                  <Link href="/creators" style={{ textDecoration: 'none', color: 'white' }}>
                    Creators
                  </Link>
                </nav>
              </div>

              {/* CENTER - Search Bar */}
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                justifyContent: 'center', 
                maxWidth: '500px', 
                marginRight: '2rem'
              }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666', zIndex: 1 }} />
                  <input 
                    type="search" 
                    className="search-bar" 
                    placeholder="Search events..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearch}
                    style={{ 
                      width: '100%', 
                      paddingLeft: '40px',
                      fontSize: '16px'
                    }} 
                  />
                </div>
              </div>

              {/* RIGHT SIDE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Upload Button */}
                <Link href="/upload" style={{ textDecoration: 'none' }}>
                  <button 
                    style={{
                      background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
                    }}
                  >
                    <Upload size={16} />
                    Upload
                  </button>
                </Link>

                {/* User Menu */}
                {user ? (
                  <div style={{ position: 'relative' }}>
                    <button
                      id="user-menu-button"
                      onClick={(e) => {
                        e.preventDefault();
                        try {
                          const menu = document.getElementById('user-menu');
                          if (menu) {
                            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                          }
                        } catch (error) {
                          console.error('Error toggling user menu:', error);
                        }
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    >
                      <User size={20} color="white" />
                    </button>
                    
                    <div
                      id="user-menu"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '0.5rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '0.5rem',
                        minWidth: '200px',
                        display: 'none',
                        zIndex: 1000,
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          color: 'white',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Home size={16} />
                          Dashboard
                        </div>
                      </Link>
                      <Link href="/notifications" style={{ textDecoration: 'none' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          color: 'white',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Bell size={16} />
                          Notifications
                        </div>
                      </Link>
                      <Link href="/profile" style={{ textDecoration: 'none' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          color: 'white',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <User size={16} />
                          Profile
                        </div>
                      </Link>
                      <Link href="/settings" style={{ textDecoration: 'none' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          color: 'white',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Settings size={16} />
                          Settings
                        </div>
                      </Link>
                      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.2)', margin: '0.5rem 0' }}></div>
                      <button
                        onClick={handleSignOut}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          color: '#FCA5A5',
                          background: 'none',
                          border: 'none',
                          width: '100%',
                          textAlign: 'left',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link href="/login" style={{ textDecoration: 'none' }}>
                      <button 
                        style={{
                          background: 'transparent',
                          color: 'white',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        Sign in
                      </button>
                    </Link>
                    <Link href="/signup" style={{ textDecoration: 'none' }}>
                      <button 
                        style={{
                          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                          color: 'white',
                          border: 'none',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
                        }}
                      >
                        Sign up
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </header>

        <main className="main-container">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
            <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Authentication Required</h2>
            <p style={{ color: '#999', marginBottom: '2rem' }}>Please log in to view your event dashboard.</p>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button className="btn-primary">Login</button>
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
        {isMobile ? (
          /* Mobile Header - Apple Music Style */
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            width: '100%'
          }}>
            {/* LEFT - Hamburger Menu */}
            <button
              id="mobile-menu-button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <Menu size={24} color="white" />
            </button>

            {/* CENTER - Small Logo */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              flex: 1
            }}>
              <Image
                src="/images/logos/logo-trans-lockup.png"
                alt="SoundBridge Logo"
                width={80}
                height={22}
                priority
                style={{ height: 'auto' }}
              />
            </div>

            {/* RIGHT - Sign In / Profile */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {user ? (
                <div style={{ position: 'relative' }}>
                  <button
                    id="user-menu-button"
                    onClick={(e) => {
                      e.preventDefault();
                      try {
                        const menu = document.getElementById('user-menu');
                        if (menu) {
                          menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                        }
                      } catch (error) {
                        console.error('Error toggling user menu:', error);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <User size={24} color="white" />
                  </button>
                  
                  <div
                    id="user-menu"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '0.5rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '0.5rem',
                      minWidth: '200px',
                      display: 'none',
                      zIndex: 1000,
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        color: 'white',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <Home size={16} />
                        Dashboard
                      </div>
                    </Link>
                    <Link href="/notifications" style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        color: 'white',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <Bell size={16} />
                        Notifications
                      </div>
                    </Link>
                    <Link href="/profile" style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        color: 'white',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <User size={16} />
                        Profile
                      </div>
                    </Link>
                    <Link href="/settings" style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        color: 'white',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <Settings size={16} />
                        Settings
                      </div>
                    </Link>
                    <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.2)', margin: '0.5rem 0' }}></div>
                    <button
                      onClick={handleSignOut}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        color: '#FCA5A5',
                        background: 'none',
                        border: 'none',
                        width: '100%',
                        textAlign: 'left',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <Link href="/login" style={{ textDecoration: 'none' }}>
                  <button 
                    style={{
                      background: 'none',
                      color: '#DC2626',
                      border: 'none',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '16px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    Sign In
                  </button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          /* Desktop Header - Original Style */
          <>
            {/* LEFT SIDE */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <div className="logo">
                <Image
                  src="/images/logos/logo-trans-lockup.png"
                  alt="SoundBridge Logo"
                  width={120}
                  height={32}
                  priority
                  style={{ height: 'auto' }}
                />
              </div>
              {/* Desktop Navigation */}
              <nav className="nav">
                <Link href="/" style={{ textDecoration: 'none', color: 'white' }}>
                  For You
                </Link>
                <Link href="/discover" style={{ textDecoration: 'none', color: 'white' }}>
                  Discover
                </Link>
                <Link href="/events" className="active" style={{ textDecoration: 'none', color: 'white' }}>
                  Events
                </Link>
                <Link href="/creators" style={{ textDecoration: 'none', color: 'white' }}>
                  Creators
                </Link>
              </nav>
            </div>

            {/* CENTER - Search Bar */}
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              justifyContent: 'center', 
              maxWidth: '500px', 
              marginRight: '2rem'
            }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666', zIndex: 1 }} />
                <input 
                  type="search" 
                  className="search-bar" 
                  placeholder="Search events..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  style={{ 
                    width: '100%', 
                    paddingLeft: '40px',
                    fontSize: '16px'
                  }} 
                />
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Upload Button */}
              <Link href="/upload" style={{ textDecoration: 'none' }}>
                <button 
                  style={{
                    background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
                  }}
                >
                  <Upload size={16} />
                  Upload
                </button>
              </Link>

              {/* User Menu */}
              {user ? (
                <div style={{ position: 'relative' }}>
                  <button
                    id="user-menu-button"
                    onClick={(e) => {
                      e.preventDefault();
                      try {
                        const menu = document.getElementById('user-menu');
                        if (menu) {
                          menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                        }
                      } catch (error) {
                        console.error('Error toggling user menu:', error);
                      }
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  >
                    <User size={20} color="white" />
                  </button>
                  
                  <div
                    id="user-menu"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '0.5rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '0.5rem',
                      minWidth: '200px',
                      display: 'none',
                      zIndex: 1000,
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        color: 'white',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <Home size={16} />
                        Dashboard
                      </div>
                    </Link>
                    <Link href="/notifications" style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        color: 'white',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <Bell size={16} />
                        Notifications
                      </div>
                    </Link>
                    <Link href="/profile" style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        color: 'white',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <User size={16} />
                        Profile
                      </div>
                    </Link>
                    <Link href="/settings" style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        color: 'white',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <Settings size={16} />
                        Settings
                      </div>
                    </Link>
                    <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.2)', margin: '0.5rem 0' }}></div>
                    <button
                      onClick={handleSignOut}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        color: '#FCA5A5',
                        background: 'none',
                        border: 'none',
                        width: '100%',
                        textAlign: 'left',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Link href="/login" style={{ textDecoration: 'none' }}>
                    <button 
                      style={{
                        background: 'transparent',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Sign in
                    </button>
                  </Link>
                  <Link href="/signup" style={{ textDecoration: 'none' }}>
                    <button 
                      style={{
                        background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
                      }}
                    >
                      Sign up
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
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

        {/* Dashboard Header */}
        <section className="hero-section">
          <div className="featured-creator">
            <div className="featured-creator-content">
              <h2>My Event Dashboard</h2>
              <p>Manage your events and track your RSVPs</p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <Link href="/events/create" style={{ textDecoration: 'none' }}>
                  <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={16} />
                    Create Event
                  </button>
                </Link>
                <Link href="/events" style={{ textDecoration: 'none' }}>
                  <button className="btn-secondary">Browse Events</button>
                </Link>
              </div>
            </div>
          </div>
          <div className="trending-panel">
            <h3 style={{ marginBottom: '1rem', color: '#EC4899' }}>Quick Stats</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Attending</span>
                <span style={{ color: '#EC4899', fontWeight: '600' }}>{attendingEvents.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Created</span>
                <span style={{ color: '#EC4899', fontWeight: '600' }}>{createdEvents.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Past Events</span>
                <span style={{ color: '#EC4899', fontWeight: '600' }}>{pastEvents.length}</span>
              </div>
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
                placeholder="Search your events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
              />
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

          {/* Error Display */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              marginBottom: '1rem',
              color: '#ef4444'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Events List */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: '#EC4899' }} />
            </div>
          ) : currentEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
              <Calendar size={48} style={{ marginBottom: '1rem', opacity: '0.5' }} />
              <h3>No events found</h3>
              <p>
                {activeTab === 'attending' && 'You are not attending any events yet.'}
                {activeTab === 'created' && 'You have not created any events yet.'}
                {activeTab === 'past' && 'You have no past events.'}
              </p>
              {activeTab === 'created' && (
                <Link href="/events/create" style={{ textDecoration: 'none' }}>
                  <button className="btn-primary" style={{ marginTop: '1rem' }}>
                    Create Your First Event
                  </button>
                </Link>
              )}
              {activeTab === 'attending' && (
                <Link href="/events" style={{ textDecoration: 'none' }}>
                  <button className="btn-primary" style={{ marginTop: '1rem' }}>
                    Browse Events
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-4">
              {currentEvents.map((event) => (
                <div key={event.id} className="event-card">
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
                          <Music size={32} />
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
                        <Music size={14} />
                        <span>{event.category}</span>
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
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Link href={`/events/${event.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                          <button className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                            <Eye size={14} />
                            View
                          </button>
                        </Link>

                        {activeTab === 'created' && (
                          <Link href={`/events/${event.id}/edit`} style={{ textDecoration: 'none', flex: 1 }}>
                            <button className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                              <Edit size={14} />
                              Edit
                            </button>
                          </Link>
                        )}
                      </div>

                      {activeTab === 'attending' && (
                        <button
                          onClick={() => handleCancelRSVP(event.id)}
                          className="btn-secondary"
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                        >
                          <CheckCircle size={14} />
                          Cancel RSVP
                        </button>
                      )}

                      {activeTab === 'created' && (
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="btn-secondary"
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444'
                          }}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <Footer />
      </main>

      {/* Floating Quick Actions Card */}
      <FloatingCard title="Quick Actions">
        <div className="quick-actions">
          <Link href="/events/create" style={{ textDecoration: 'none' }}>
            <div className="quick-action">Create Event</div>
          </Link>
          <Link href="/events" style={{ textDecoration: 'none' }}>
            <div className="quick-action">Browse Events</div>
          </Link>
          <div className="quick-action">Upload Music</div>
          <div className="quick-action">Find Collaborators</div>
        </div>

        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Event Management</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div>Event Analytics</div>
          <div>Email Attendees</div>
          <div>Mobile App</div>
          <div>Notifications</div>
        </div>
      </FloatingCard>
    </>
  );
} 