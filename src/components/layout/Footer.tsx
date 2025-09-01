'use client';

import React from 'react';
import Link from 'next/link';
import { Instagram, Twitter, Youtube, Music, Mic, Calendar, Users, HelpCircle, Mail, Shield, FileText } from 'lucide-react';

export function Footer() {
  return (
    <footer className="section">
      <div className="section-header">
        <h2 className="section-title">SoundBridge</h2>
      </div>
      
      <div className="grid grid-4">
        {/* Company Card */}
        <div className="card">
          <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Company</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link href="/about" style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              About
            </Link>
            <Link href="/careers" style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Careers
            </Link>
            <Link href="/press" style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Press
            </Link>
            <Link href="/blog" style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Blog
            </Link>
          </div>
        </div>

        {/* Creators Card */}
        <div className="card">
          <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Creators</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link href="/upload" style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Music size={16} /> Upload Music
            </Link>
            <Link href="/podcast/upload" style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Mic size={16} /> Start Podcast
            </Link>
            <Link href="/create-event" style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Calendar size={16} /> Create Event
            </Link>
            <Link href="/resources" style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Users size={16} /> Resources
            </Link>
          </div>
        </div>

        {/* Community Card */}
        <div className="card">
          <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Community</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link href="/discover" style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Discover
            </Link>
            <Link href="/events" style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Events
            </Link>
            <Link href="/forums" style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Forums
            </Link>
            <Link href="/guidelines" style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              Guidelines
            </Link>
          </div>
        </div>

        {/* Support Card */}
        <div className="card">
          <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>Support</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link href="/help" style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <HelpCircle size={16} /> Help Center
            </Link>
            <Link href="/contact" style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Mail size={16} /> Contact
            </Link>
            <Link href="/legal/privacy" style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Shield size={16} /> Privacy Policy
            </Link>
            <Link href="/legal/terms" style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <FileText size={16} /> Terms
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div style={{ marginTop: '2rem', textAlign: 'center', padding: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          © 2024 SoundBridge. Connecting creators across UK & Nigeria
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <Link href="#" style={{ color: 'var(--text-secondary)', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Instagram size={20} />
          </Link>
          <Link href="#" style={{ color: 'var(--text-secondary)', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Twitter size={20} />
          </Link>
          <Link href="#" style={{ color: 'var(--text-secondary)', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Music size={20} />
          </Link>
          <Link href="#" style={{ color: 'var(--text-secondary)', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Youtube size={20} />
          </Link>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <Link href="/legal/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy</Link>
          <span>•</span>
          <Link href="/legal/terms" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms</Link>
          <span>•</span>
          <Link href="/cookies" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Cookies</Link>
        </div>
      </div>
    </footer>
  );
} 