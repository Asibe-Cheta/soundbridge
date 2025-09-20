'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Instagram, Twitter, Youtube, Music, Mic, Calendar, Users, HelpCircle, Mail, Shield, FileText } from 'lucide-react';

export function Footer() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  return (
    <footer className="section">
      <div className="section-header">
        <h2 className="section-title" style={{
          fontSize: isMobile ? '1rem' : '1.8rem',
          lineHeight: isMobile ? '1.2' : 'inherit',
          marginBottom: isMobile ? '0.3rem' : '1.5rem'
        }}>SoundBridge</h2>
      </div>
      
      <div className="grid grid-4">
        {/* Company Card */}
        <div className="card">
          <h3 style={{ 
            fontWeight: '600', 
            marginBottom: isMobile ? '0.5rem' : '1rem', 
            color: '#EC4899',
            fontSize: isMobile ? '0.9rem' : '1rem',
            lineHeight: isMobile ? '1.2' : 'inherit'
          }}>Company</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.3rem' : '0.5rem' }}>
            <Link href="/about" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              About
            </Link>
            <Link href="/careers" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Careers
            </Link>
            <Link href="/press" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Press
            </Link>
            <Link href="/blog" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Blog
            </Link>
          </div>
        </div>

        {/* Creators Card */}
        <div className="card">
          <h3 style={{ 
            fontWeight: '600', 
            marginBottom: isMobile ? '0.5rem' : '1rem', 
            color: '#EC4899',
            fontSize: isMobile ? '0.9rem' : '1rem',
            lineHeight: isMobile ? '1.2' : 'inherit'
          }}>Creators</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.3rem' : '0.5rem' }}>
            <Link href="/upload" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '0.3rem' : '0.5rem',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Music size={isMobile ? 12 : 16} /> Upload Music
            </Link>
            <Link href="/upload" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '0.3rem' : '0.5rem',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Mic size={isMobile ? 12 : 16} /> Start Podcast
            </Link>
            <Link href="/create-event" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '0.3rem' : '0.5rem',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Calendar size={isMobile ? 12 : 16} /> Create Event
            </Link>
            <Link href="/resources" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '0.3rem' : '0.5rem',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Users size={isMobile ? 12 : 16} /> Resources
            </Link>
          </div>
        </div>

        {/* Community Card */}
        <div className="card">
          <h3 style={{ 
            fontWeight: '600', 
            marginBottom: isMobile ? '0.5rem' : '1rem', 
            color: '#EC4899',
            fontSize: isMobile ? '0.9rem' : '1rem',
            lineHeight: isMobile ? '1.2' : 'inherit'
          }}>Community</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.3rem' : '0.5rem' }}>
            <Link href="/discover" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Discover
            </Link>
            <Link href="/events" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Events
            </Link>
            <Link href="/forums" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Forums
            </Link>
            <Link href="/guidelines" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Guidelines
            </Link>
          </div>
        </div>

        {/* Support Card */}
        <div className="card">
          <h3 style={{ 
            fontWeight: '600', 
            marginBottom: isMobile ? '0.5rem' : '1rem', 
            color: '#EC4899',
            fontSize: isMobile ? '0.9rem' : '1rem',
            lineHeight: isMobile ? '1.2' : 'inherit'
          }}>Support</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.3rem' : '0.5rem' }}>
            <Link href="/help" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '0.3rem' : '0.5rem',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <HelpCircle size={isMobile ? 12 : 16} /> Help Center
            </Link>
            <Link href="/contact" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '0.3rem' : '0.5rem',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Mail size={isMobile ? 12 : 16} /> Contact
            </Link>
            <Link href="/legal/privacy" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '0.3rem' : '0.5rem',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Shield size={isMobile ? 12 : 16} /> Privacy Policy
            </Link>
            <Link href="/legal/terms" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '0.3rem' : '0.5rem',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <FileText size={isMobile ? 12 : 16} /> Terms
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div style={{ 
        marginTop: isMobile ? '1rem' : '2rem', 
        textAlign: 'center', 
        padding: isMobile ? '0.5rem' : '1rem', 
        borderTop: '1px solid rgba(255, 255, 255, 0.1)' 
      }}>
        <div style={{ 
          marginBottom: isMobile ? '0.5rem' : '1rem', 
          color: 'var(--text-secondary)', 
          fontSize: isMobile ? '0.7rem' : '0.9rem',
          lineHeight: isMobile ? '1.3' : 'inherit'
        }}>
          © 2024 SoundBridge. Connecting creators across UK & Nigeria
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: isMobile ? '0.5rem' : '1rem', 
          marginBottom: isMobile ? '0.5rem' : '1rem' 
        }}>
          <Link href="#" style={{ 
            color: 'var(--text-secondary)', 
            padding: isMobile ? '0.3rem' : '0.5rem', 
            borderRadius: '8px', 
            transition: 'all 0.3s ease' 
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Instagram size={isMobile ? 16 : 20} />
          </Link>
          <Link href="#" style={{ 
            color: 'var(--text-secondary)', 
            padding: isMobile ? '0.3rem' : '0.5rem', 
            borderRadius: '8px', 
            transition: 'all 0.3s ease' 
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Twitter size={isMobile ? 16 : 20} />
          </Link>
          <Link href="#" style={{ 
            color: 'var(--text-secondary)', 
            padding: isMobile ? '0.3rem' : '0.5rem', 
            borderRadius: '8px', 
            transition: 'all 0.3s ease' 
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Music size={isMobile ? 16 : 20} />
          </Link>
          <Link href="#" style={{ 
            color: 'var(--text-secondary)', 
            padding: isMobile ? '0.3rem' : '0.5rem', 
            borderRadius: '8px', 
            transition: 'all 0.3s ease' 
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Youtube size={isMobile ? 16 : 20} />
          </Link>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: isMobile ? '0.5rem' : '1rem', 
          fontSize: isMobile ? '0.7rem' : '0.8rem', 
          color: 'var(--text-secondary)',
          lineHeight: isMobile ? '1.3' : 'inherit'
        }}>
          <Link href="/legal/privacy" style={{ 
            color: 'var(--text-secondary)', 
            textDecoration: 'none' 
          }}>Privacy</Link>
          <span>•</span>
          <Link href="/legal/terms" style={{ 
            color: 'var(--text-secondary)', 
            textDecoration: 'none' 
          }}>Terms</Link>
          <span>•</span>
          <Link href="/cookies" style={{ 
            color: 'var(--text-secondary)', 
            textDecoration: 'none' 
          }}>Cookies</Link>
        </div>
      </div>
    </footer>
  );
} 