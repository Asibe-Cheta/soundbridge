'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/src/contexts/AuthContext';
import { Footer } from '../../src/components/layout/Footer';
import SoundBridgeMetallicLogo from '../../src/components/ui/SoundBridgeMetallicLogo';
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
        <nav className="nav">
          <Link href="/" style={{ textDecoration: 'none', color: 'white' }}>For You</Link>
          <Link href="/discover" style={{ textDecoration: 'none', color: 'white' }}>Discover</Link>
          <Link href="/events" style={{ textDecoration: 'none', color: 'white' }}>Events</Link>
          <Link href="/creators" style={{ textDecoration: 'none', color: 'white' }}>Creators</Link>
          <Link href="/about" style={{ textDecoration: 'none', color: '#EC4899' }}>About</Link>
        </nav>
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
              placeholder="Search creators, events, podcasts..."
              style={{ 
                width: '100%', 
                paddingLeft: '40px',
                fontSize: '16px'
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
            <>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button style={{
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
                <button style={{
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
        {/* Hero Section with Metallic Logo */}
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

          {/* Right Side - Metallic Logo */}
          <div style={{
            height: '500px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <SoundBridgeMetallicLogo
              className="hero-logo"
              params={{
                patternScale: 2,
                refraction: 0.015,
                edge: 2,
                patternBlur: 0.005,
                liquid: 0.07,
                speed: 0.3
              }}
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
            <SoundBridgeMetallicLogo
              className="mobile-hero-logo"
              params={{
                patternScale: 2,
                refraction: 0.015,
                edge: 2,
                patternBlur: 0.005,
                liquid: 0.07,
                speed: 0.3
              }}
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

        {/* How It Works Section */}
        <section style={{ padding: '4rem 2rem', background: 'rgba(255, 255, 255, 0.02)' }}>
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
                <Target size={24} color="white" />
              </div>
              <h2 style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                color: 'white',
                margin: 0
              }}>
                How SoundBridge Works: LinkedIn Meets Spotify
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
                SoundBridge fundamentally reimagines creator connections by combining the professional networking 
                power of LinkedIn with the music discovery magic of Spotify. We&apos;ve created the world&apos;s first 
                truly level playing field for musicians and creators.
              </p>

              <p style={{
                fontSize: '1.1rem',
                lineHeight: '1.8',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '2rem'
              }}>
                Unlike traditional platforms where success depends on follower counts or algorithmic favor, 
                SoundBridge ensures every creator - from bedroom producers to established artists - has equal 
                opportunity to connect and collaborate. There&apos;s no hierarchy, no verified badges creating 
                artificial barriers, and no need to hope your DM gets noticed in a crowded inbox.
              </p>

              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#EC4899',
                marginBottom: '1.5rem',
                marginTop: '2rem'
              }}>
                Real Collaboration, Made Simple:
              </h3>

              <p style={{
                fontSize: '1.1rem',
                lineHeight: '1.8',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '2rem'
              }}>
                Every creator on SoundBridge sets their collaboration availability directly in their profile - 
                it&apos;s a platform rule, not an option. Want to work with that producer whose track you love? 
                Check their availability calendar. Interested in collaborating with a vocalist? See exactly 
                when they&apos;re open for projects. No more sending messages into the void, hoping for a response.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
                marginTop: '2rem'
              }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}>
                  <Upload size={32} color="#EC4899" style={{ marginBottom: '1rem' }} />
                  <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Upload Freely</h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                    No gatekeepers, no approval processes
                  </p>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}>
                  <Play size={32} color="#EC4899" style={{ marginBottom: '1rem' }} />
                  <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Stream Unlimited</h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                    Discover music without restrictions
                  </p>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}>
                  <DollarSign size={32} color="#EC4899" style={{ marginBottom: '1rem' }} />
                  <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Get Paid Directly</h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                    Fair compensation without excessive fees
                  </p>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}>
                  <Users size={32} color="#EC4899" style={{ marginBottom: '1rem' }} />
                  <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Connect Authentically</h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                    Meaningful professional relationships
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
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
                <Heart size={24} color="white" />
              </div>
              <h2 style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                color: 'white',
                margin: 0
              }}>
                Our Mission
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
                SoundBridge exists to democratize music discovery and creator success by building genuine 
                connections between artists and their ideal audiences.
              </p>

              <p style={{
                fontSize: '1.1rem',
                lineHeight: '1.8',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '2rem'
              }}>
                We believe that exceptional music and meaningful live experiences shouldn&apos;t depend on 
                marketing budgets or algorithmic chance. Every creator deserves to find their community, 
                and every music lover deserves to discover their next favorite artist or unmissable event.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
                marginTop: '2rem'
              }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <h4 style={{ color: '#EC4899', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={20} />
                    Creator Control
                  </h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    Creators control their destiny through direct audience relationships rather than platform dependence
                  </p>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <h4 style={{ color: '#EC4899', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={20} />
                    Natural Discovery
                  </h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    Discovery feels natural because it&apos;s built on genuine musical affinity rather than promotional spend
                  </p>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <h4 style={{ color: '#EC4899', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={20} />
                    Local Scenes Thrive
                  </h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    Local scenes thrive by connecting communities around shared musical passion
                  </p>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <h4 style={{ color: '#EC4899', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Globe size={20} />
                    Global Connections
                  </h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    Global connections form while maintaining the intimacy of local music culture
                  </p>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <h4 style={{ color: '#EC4899', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DollarSign size={20} />
                    Fair Compensation
                  </h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    Fair compensation flows directly to artists without excessive intermediary fees
                  </p>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <h4 style={{ color: '#EC4899', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={20} />
                    Seamless Collaboration
                  </h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    Professional collaboration happens seamlessly through transparent availability and direct connection tools
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section style={{ padding: '4rem 2rem', background: 'rgba(255, 255, 255, 0.02)' }}>
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
                <Globe size={24} color="white" />
              </div>
              <h2 style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                color: 'white',
                margin: 0
              }}>
                Our Vision for the Future
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
                We envision a world where the distance between creators and their audiences disappears. 
                Where a talented musician in Lagos can effortlessly connect with fans in London who share 
                their musical sensibilities. Where live events find their perfect attendees not through 
                expensive advertising, but through community-driven discovery.
              </p>

              <p style={{
                fontSize: '1.1rem',
                lineHeight: '1.8',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '2rem'
              }}>
                SoundBridge is building the infrastructure for a more equitable music economy - one where 
                success is determined by artistic merit and community connection rather than marketing reach 
                or platform politics.
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
                  margin: 0
                }}>
                  Our ultimate goal is to foster a global community of music creators and enthusiasts who 
                  support each other&apos;s growth, celebrate diverse musical expressions, and keep the power 
                  of music discovery in the hands of the people who create and truly appreciate it.
                </p>
              </div>

              <p style={{
                fontSize: '1.1rem',
                lineHeight: '1.8',
                color: 'rgba(255, 255, 255, 0.9)',
                marginTop: '2rem',
                marginBottom: 0
              }}>
                Through technology that serves artistry and community that amplifies creativity, we&apos;re 
                creating a future where every voice has the potential to be heard and every listener can 
                discover their next musical obsession.
              </p>
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

        {/* Footer */}
        <Footer />
      </main>
    </>
  );
}
