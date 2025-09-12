'use client';

import React from 'react';
import Link from 'next/link';
import { Footer } from '../../src/components/layout/Footer';
import RiveLogo from '../../src/components/ui/RiveLogo';
import {
  Music,
  Lightbulb,
  ArrowRight
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div style={{ backgroundColor: '#000000', minHeight: '100vh' }}>
      {/* Main Content */}
      <main className="main-container" style={{ backgroundColor: '#000000' }}>
        <style>{`
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
    </div>
  );
}