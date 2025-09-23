'use client';

import React from 'react';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import { Upload, Mic, Calendar, Users } from 'lucide-react';
import Link from 'next/link';

export default function TestFloatingCardPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
      padding: '2rem',
      color: 'white'
    }}>
      <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>
        FloatingCard Test Page
      </h1>
      
      <p style={{ textAlign: 'center', marginBottom: '2rem' }}>
        You should see a floating card in the bottom-right corner of the screen.
      </p>

      {/* Floating Quick Actions Card */}
      <FloatingCard title="Quick Actions" position="bottom-right">
        <div className="quick-actions">
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <div className="quick-action">
              <Upload size={16} />
              Upload Music
            </div>
          </Link>
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <div className="quick-action">
              <Mic size={16} />
              Start Podcast
            </div>
          </Link>
          <Link href="/events/create" style={{ textDecoration: 'none' }}>
            <div className="quick-action">
              <Calendar size={16} />
              Create Event
            </div>
          </Link>
          <div className="quick-action">
            <Users size={16} />
            Find Collaborators
          </div>
        </div>

        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Friends Activity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div>John is listening to "Praise Medley"</div>
          <div>Sarah posted a new track</div>
          <div>Mike joined Gospel Night event</div>
        </div>
      </FloatingCard>
    </div>
  );
}
