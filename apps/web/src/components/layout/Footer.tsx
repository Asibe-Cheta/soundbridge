'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Instagram, Twitter, Youtube, Music, Mic, Calendar, Users, HelpCircle, Mail, Shield, FileText } from 'lucide-react';

export function Footer() {
  const [isMobile, setIsMobile] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const footerLinkClass = isMobile ? 'text-xs leading-tight' : 'text-sm';

  return (
    <footer className="section">
      
      <div className="grid grid-4">
        {/* Company Card */}
        <div className="card">
          <h3 className={`font-semibold ${isMobile ? 'mb-2 text-sm' : 'mb-4 text-base'} ${
            theme === 'dark' ? 'text-pink-500' : 'text-pink-600'
          }`}>Company</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.3rem' : '0.5rem' }}>
            <Link className={footerLinkClass} href="/about" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              About
            </Link>
            <Link className={footerLinkClass} href="/careers" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Careers
            </Link>
            <Link className={footerLinkClass} href="/press" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Press
            </Link>
            <Link className={footerLinkClass} href="/blog" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Blog
            </Link>
          </div>
        </div>

        {/* Creators Card */}
        <div className="card">
          <h3 className={`font-semibold ${isMobile ? 'mb-2 text-sm' : 'mb-4 text-base'} ${
            theme === 'dark' ? 'text-pink-500' : 'text-pink-600'
          }`}>Creators</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.3rem' : '0.5rem' }}>
            <Link className={footerLinkClass} href="/upload" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '0.3rem' : '0.5rem',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Music size={isMobile ? 12 : 16} /> Upload Music
            </Link>
            <Link className={footerLinkClass} href="/upload" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '0.3rem' : '0.5rem',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Mic size={isMobile ? 12 : 16} /> Start Podcast
            </Link>
            <Link className={footerLinkClass} href="/create-event" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '0.3rem' : '0.5rem',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Calendar size={isMobile ? 12 : 16} /> Create Event
            </Link>
            <Link className={footerLinkClass} href="/pro-resources" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '0.3rem' : '0.5rem',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Users size={isMobile ? 12 : 16} /> Resources
            </Link>
          </div>
        </div>

        {/* Community Card */}
        <div className="card">
          <h3 className={`font-semibold ${isMobile ? 'mb-2 text-sm' : 'mb-4 text-base'} ${
            theme === 'dark' ? 'text-pink-500' : 'text-pink-600'
          }`}>Community</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.3rem' : '0.5rem' }}>
            <Link className={footerLinkClass} href="/discover" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Discover
            </Link>
            <Link className={footerLinkClass} href="/events" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Events
            </Link>
            <Link className={footerLinkClass} href="/forums" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Forums
            </Link>
            <Link className={footerLinkClass} href="/guidelines" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Guidelines
            </Link>
          </div>
        </div>

        {/* Support Card */}
        <div className="card">
          <h3 className={`font-semibold ${isMobile ? 'mb-2 text-sm' : 'mb-4 text-base'} ${
            theme === 'dark' ? 'text-pink-500' : 'text-pink-600'
          }`}>Support</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.3rem' : '0.5rem' }}>
            <Link className={footerLinkClass} href="/help" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '0.3rem' : '0.5rem',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <HelpCircle size={isMobile ? 12 : 16} /> Help Center
            </Link>
            <Link className={footerLinkClass} href="/contact" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '0.3rem' : '0.5rem',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Mail size={isMobile ? 12 : 16} /> Contact
            </Link>
            <Link className={footerLinkClass} href="/legal/privacy" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '0.3rem' : '0.5rem',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Shield size={isMobile ? 12 : 16} /> Privacy Policy
            </Link>
            <Link className={footerLinkClass} href="/legal/terms" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '0.3rem' : '0.5rem',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <FileText size={isMobile ? 12 : 16} /> Terms
            </Link>
            <Link className={footerLinkClass} href="/legal/copyright" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Copyright Policy
            </Link>
            <Link className={footerLinkClass} href="/aml-policy" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              AML Policy
            </Link>
            <Link className={footerLinkClass} href="/legal/dmca" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              padding: isMobile ? '0.3rem' : '0.5rem', 
              borderRadius: '8px', 
              transition: 'all 0.3s ease',
            }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              DMCA Notice &amp; Takedown
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className={`${isMobile ? 'mt-4 py-2' : 'mt-8 py-4'} text-center border-t ${
        theme === 'dark' ? 'border-white/10' : 'border-gray-200'
      }`}>
        <div className={`${isMobile ? 'mb-2 text-xs' : 'mb-4 text-sm'} ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        }`}>
          © {new Date().getFullYear()} SoundBridge · Built in the UK. Built for the world.
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: isMobile ? '0.5rem' : '1rem', 
          marginBottom: isMobile ? '0.5rem' : '1rem' 
        }}>
          <Link className={footerLinkClass} href="#" style={{ 
            color: 'var(--text-secondary)', 
            padding: isMobile ? '0.3rem' : '0.5rem', 
            borderRadius: '8px', 
            transition: 'all 0.3s ease' 
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Instagram size={isMobile ? 16 : 20} />
          </Link>
          <Link className={footerLinkClass} href="#" style={{ 
            color: 'var(--text-secondary)', 
            padding: isMobile ? '0.3rem' : '0.5rem', 
            borderRadius: '8px', 
            transition: 'all 0.3s ease' 
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Twitter size={isMobile ? 16 : 20} />
          </Link>
          <Link className={footerLinkClass} href="#" style={{ 
            color: 'var(--text-secondary)', 
            padding: isMobile ? '0.3rem' : '0.5rem', 
            borderRadius: '8px', 
            transition: 'all 0.3s ease' 
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Music size={isMobile ? 16 : 20} />
          </Link>
          <Link className={footerLinkClass} href="#" style={{ 
            color: 'var(--text-secondary)', 
            padding: isMobile ? '0.3rem' : '0.5rem', 
            borderRadius: '8px', 
            transition: 'all 0.3s ease' 
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Youtube size={isMobile ? 16 : 20} />
          </Link>
        </div>
        
        <div
          className={`flex justify-center gap-2 sm:gap-4 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
        >
          <Link className={footerLinkClass} href="/legal/privacy" style={{ 
            color: 'var(--text-secondary)', 
            textDecoration: 'none' 
          }}>Privacy</Link>
          <span>•</span>
          <Link className={footerLinkClass} href="/legal/terms" style={{ 
            color: 'var(--text-secondary)', 
            textDecoration: 'none' 
          }}>Terms</Link>
          <span>•</span>
          <Link className={footerLinkClass} href="/legal/copyright" style={{ 
            color: 'var(--text-secondary)', 
            textDecoration: 'none' 
          }}>Copyright</Link>
          <span>•</span>
          <Link className={footerLinkClass} href="/aml-policy" style={{ 
            color: 'var(--text-secondary)', 
            textDecoration: 'none' 
          }}>AML</Link>
          <span>•</span>
          <Link className={footerLinkClass} href="/legal/dmca" style={{ 
            color: 'var(--text-secondary)', 
            textDecoration: 'none' 
          }}>DMCA</Link>
          <span>•</span>
          <Link className={footerLinkClass} href="/cookies" style={{ 
            color: 'var(--text-secondary)', 
            textDecoration: 'none' 
          }}>Cookies</Link>
        </div>
      </div>
    </footer>
  );
} 