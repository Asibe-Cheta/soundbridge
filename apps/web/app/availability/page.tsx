'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Footer } from '../../src/components/layout/Footer';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import { useAuth } from '../../src/contexts/AuthContext';
import { useAvailability } from '../../src/hooks/useAvailability';
import type { CreateAvailabilityData, AvailabilitySettings } from '../../src/lib/types/availability';
import { Calendar, Clock, Users, Settings, Plus, Edit, Trash2, CheckCircle, X, AlertCircle, Loader2, ArrowLeft, MessageCircle, User, LogOut, Upload, Bell, Home, Menu, Search, Save, Eye, EyeOff } from 'lucide-react';

export default function AvailabilityPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [availabilityState, availabilityActions] = useAvailability();
  const [activeTab, setActiveTab] = useState('calendar');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [maxRequests, setMaxRequests] = useState(1);
  const [notes, setNotes] = useState('');

  // Settings states
  const [settings, setSettings] = useState<AvailabilitySettings>({
    collaboration_enabled: true,
    auto_decline_unavailable: true,
    min_notice_days: 7
  });

  const tabs = [
    { id: 'calendar', label: 'Availability Calendar', icon: Calendar },
    { id: 'requests', label: 'Collaboration Requests', icon: MessageCircle },
    { id: 'settings', label: 'Settings', icon: Settings }
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

  // Load user's availability when component mounts
  useEffect(() => {
    if (user) {
      availabilityActions.fetchAvailability(user.id);
      availabilityActions.fetchCollaborationRequests('received');
    }
  }, [user]);

  // Update settings when they change
  useEffect(() => {
    if (availabilityState.settings) {
      setSettings(availabilityState.settings);
    }
  }, [availabilityState.settings]);

  const handleAddAvailability = async () => {
    console.log('🕐 handleAddAvailability called');
    
    if (!startDate || !endDate) {
      console.log('❌ Missing start or end date');
      return;
    }

    // Validate that end date is after start date
    if (new Date(endDate) <= new Date(startDate)) {
      console.log('❌ End date must be after start date');
      return;
    }

    console.log('📅 Creating availability with data:', { startDate, endDate, isAvailable, maxRequests, notes });

    const data: CreateAvailabilityData = {
      start_date: startDate,
      end_date: endDate,
      is_available: isAvailable,
      max_requests_per_slot: maxRequests,
      notes: notes || undefined
    };

    try {
      const result = await availabilityActions.createAvailability(data);
      console.log('✅ Availability creation result:', result);
      
      if (result.success) {
        setShowAddForm(false);
        setStartDate('');
        setEndDate('');
        setIsAvailable(true);
        setMaxRequests(1);
        setNotes('');
      } else {
        console.error('❌ Failed to create availability:', result.error);
      }
    } catch (error) {
      console.error('❌ Error in handleAddAvailability:', error);
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    if (confirm('Are you sure you want to delete this availability slot?')) {
      await availabilityActions.deleteAvailability(id);
    }
  };

  const handleRespondToRequest = async (requestId: string, response: 'accepted' | 'declined') => {
    await availabilityActions.respondToRequest(requestId, response);
  };

  const handleUpdateSettings = async () => {
    await availabilityActions.updateSettings(settings);
  };

  if (!user) {
    return (
      <>
        <header className="header">
          {isMobile ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              width: '100%'
            }}>
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
              >
                <Menu size={24} color="white" />
              </button>

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

              <div style={{ display: 'flex', alignItems: 'center' }}>
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
                  >
                    Sign In
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <>
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
                <nav className="nav">
                  <Link href="/" style={{ textDecoration: 'none', color: 'white' }}>For You</Link>
                  <Link href="/discover" style={{ textDecoration: 'none', color: 'white' }}>Discover</Link>
                  <Link href="/events" style={{ textDecoration: 'none', color: 'white' }}>Events</Link>
                  <Link href="/creators" style={{ textDecoration: 'none', color: 'white' }}>Creators</Link>
                </nav>
              </div>

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
                    placeholder="Search..." 
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
                  >
                    Sign up
                  </button>
                </Link>
              </div>
            </>
          )}
        </header>

        <main className="main-container">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
            <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Authentication Required</h2>
            <p style={{ color: '#999', marginBottom: '2rem' }}>Please log in to manage your availability.</p>
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
      <header className="header">
        {isMobile ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            width: '100%'
          }}>
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
            >
              <Menu size={24} color="white" />
            </button>

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

            <div style={{ display: 'flex', alignItems: 'center' }}>
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
                    }}>
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
                    }}>
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
                    }}>
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
                    }}>
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
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
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
              <nav className="nav">
                <Link href="/" style={{ textDecoration: 'none', color: 'white' }}>For You</Link>
                <Link href="/discover" style={{ textDecoration: 'none', color: 'white' }}>Discover</Link>
                <Link href="/events" style={{ textDecoration: 'none', color: 'white' }}>Events</Link>
                <Link href="/creators" style={{ textDecoration: 'none', color: 'white' }}>Creators</Link>
              </nav>
            </div>

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
                  placeholder="Search..." 
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                >
                  <Upload size={16} />
                  Upload
                </button>
              </Link>

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
                    }}>
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
                    }}>
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
                    }}>
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
                    }}>
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
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      <main className="main-container">
        {/* Back Button */}
        <section className="section">
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
          </Link>
        </section>

        {/* Page Header */}
        <section className="hero-section">
          <div className="featured-creator">
            <div className="featured-creator-content">
              <h2>Availability Management</h2>
              <p>Manage your availability calendar and collaboration requests</p>
            </div>
          </div>
          <div className="trending-panel">
            <h3 style={{ marginBottom: '1rem', color: '#EC4899' }}>Quick Stats</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Available Slots</span>
                <span style={{ color: '#EC4899', fontWeight: '600' }}>
                  {availabilityState.availability.filter(slot => slot.is_available).length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Pending Requests</span>
                <span style={{ color: '#EC4899', fontWeight: '600' }}>
                  {availabilityState.collaborationRequests.filter(req => req.status === 'pending').length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Collaboration Enabled</span>
                <span style={{ color: settings.collaboration_enabled ? '#10B981' : '#EF4444', fontWeight: '600' }}>
                  {settings.collaboration_enabled ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Error Display */}
        {availabilityState.error && (
          <section className="section">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              color: '#ef4444'
            }}>
              <AlertCircle size={16} />
              <span>{availabilityState.error}</span>
            </div>
          </section>
        )}

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
          {activeTab === 'calendar' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ color: '#EC4899', fontSize: '1.2rem' }}>Your Availability Calendar</h3>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Plus size={16} />
                  Add Availability
                </button>
              </div>

              {/* Add Availability Form */}
              {showAddForm && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '2rem',
                  marginBottom: '2rem'
                }}>
                  <h4 style={{ marginBottom: '1rem', color: '#EC4899' }}>Add New Availability Slot</h4>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                          Start Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          style={{
                            width: '100%',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            color: 'white',
                            fontSize: '1rem'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                          End Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          style={{
                            width: '100%',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            color: 'white',
                            fontSize: '1rem'
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                          Max Requests
                        </label>
                        <input
                          type="number"
                          value={maxRequests}
                          onChange={(e) => setMaxRequests(parseInt(e.target.value) || 1)}
                          min="1"
                          style={{
                            width: '100%',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            color: 'white',
                            fontSize: '1rem'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isAvailable}
                            onChange={(e) => setIsAvailable(e.target.checked)}
                            style={{ width: '16px', height: '16px' }}
                          />
                          Available for collaboration
                        </label>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                        Notes (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any notes about this availability slot..."
                        rows={3}
                        style={{
                          width: '100%',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          color: 'white',
                          fontSize: '1rem',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddAvailability}
                        disabled={availabilityState.loading}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        {availabilityState.loading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Save size={16} />
                        )}
                        Add Availability
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Availability List */}
              {availabilityState.loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <Loader2 size={32} className="animate-spin" style={{ color: '#EC4899' }} />
                </div>
              ) : availabilityState.availability.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                  <Calendar size={48} style={{ marginBottom: '1rem', opacity: '0.5' }} />
                  <h3>No availability slots set</h3>
                  <p>Add your first availability slot to start receiving collaboration requests.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {availabilityState.availability.map((slot) => (
                    <div
                      key={slot.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: slot.is_available ? '#10B981' : '#EF4444'
                          }} />
                          <span style={{ fontWeight: '600', color: 'white' }}>
                            {slot.is_available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                        <div style={{ color: '#ccc', marginBottom: '0.5rem' }}>
                          <div>Start: {new Date(slot.start_date).toLocaleString()}</div>
                          <div>End: {new Date(slot.end_date).toLocaleString()}</div>
                        </div>
                        <div style={{ color: '#999', fontSize: '0.9rem' }}>
                          Max requests: {slot.max_requests} • Current requests: {slot.request_count}
                        </div>
                        {slot.notes && (
                          <div style={{ color: '#999', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                            Notes: {slot.notes}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleDeleteAvailability(slot.id)}
                          className="btn-secondary"
                          style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="card">
              <h3 style={{ color: '#EC4899', fontSize: '1.2rem', marginBottom: '2rem' }}>Collaboration Requests</h3>
              
              {availabilityState.loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <Loader2 size={32} className="animate-spin" style={{ color: '#EC4899' }} />
                </div>
              ) : availabilityState.collaborationRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                  <MessageCircle size={48} style={{ marginBottom: '1rem', opacity: '0.5' }} />
                  <h3>No collaboration requests</h3>
                  <p>You haven't received any collaboration requests yet.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {availabilityState.collaborationRequests.map((request) => (
                    <div
                      key={request.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '1.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>{request.subject}</h4>
                          <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                            From: {request.requester?.display_name || 'Unknown'}
                          </div>
                        </div>
                        <div style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          background: request.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 
                                   request.status === 'accepted' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: request.status === 'pending' ? '#F59E0B' : 
                                 request.status === 'accepted' ? '#22C55E' : '#EF4444'
                        }}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </div>
                      </div>
                      
                      <div style={{ color: '#ccc', marginBottom: '1rem' }}>
                        <div>Proposed: {new Date(request.proposed_start_date).toLocaleString()} - {new Date(request.proposed_end_date).toLocaleString()}</div>
                        <div style={{ marginTop: '0.5rem' }}>{request.message}</div>
                      </div>

                      {request.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <button
                            onClick={() => handleRespondToRequest(request.id, 'accepted')}
                            disabled={availabilityState.loading}
                            className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                          >
                            <CheckCircle size={16} />
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespondToRequest(request.id, 'declined')}
                            disabled={availabilityState.loading}
                            className="btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                          >
                            <X size={16} />
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="card">
              <h3 style={{ color: '#EC4899', fontSize: '1.2rem', marginBottom: '2rem' }}>Availability Settings</h3>
              
              <div style={{ display: 'grid', gap: '2rem' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', cursor: 'pointer', marginBottom: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={settings.collaboration_enabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, collaboration_enabled: e.target.checked }))}
                      style={{ width: '16px', height: '16px' }}
                    />
                    Enable collaboration requests
                  </label>
                  <p style={{ color: '#999', fontSize: '0.9rem', marginLeft: '1.5rem' }}>
                    Allow other creators to send you collaboration requests
                  </p>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', cursor: 'pointer', marginBottom: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={settings.auto_decline_unavailable}
                      onChange={(e) => setSettings(prev => ({ ...prev, auto_decline_unavailable: e.target.checked }))}
                      style={{ width: '16px', height: '16px' }}
                    />
                    Auto-decline requests for unavailable times
                  </label>
                  <p style={{ color: '#999', fontSize: '0.9rem', marginLeft: '1.5rem' }}>
                    Automatically decline requests that don't match your availability
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                    Minimum Notice (Days)
                  </label>
                  <input
                    type="number"
                    value={settings.min_notice_days}
                    onChange={(e) => setSettings(prev => ({ ...prev, min_notice_days: parseInt(e.target.value) || 7 }))}
                    min="1"
                    max="30"
                    style={{
                      width: '100%',
                      maxWidth: '200px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                  />
                  <p style={{ color: '#999', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    Minimum number of days notice required for collaboration requests
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleUpdateSettings}
                    disabled={availabilityState.loading}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {availabilityState.loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <Footer />
      </main>

      {/* Floating Quick Actions Card */}
      <FloatingCard title="Quick Actions">
        <div className="quick-actions">
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <div className="quick-action">Dashboard</div>
          </Link>
          <Link href="/events/create" style={{ textDecoration: 'none' }}>
            <div className="quick-action">Create Event</div>
          </Link>
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <div className="quick-action">Upload Music</div>
          </Link>
          <div className="quick-action">Find Collaborators</div>
        </div>

        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Availability Tips</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div>Set regular availability slots</div>
          <div>Use notes to specify project types</div>
          <div>Review requests before accepting</div>
          <div>Keep your calendar updated</div>
        </div>
      </FloatingCard>
    </>
  );
}
