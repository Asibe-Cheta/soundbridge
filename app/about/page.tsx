'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/src/contexts/AuthContext';
import { Footer } from '../../src/components/layout/Footer';
import RiveLogo from '../../src/components/ui/RiveLogo';
import { ThemeToggle } from '@/src/components/ui/ThemeToggle';
import {
  Music,
  Users,
  Globe,
  Heart,
  Target,
  Lightbulb,
  ArrowRight,
  Play,
  Upload,
  DollarSign,
  Calendar,
  MapPin,
  Sparkles,
  User,
  Bell,
  Settings,
  LogOut,
  Search
} from 'lucide-react';

export default function AboutPage() {
  const { user, signOut } = useAuth();

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="logo">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Image
              src="/images/logos/logo-trans-lockup.png"
              alt="SoundBridge"
              width={120}
              height={32}
              priority
              style={{ height: 'auto' }}
            />
          </Link>
        </div>
        <nav className="nav" style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/" style={{ 
            textDecoration: 'none', 
            color: 'var(--text-primary)',
            transition: 'all 0.3s ease',
            padding: '0.5rem 1rem',
            borderRadius: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--hover-bg)';
            e.currentTarget.style.color = 'var(--accent-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          >For You</Link>
          <Link href="/discover" style={{ 
            textDecoration: 'none', 
            color: 'var(--text-primary)',
            transition: 'all 0.3s ease',
            padding: '0.5rem 1rem',
            borderRadius: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--hover-bg)';
            e.currentTarget.style.color = 'var(--accent-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          >Discover</Link>
          <Link href="/events" style={{ 
            textDecoration: 'none', 
            color: 'var(--text-primary)',
            transition: 'all 0.3s ease',
            padding: '0.5rem 1rem',
            borderRadius: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--hover-bg)';
            e.currentTarget.style.color = 'var(--accent-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          >Events</Link>
          <Link href="/creators" style={{ 
            textDecoration: 'none', 
            color: 'var(--text-primary)',
            transition: 'all 0.3s ease',
            padding: '0.5rem 1rem',
            borderRadius: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--hover-bg)';
            e.currentTarget.style.color = 'var(--accent-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          >Creators</Link>
          <Link href="/about" style={{ 
            textDecoration: 'none', 
            color: 'var(--accent-primary)',
            transition: 'all 0.3s ease',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            background: 'var(--hover-bg)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-primary)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--hover-bg)';
            e.currentTarget.style.color = 'var(--accent-primary)';
          }}
          >About</Link>
        </nav>
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          justifyContent: 'center', 
          maxWidth: '500px', 
          marginRight: '2rem'
        }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
            <input
              type="search"
              className="search-bar"
              placeholder="Search creators, events, podcasts..."
              style={{ 
                width: '100%', 
                paddingLeft: '40px',
                fontSize: '16px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)',
                borderRadius: '25px'
              }}
            />
          </div>
        </div>
        <div className="auth-buttons">
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
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
              >
                <User size={20} style={{ color: 'var(--text-primary)' }} />
              </button>
              
              <div
                id="user-menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  background: 'var(--bg-card)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '12px',
                  padding: '0.5rem',
                  minWidth: '200px',
                  display: 'none',
                  zIndex: 1000,
                  boxShadow: 'var(--shadow-lg)'
                }}
              >
                <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <User size={16} />
                    Dashboard
                  </div>
                </Link>
                <Link href="/notifications" style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
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
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
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
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Settings size={16} />
                    Settings
                  </div>
                </Link>
                
                {/* Theme Toggle */}
                <ThemeToggle />
                
                <div style={{ height: '1px', background: 'var(--border-primary)', margin: '0.5rem 0' }}></div>
                <button
                  onClick={handleSignOut}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    color: 'var(--error)',
                    background: 'none',
                    border: 'none',
                    width: '100%',
                    textAlign: 'left',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--error)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  Sign in
                </button>
              </Link>
              <Link href="/signup" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'var(--gradient-primary)',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease',
                  boxShadow: 'var(--shadow-md)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                >
                  Sign up
                </button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="main-container">
        <style jsx>{`
          @media (max-width: 768px) {
            .desktop-hero {
              display: none !important;
            }
            .mobile-hero {
              display: flex !important;
            }
          }
          @media (min-width: 769px) {
            .desktop-hero {
              display: grid !important;
            }
            .mobile-hero {
              display: none !important;
            }
          }
        `}</style>
        {/* Hero Section with Rive Logo */}
        <section className="desktop-hero" style={{
          padding: '2rem',
          margin: '2rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '3rem',
          alignItems: 'center',
          minHeight: '60vh'
        }}>
          {/* Left Side - Text Content */}
          <div style={{ textAlign: 'left' }}>
            <h1 style={{
              fontSize: '3.5rem',
              fontWeight: '800',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '1.5rem',
              lineHeight: '1.1'
            }}>
              About SoundBridge
            </h1>
            <p style={{
              fontSize: '1.25rem',
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: '1.6',
              marginBottom: '2rem'
            }}>
              The world&apos;s first truly level playing field for musicians and creators, 
              where discovery meets collaboration and every voice has the potential to be heard.
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <Link href="/signup" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
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
                  Join SoundBridge
                  <ArrowRight size={16} />
                </button>
              </Link>
              <Link href="/discover" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'transparent',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                >
                  Explore Platform
                  <Music size={16} />
                </button>
              </Link>
            </div>
          </div>

          {/* Right Side - Rive Logo */}
          <div style={{
            height: '500px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <RiveLogo
              className="hero-logo"
              width={500}
              height={500}
              autoplay={true}
              loop={true}
            />
          </div>
        </section>

        {/* Mobile Responsive Hero */}
        <section style={{
          padding: '2rem',
          margin: '2rem',
          display: 'none',
          textAlign: 'center',
          flexDirection: 'column',
          gap: '2rem',
          alignItems: 'center'
        }} className="mobile-hero">
          <div style={{
            height: '300px',
            width: '100%',
            maxWidth: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <RiveLogo
              className="mobile-hero-logo"
              width={400}
              height={300}
              autoplay={true}
              loop={true}
            />
          </div>
          <div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '1rem',
              lineHeight: '1.1'
            }}>
              About SoundBridge
            </h1>
            <p style={{
              fontSize: '1.1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: '1.6',
              marginBottom: '2rem'
            }}>
              The world&apos;s first truly level playing field for musicians and creators, 
              where discovery meets collaboration and every voice has the potential to be heard.
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Link href="/signup" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  Join SoundBridge
                  <ArrowRight size={16} />
                </button>
              </Link>
              <Link href="/discover" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'transparent',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  Explore Platform
                  <Music size={16} />
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* The Story Section */}
        <section style={{ padding: '4rem 2rem' }}>
          <div style={{
            maxWidth: '1000px',
            margin: '0 auto'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '3rem'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Lightbulb size={24} color="white" />
              </div>
              <h2 style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                color: 'white',
                margin: 0
              }}>
                The Story Behind SoundBridge
              </h2>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '3rem',
              marginBottom: '3rem'
            }}>
              <p style={{
                fontSize: '1.1rem',
                lineHeight: '1.8',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '2rem'
              }}>
                SoundBridge was born from a moment of simple frustration that sparked a revolutionary idea. 
                Our founder found himself experiencing the all-too-familiar struggle of boredom - wanting to 
                discover and attend live music events but feeling disconnected from the traditional discovery 
                methods that dominated the landscape.
              </p>

              <p style={{
                fontSize: '1.1rem',
                lineHeight: '1.8',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '2rem'
              }}>
                The conventional approaches felt distant and impersonal. Eventbrite required endless scrolling 
                through irrelevant listings. Social media ads felt intrusive and poorly targeted. Spotify&apos;s 
                event recommendations seemed disconnected from local scenes. Facebook events got lost in crowded 
                feeds. Traditional music blogs and websites demanded active searching rather than intuitive discovery.
              </p>

              <p style={{
                fontSize: '1.1rem',
                lineHeight: '1.8',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '2rem'
              }}>
                What was needed wasn&apos;t another app to check or another platform to search through. The vision 
                was for something that would meet people at their doorstep - events and creators that would find 
                their ideal audience organically, and audiences who would discover exactly what they didn&apos;t 
                know they were looking for.
              </p>

              <div style={{
                background: 'linear-gradient(45deg, rgba(220, 38, 38, 0.1), rgba(236, 72, 153, 0.1))',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '12px',
                padding: '2rem',
                marginTop: '2rem'
              }}>
                <p style={{
                  fontSize: '1.1rem',
                  lineHeight: '1.8',
                  color: 'white',
                  fontStyle: 'italic',
                  margin: 0
                }}>
                  &quot;The breakthrough insight came through recognizing that event discovery shouldn&apos;t rely on 
                  advertising budgets or algorithmic luck. Instead, it should work through intentional invitation - 
                  where your events naturally reach people who have optimized their accounts to see exactly what 
                  you&apos;re offering.&quot;
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
          borderRadius: '20px',
          margin: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: 'white',
            marginBottom: '1rem'
          }}>
            Join the SoundBridge Revolution
          </h2>
          <p style={{
            fontSize: '1.2rem',
            color: 'rgba(255, 255, 255, 0.8)',
            maxWidth: '600px',
            margin: '0 auto 2rem',
            lineHeight: '1.6'
          }}>
            Be part of the future of music discovery and creator collaboration. 
            Your next favorite artist or perfect collaboration partner is waiting.
          </p>
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <Link href="/signup" style={{ textDecoration: 'none' }}>
              <button style={{
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
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
                Get Started
                <ArrowRight size={16} />
              </button>
            </Link>
            <Link href="/discover" style={{ textDecoration: 'none' }}>
              <button style={{
                background: 'transparent',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '1rem 2rem',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              >
                Explore Now
                <Music size={16} />
              </button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
}