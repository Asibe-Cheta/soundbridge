'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/src/contexts/AuthContext';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { useDashboard } from '@/src/hooks/useDashboard';
import {
  LogOut,
  Settings,
  Upload,
  Calendar,
  Music,
  BarChart3,
  Users,
  Bell,
  Activity,
  AlertCircle,
  X,
  AlertTriangle,
  TrendingUp,
  Heart,
  Play,
  FileAudio,
  Clock,
  Plus,
  MessageCircle,
  Home
} from 'lucide-react';
import Image from 'next/image';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const {
    stats,
    profile,
    error,
    deleteUserAccount,
    setError
  } = useDashboard();

  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'analytics' | 'followers' | 'settings'>('overview');
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const result = await deleteUserAccount();
      if (result?.success) {
        await signOut();
      }
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const navigation = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'content', label: 'Content', icon: Music },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'followers', label: 'Followers', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (!user) {
    return (
      <ProtectedRoute>
        <div>Loading...</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        color: 'white'
      }}>
        {/* Header */}
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          width: '100%',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: isMobile ? '0 0.5rem' : '0 1rem',
            height: isMobile ? '3.5rem' : '4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {/* Left Side - SoundBridge Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem' }}>
              <Link 
                href="/" 
                style={{ 
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <Image
                  src="/images/logos/logo-trans.png"
                  alt="SoundBridge"
                  width={isMobile ? 150 : 200}
                  height={isMobile ? 45 : 60}
                  style={{
                    height: 'auto'
                  }}
                />
              </Link>
            </div>

            {/* Center - Dashboard Title and Welcome */}
            <div style={{ 
              display: isMobile ? 'none' : 'flex', 
              alignItems: 'center', 
              gap: '0.75rem' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  background: 'linear-gradient(135deg, #dc2626 0%, #ec4899 100%)',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                }}>
                  <Activity size={20} style={{ color: 'white' }} />
                </div>
                <div>
                  <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: 0 }}>Dashboard</h1>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Welcome back, {profile?.display_name || user.email}</p>
                </div>
              </div>
            </div>

            {/* Mobile Dashboard Title */}
            {isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  background: 'linear-gradient(135deg, #dc2626 0%, #ec4899 100%)',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                }}>
                  <Activity size={16} style={{ color: 'white' }} />
                </div>
                <h1 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', margin: 0 }}>Dashboard</h1>
              </div>
            )}

            {/* Right Side - Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.75rem' }}>
              <button style={{
                padding: isMobile ? '0.5rem' : '0.5rem 1rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}>
                <Bell size={isMobile ? 14 : 16} />
                {!isMobile && 'Notifications'}
              </button>
              <button
                onClick={handleSignOut}
                style={{
                  padding: isMobile ? '0.5rem' : '0.5rem 1rem',
                  background: 'linear-gradient(135deg, #dc2626 0%, #ec4899 100%)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <LogOut size={isMobile ? 14 : 16} />
                {!isMobile && 'Sign Out'}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: isMobile ? '1rem 0.5rem' : '2rem 1rem' 
        }}>
          {/* Navigation Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            marginBottom: isMobile ? '1rem' : '2rem',
            padding: '0.25rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '0.75rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            overflowX: isMobile ? 'auto' : 'visible'
          }}>
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as 'overview' | 'content' | 'analytics' | 'followers' | 'settings')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '0.25rem' : '0.5rem',
                    padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: isActive ? 'linear-gradient(135deg, #dc2626 0%, #ec4899 100%)' : 'transparent',
                    color: isActive ? 'white' : '#94a3b8',
                    boxShadow: isActive ? '0 4px 12px rgba(220, 38, 38, 0.3)' : 'none'
                  }}
                  onMouseEnter={(e) => !isActive && (e.currentTarget.style.color = 'white', e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                  onMouseLeave={(e) => !isActive && (e.currentTarget.style.color = '#94a3b8', e.currentTarget.style.background = 'transparent')}
                >
                  <Icon size={isMobile ? 14 : 16} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Error Toast */}
          {error && (
            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.75rem',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fca5a5' }}>
                <AlertCircle size={18} />
                <span style={{ fontSize: '0.875rem' }}>{error}</span>
                <button
                  onClick={() => setError(null)}
                  style={{
                    marginLeft: 'auto',
                    padding: '0.25rem',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Stats Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: isMobile ? '1rem' : '1.5rem'
              }}>
                {[
                  { icon: Play, label: 'Total Plays', value: stats?.totalPlays || 0, color: '#dc2626' },
                  { icon: Users, label: 'Followers', value: stats?.totalFollowers || 0, color: '#8b5cf6' },
                  { icon: Heart, label: 'Total Likes', value: stats?.totalLikes || 0, color: '#10b981' },
                  { icon: FileAudio, label: 'Tracks', value: stats?.totalTracks || 0, color: '#3b82f6' },
                  { icon: Calendar, label: 'Events', value: stats?.totalEvents || 0, color: '#f97316' }
                ].map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div key={index} style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '1rem',
                      padding: '1.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{
                          width: '3rem',
                          height: '3rem',
                          background: `${stat.color}20`,
                          borderRadius: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Icon size={24} style={{ color: stat.color }} />
                        </div>
                        <TrendingUp size={20} style={{ color: '#10b981' }} />
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>{stat.value}</div>
                      <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{stat.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: isMobile ? '1rem' : '1.5rem'
              }}>
                {[
                  {
                    icon: Upload,
                    title: 'Upload Content',
                    subtitle: 'Share your music',
                    description: 'Create new track',
                    href: '/upload',
                    gradient: 'linear-gradient(135deg, #dc2626 0%, #ec4899 100%)'
                  },
                  {
                    icon: Calendar,
                    title: 'Create Event',
                    subtitle: 'Host live events',
                    description: 'Plan your next event',
                    href: '/events/create',
                    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                  },
                  {
                    icon: MessageCircle,
                    title: 'Messages',
                    subtitle: 'Connect with creators',
                    description: 'Chat with community',
                    href: '/messaging',
                    gradient: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)'
                  }
                ].map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Link key={index} href={action.href} style={{ textDecoration: 'none' }}>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '1rem',
                        padding: '1.5rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }} onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }} onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                          <div style={{
                            width: '3.5rem',
                            height: '3.5rem',
                            background: action.gradient,
                            borderRadius: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                          }}>
                            <Icon size={28} style={{ color: 'white' }} />
                          </div>
                          <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'white', margin: '0 0 0.25rem 0' }}>{action.title}</h3>
                            <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>{action.subtitle}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                          <Plus size={16} />
                          <span>{action.description}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Recent Activity */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '1rem',
                padding: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    borderRadius: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Activity size={20} style={{ color: 'white' }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: '0 0 0.25rem 0' }}>Recent Activity</h2>
                    <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>Your latest updates and interactions</p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                    stats.recentActivity.map((activity) => (
                      <div key={activity.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}>
                        <div style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          background: 'linear-gradient(135deg, #ec4899 0%, #dc2626 100%)',
                          borderRadius: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Activity size={18} style={{ color: 'white' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500', color: 'white', marginBottom: '0.25rem' }}>{activity.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{activity.description}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                          <Clock size={14} />
                          <span>{new Date(activity.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                      <div style={{
                        width: '5rem',
                        height: '5rem',
                        background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem auto',
                        opacity: 0.5
                      }}>
                        <Activity size={32} style={{ color: 'white' }} />
                      </div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'white', margin: '0 0 0.5rem 0' }}>No recent activity</h3>
                      <p style={{ color: '#94a3b8', margin: '0 0 1rem 0' }}>Start creating content to see your activity here</p>
                      <Link href="/upload" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        background: 'linear-gradient(135deg, #dc2626 0%, #ec4899 100%)',
                        color: 'white',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        textDecoration: 'none',
                        transition: 'all 0.2s ease'
                      }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <Plus size={16} />
                        Create Content
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Other tabs would go here - keeping it simple for now */}
          {activeTab !== 'overview' && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '1rem',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <div style={{
                width: '4rem',
                height: '4rem',
                background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
                opacity: 0.5
              }}>
                <Home size={32} style={{ color: 'white' }} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'white', margin: '0 0 0.5rem 0' }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Coming Soon</h3>
              <p style={{ color: '#94a3b8', margin: 0 }}>This section is under development</p>
            </div>
          )}
        </main>

        {/* Delete Account Confirmation */}
        {showDeleteAccount && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '28rem',
              width: '100%'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '3rem',
                  height: '3rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AlertTriangle size={24} style={{ color: '#fca5a5' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white', margin: '0 0 0.25rem 0' }}>Delete Account</h3>
                  <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>This action cannot be undone</p>
                </div>
              </div>
              
              <p style={{ color: '#94a3b8', margin: '0 0 2rem 0', lineHeight: '1.6' }}>
                Are you sure you want to permanently delete your account? This action cannot be undone and will remove all your data, tracks, and events.
              </p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={handleDeleteAccount}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    background: '#dc2626',
                    color: 'white',
                    borderRadius: '0.5rem',
                    border: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
                >
                  Delete Account
                </button>
                <button
                  onClick={() => setShowDeleteAccount(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    borderRadius: '0.5rem',
                    border: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
} 