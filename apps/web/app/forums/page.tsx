'use client';

import React from 'react';
import { Footer } from '../../src/components/layout/Footer';
import { MessageSquare, Users, TrendingUp, Clock, Star, Search, Filter } from 'lucide-react';

export default function ForumsPage() {
  return (
    <div style={{ backgroundColor: '#000000', minHeight: '100vh' }}>
      {/* Main Content */}
      <main style={{
        padding: '2rem',
        paddingBottom: '7rem',
        maxWidth: '1400px',
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
            <MessageSquare size={48} style={{ color: '#DC2626' }} />
            <h1 style={{
              fontSize: '3rem',
              fontWeight: '700',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0
            }}>
              Forums
            </h1>
          </div>
          <p style={{
            fontSize: '1.2rem',
            color: 'rgba(255, 255, 255, 0.8)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Connect with the SoundBridge community. Share ideas, ask questions, and discover new music together.
          </p>
        </section>

        {/* Quick Stats */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '3rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <Users size={32} style={{ color: '#DC2626', marginBottom: '0.5rem' }} />
            <h3 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>2,847</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>Active Members</p>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <MessageSquare size={32} style={{ color: '#EC4899', marginBottom: '0.5rem' }} />
            <h3 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>15,623</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>Discussions</p>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <TrendingUp size={32} style={{ color: '#10B981', marginBottom: '0.5rem' }} />
            <h3 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>8,942</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>Posts Today</p>
          </div>
        </section>

        {/* Coming Soon Message */}
        <section style={{
          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(236, 72, 153, 0.1))',
          border: '2px solid rgba(220, 38, 38, 0.3)',
          borderRadius: '16px',
          padding: '3rem',
          textAlign: 'center',
          marginBottom: '3rem'
        }}>
          <Clock size={64} style={{ color: '#DC2626', marginBottom: '1rem' }} />
          <h2 style={{
            fontSize: '2rem',
            color: 'white',
            marginBottom: '1rem'
          }}>
            Forums Coming Soon!
          </h2>
          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            We're building an amazing community forum experience. Soon you'll be able to connect with other music lovers, 
            share your favorite tracks, discuss events, and get recommendations from the SoundBridge community.
          </p>
        </section>

        {/* Planned Features */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '2rem'
          }}>
            <MessageSquare size={32} style={{ color: '#DC2626', marginBottom: '1rem' }} />
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>Discussion Categories</h3>
            <ul style={{ color: 'rgba(255, 255, 255, 0.8)', paddingLeft: '1.5rem' }}>
              <li>Music Discovery</li>
              <li>Event Discussions</li>
              <li>Creator Spotlights</li>
              <li>Technical Support</li>
              <li>Community Feedback</li>
            </ul>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '2rem'
          }}>
            <Star size={32} style={{ color: '#EC4899', marginBottom: '1rem' }} />
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>Community Features</h3>
            <ul style={{ color: 'rgba(255, 255, 255, 0.8)', paddingLeft: '1.5rem' }}>
              <li>Upvote/Downvote Posts</li>
              <li>User Reputation System</li>
              <li>Moderated Discussions</li>
              <li>Real-time Notifications</li>
              <li>Rich Text Editor</li>
            </ul>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '2rem'
          }}>
            <Search size={32} style={{ color: '#10B981', marginBottom: '1rem' }} />
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>Advanced Features</h3>
            <ul style={{ color: 'rgba(255, 255, 255, 0.8)', paddingLeft: '1.5rem' }}>
              <li>Advanced Search & Filtering</li>
              <li>Tag-based Organization</li>
              <li>Mobile App Integration</li>
              <li>Email Notifications</li>
              <li>Moderation Tools</li>
            </ul>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}


