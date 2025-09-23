'use client';

import React from 'react';
import { Footer } from '../../src/components/layout/Footer';
import { BookOpen, Shield, Heart, Users, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function GuidelinesPage() {
  return (
    <div style={{ backgroundColor: '#000000', minHeight: '100vh' }}>
      {/* Main Content */}
      <main style={{
        padding: '2rem',
        paddingBottom: '7rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Hero Section */}
        <section style={{
          textAlign: 'center',
          marginBottom: '3rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <BookOpen size={48} style={{ color: '#DC2626' }} />
            <h1 style={{
              fontSize: '3rem',
              fontWeight: '700',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0
            }}>
              Community Guidelines
            </h1>
          </div>
          <p style={{
            fontSize: '1.2rem',
            color: 'rgba(255, 255, 255, 0.8)',
            maxWidth: '700px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Help us create a safe, welcoming, and inspiring space for all music lovers to connect and share their passion.
          </p>
        </section>

        {/* Core Principles */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '2rem',
            color: 'white',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            Our Core Principles
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <Heart size={48} style={{ color: '#DC2626', marginBottom: '1rem' }} />
              <h3 style={{ color: 'white', marginBottom: '1rem' }}>Respect & Kindness</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
                Treat everyone with respect and kindness. We're all here because we love music - let's celebrate that passion together.
              </p>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <Shield size={48} style={{ color: '#EC4899', marginBottom: '1rem' }} />
              <h3 style={{ color: 'white', marginBottom: '1rem' }}>Safe Environment</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
                We maintain a safe space free from harassment, discrimination, and harmful content. Your safety is our priority.
              </p>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <Users size={48} style={{ color: '#10B981', marginBottom: '1rem' }} />
              <h3 style={{ color: 'white', marginBottom: '1rem' }}>Inclusive Community</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
                We welcome people of all backgrounds, identities, and musical tastes. Diversity makes our community stronger.
              </p>
            </div>
          </div>
        </section>

        {/* Do's and Don'ts */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '2rem',
            color: 'white',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            Community Standards
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '2rem'
          }}>
            {/* Do's */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '2px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '2rem'
            }}>
              <h3 style={{
                color: '#10B981',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle size={24} />
                Do's
              </h3>
              <ul style={{ color: 'rgba(255, 255, 255, 0.9)', lineHeight: '1.8' }}>
                <li>Share your favorite music and artists</li>
                <li>Recommend events and venues to others</li>
                <li>Provide constructive feedback</li>
                <li>Report inappropriate content or behavior</li>
                <li>Respect intellectual property rights</li>
                <li>Use inclusive language</li>
                <li>Help new community members</li>
                <li>Celebrate diverse musical tastes</li>
              </ul>
            </div>
            
            {/* Don'ts */}
            <div style={{
              background: 'rgba(220, 38, 38, 0.1)',
              border: '2px solid rgba(220, 38, 38, 0.3)',
              borderRadius: '12px',
              padding: '2rem'
            }}>
              <h3 style={{
                color: '#FCA5A5',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <XCircle size={24} />
                Don'ts
              </h3>
              <ul style={{ color: 'rgba(255, 255, 255, 0.9)', lineHeight: '1.8' }}>
                <li>Harass, bully, or intimidate others</li>
                <li>Share hate speech or discriminatory content</li>
                <li>Post spam or promotional content</li>
                <li>Share copyrighted material without permission</li>
                <li>Impersonate other users or artists</li>
                <li>Share personal information of others</li>
                <li>Create multiple accounts to circumvent bans</li>
                <li>Engage in trolling or disruptive behavior</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Content Guidelines */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '2rem',
            color: 'white',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            Content Guidelines
          </h2>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '2rem'
          }}>
            <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Music Content</h3>
            <ul style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.8', marginBottom: '2rem' }}>
              <li>Only share music you have the right to distribute</li>
              <li>Provide proper attribution to artists and creators</li>
              <li>Include relevant tags and descriptions</li>
              <li>Respect artist and label preferences</li>
            </ul>
            
            <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Event Content</h3>
            <ul style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.8', marginBottom: '2rem' }}>
              <li>Verify event details before posting</li>
              <li>Include date, time, location, and ticket information</li>
              <li>Don't promote events that violate our guidelines</li>
              <li>Respect venue and promoter policies</li>
            </ul>
            
            <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>User-Generated Content</h3>
            <ul style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.8' }}>
              <li>Original content is encouraged and valued</li>
              <li>Respect others' privacy and consent</li>
              <li>Don't share misleading or false information</li>
              <li>Keep content relevant to music and community</li>
            </ul>
          </div>
        </section>

        {/* Enforcement */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '2rem',
            color: 'white',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            Enforcement & Appeals
          </h2>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '2rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <AlertTriangle size={32} style={{ color: '#F59E0B' }} />
              <h3 style={{ color: 'white', margin: 0 }}>How We Enforce Guidelines</h3>
            </div>
            
            <ul style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.8', marginBottom: '2rem' }}>
              <li><strong>Warning:</strong> First-time minor violations receive a warning</li>
              <li><strong>Content Removal:</strong> Inappropriate content is removed immediately</li>
              <li><strong>Temporary Suspension:</strong> Repeated violations result in temporary account suspension</li>
              <li><strong>Permanent Ban:</strong> Severe or persistent violations may result in permanent removal</li>
            </ul>
            
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>Appeals Process</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
              If you believe your content was removed or your account was suspended in error, 
              you can appeal by contacting our moderation team. We review all appeals fairly 
              and will respond within 48 hours.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section style={{
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(236, 72, 153, 0.1))',
          border: '2px solid rgba(220, 38, 38, 0.3)',
          borderRadius: '16px',
          padding: '3rem'
        }}>
          <h2 style={{
            fontSize: '2rem',
            color: 'white',
            marginBottom: '1rem'
          }}>
            Questions or Concerns?
          </h2>
          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            maxWidth: '600px',
            margin: '0 auto 2rem auto'
          }}>
            If you have questions about these guidelines or need to report a violation, 
            please contact our moderation team. We're here to help maintain a positive 
            community experience for everyone.
          </p>
          <button style={{
            background: 'linear-gradient(45deg, #DC2626, #EC4899)',
            color: 'white',
            border: 'none',
            padding: '1rem 2rem',
            borderRadius: '12px',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Contact Moderation Team
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}


