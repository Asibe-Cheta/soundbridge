'use client';

import React from 'react';
import { Footer } from '../../src/components/layout/Footer';
import { BookOpen } from 'lucide-react';

export default function ResourcesPage() {
  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh' }}>

      {/* Main Content */}
      <main className="main-container" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Hero Section */}
        <section style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <h1 style={{
              fontSize: '3rem',
              fontWeight: '800',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '1rem',
              lineHeight: '1.2'
            }}>
              Resources
            </h1>
            <p style={{
              fontSize: '1.25rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              marginBottom: '2rem'
            }}>
              Everything you need to succeed on SoundBridge. From getting started guides to advanced tips for creators.
            </p>
          </div>
        </section>

        {/* Placeholder Content Section */}
        <section style={{
          padding: '4rem 2rem',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)'
          }}>
            <BookOpen size={64} color="var(--accent-primary)" style={{ marginBottom: '2rem' }} />
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '1rem'
            }}>
              Content Coming Soon
            </h2>
            <p style={{
              fontSize: '1.1rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              We're preparing comprehensive resources to help you make the most of SoundBridge. 
              Check back soon for guides, tutorials, and helpful content.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
