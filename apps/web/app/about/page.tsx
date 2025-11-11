'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '../../src/components/layout/Footer';
import RiveLogo from '../../src/components/ui/RiveLogo';
import { Music, Lightbulb, ArrowRight } from 'lucide-react';

export default function AboutPage() {
  const [isMobile, setIsMobile] = useState(false);
  const { theme } = useTheme();

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`min-h-screen ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
        : 'bg-gray-50'
    }`}>
      {/* Main Content */}
      <main className="main-container">
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
                  <ArrowRight size={isMobile ? 14 : 16} />
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
                  <Music size={isMobile ? 14 : 16} />
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
          padding: isMobile ? '1rem' : '2rem',
          margin: isMobile ? '0.5rem' : '2rem',
          display: 'none',
          textAlign: 'center',
          flexDirection: 'column',
          gap: isMobile ? '1rem' : '2rem',
          alignItems: 'center'
        }} className="mobile-hero">
          <div style={{
            height: isMobile ? '200px' : '300px',
            width: '100%',
            maxWidth: isMobile ? '300px' : '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <RiveLogo
              className="mobile-hero-logo"
              width={isMobile ? 300 : 400}
              height={isMobile ? 200 : 300}
              autoplay={true}
            />
          </div>
          <div>
            <h1 style={{
              fontSize: isMobile ? '1.5rem' : '2.5rem',
              fontWeight: '800',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: isMobile ? '0.5rem' : '1rem',
              lineHeight: '1.1'
            }}>
              About SoundBridge
            </h1>
            <p style={{
              fontSize: isMobile ? '0.9rem' : '1.1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: '1.6',
              marginBottom: isMobile ? '1rem' : '2rem',
              padding: isMobile ? '0 1rem' : '0'
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
                  padding: isMobile ? '0.8rem 1.5rem' : '1rem 2rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  Join SoundBridge
                  <ArrowRight size={isMobile ? 14 : 16} />
                </button>
              </Link>
              <Link href="/discover" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'transparent',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: isMobile ? '0.8rem 1.5rem' : '1rem 2rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  Explore Platform
                  <Music size={isMobile ? 14 : 16} />
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* The Story Section */}
        <section style={{ padding: isMobile ? '2rem 1rem' : '4rem 2rem' }}>
          <div style={{
            maxWidth: '1000px',
            margin: '0 auto'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '0.5rem' : '1rem',
              marginBottom: isMobile ? '1.5rem' : '3rem',
              flexDirection: isMobile ? 'column' : 'row',
              textAlign: isMobile ? 'center' : 'left'
            }}>
              <div style={{
                width: isMobile ? '50px' : '60px',
                height: isMobile ? '50px' : '60px',
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Lightbulb size={isMobile ? 20 : 24} color="white" />
              </div>
              <h2 style={{
                fontSize: isMobile ? '1.2rem' : '2.5rem',
                fontWeight: '700',
                color: 'white',
                margin: 0,
                lineHeight: isMobile ? '1.3' : '1.1'
              }}>
                The Story Behind SoundBridge
              </h2>
            </div>

            <div className={`${isMobile ? 'py-6 px-6' : 'py-12 px-12'} rounded-2xl ${
              theme === 'dark'
                ? 'bg-white/5 backdrop-blur-lg border border-white/10'
                : 'bg-white border border-gray-200 shadow-sm'
            }`}>
              <p className={`${isMobile ? 'text-sm' : 'text-lg'} leading-relaxed ${isMobile ? 'mb-4' : 'mb-8'} ${
                theme === 'dark' ? 'text-white/90' : 'text-gray-700'
              }`}>
                SoundBridge was born from a moment of simple frustration that sparked a revolutionary idea. 
                Our founder found himself experiencing the all-too-familiar struggle of boredom - wanting to 
                discover and attend live music events but feeling disconnected from the traditional discovery 
                methods that dominated the landscape.
              </p>

              <p className={`${isMobile ? 'text-sm' : 'text-lg'} leading-relaxed ${isMobile ? 'mb-4' : 'mb-8'} ${
                theme === 'dark' ? 'text-white/90' : 'text-gray-700'
              }`}>
                The conventional approaches felt distant and impersonal. Eventbrite required endless scrolling 
                through irrelevant listings. Social media ads felt intrusive and poorly targeted. Spotify&apos;s 
                event recommendations seemed disconnected from local scenes. Facebook events got lost in crowded 
                feeds. Traditional music blogs and websites demanded active searching rather than intuitive discovery.
              </p>

              <p className={`${isMobile ? 'text-sm' : 'text-lg'} leading-relaxed ${isMobile ? 'mb-4' : 'mb-8'} ${
                theme === 'dark' ? 'text-white/90' : 'text-gray-700'
              }`}>
                What was needed wasn&apos;t another app to check or another platform to search through. The vision 
                was for something that would meet people at their doorstep - events and creators that would find 
                their ideal audience organically, and audiences who would discover exactly what they didn&apos;t 
                know they were looking for.
              </p>

              <div className={`rounded-xl ${isMobile ? 'p-6' : 'p-8'} ${isMobile ? 'mt-4' : 'mt-8'} ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-red-600/10 to-pink-500/10 border border-red-500/30'
                  : 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200'
              }`}>
                <p className={`${isMobile ? 'text-sm' : 'text-lg'} leading-relaxed italic m-0 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
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
        <section className={`${isMobile ? 'py-8 px-4' : 'py-16 px-8'} text-center rounded-2xl ${isMobile ? 'mx-4' : 'mx-8'} ${isMobile ? 'mb-4' : 'mb-8'} ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-red-600/10 to-pink-500/10 border border-white/10'
            : 'bg-gradient-to-r from-red-50 to-pink-50 border border-gray-200'
        }`}>
          <h2 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold ${isMobile ? 'mb-2' : 'mb-4'} ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Join the SoundBridge Revolution
          </h2>
          <p className={`${isMobile ? 'text-sm' : 'text-lg'} max-w-2xl mx-auto mb-8 ${
            theme === 'dark' ? 'text-white/80' : 'text-gray-700'
          }`}>
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
                padding: isMobile ? '0.8rem 1.5rem' : '1rem 2rem',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: isMobile ? '0.9rem' : '1rem',
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
                <ArrowRight size={isMobile ? 14 : 16} />
              </button>
            </Link>
            <Link href="/discover" style={{ textDecoration: 'none' }}>
              <button style={{
                background: 'transparent',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: isMobile ? '0.8rem 1.5rem' : '1rem 2rem',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: isMobile ? '0.9rem' : '1rem',
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
                <Music size={isMobile ? 14 : 16} />
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