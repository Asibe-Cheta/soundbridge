'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Footer } from '../../../src/components/layout/Footer';
import { useAuth } from '../../../src/contexts/AuthContext';
import {
  CheckCircle,
  Music,
  User,
  Home,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import Image from 'next/image';

export default function UploadSuccessPage() {
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [trackData, setTrackData] = useState<{ title: string; trackId?: string } | null>(null);

  useEffect(() => {
    // Get track data from URL params
    const title = searchParams.get('title');
    const trackId = searchParams.get('trackId');
    
    if (title && trackId) {
      setTrackData({
        title,
        trackId: trackId || undefined
      });
    }
  }, [searchParams]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="main-container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <Loader2 size={48} style={{ color: '#EC4899', marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
          <h2 style={{ marginBottom: '1rem' }}>Loading...</h2>
          <p style={{ color: '#999', marginBottom: '2rem' }}>
            Checking your authentication status...
          </p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="main-container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <AlertTriangle size={48} style={{ color: '#EC4899', marginBottom: '1rem' }} />
          <h2 style={{ marginBottom: '1rem' }}>Authentication Required</h2>
          <p style={{ color: '#999', marginBottom: '2rem' }}>
            You need to be logged in to view this page.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button className="btn-primary">Login</button>
            </Link>
            <Link href="/signup" style={{ textDecoration: 'none' }}>
              <button className="btn-secondary">Sign Up</button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
        </nav>
        <div className="search-bar">
          <input type="search" placeholder="Search creators, events, podcasts..." />
        </div>
        <div className="auth-buttons">
          {user ? (
            <div style={{ position: 'relative' }}>
              <Link href="/profile" style={{ textDecoration: 'none' }}>
                <button
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
              </Link>
            </div>
          ) : (
            <>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button className="btn-secondary">Login</button>
              </Link>
              <Link href="/signup" style={{ textDecoration: 'none' }}>
                <button className="btn-primary">Sign Up</button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="main-container">
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          {/* Success Card */}
          <div className="card" style={{ 
            maxWidth: '600px', 
            margin: '0 auto',
            background: 'rgba(34, 197, 94, 0.05)',
            border: '2px solid rgba(34, 197, 94, 0.2)'
          }}>
            {/* Success Icon */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                background: 'linear-gradient(45deg, #22C55E, #16A34A)',
                borderRadius: '50%',
                width: '80px',
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <CheckCircle size={40} color="white" />
              </div>
              <h1 style={{ 
                color: '#22C55E', 
                fontSize: '2.5rem', 
                fontWeight: '700',
                marginBottom: '0.5rem'
              }}>
                Upload Successful!
              </h1>
              <p style={{ 
                color: '#666', 
                fontSize: '1.1rem',
                marginBottom: '2rem'
              }}>
                Your track has been uploaded to SoundBridge
              </p>
            </div>

            {/* Track Details */}
            {trackData && (
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <Music size={24} style={{ color: '#EC4899' }} />
                  <h3 style={{ margin: 0, color: '#EC4899' }}>Track Details</h3>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: '0.5rem 0', fontSize: '1.1rem' }}>
                    <strong>Title:</strong> {trackData.title}
                  </p>
                  {trackData.trackId && (
                    <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
                      <strong>Track ID:</strong> {trackData.trackId}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/profile" style={{ textDecoration: 'none' }}>
                <button className="btn-primary" style={{ 
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <User size={20} />
                  View My Profile
                </button>
              </Link>
              
              <Link href="/upload" style={{ textDecoration: 'none' }}>
                <button className="btn-secondary" style={{ 
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Music size={20} />
                  Upload Another Track
                </button>
              </Link>
              
              <Link href="/" style={{ textDecoration: 'none' }}>
                <button className="btn-secondary" style={{ 
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Home size={20} />
                  Go Home
                </button>
              </Link>
            </div>

            {/* Additional Info */}
            <div style={{ 
              marginTop: '2rem',
              padding: '1.5rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h4 style={{ color: '#EC4899', marginBottom: '1rem' }}>What&apos;s Next?</h4>
              <ul style={{ 
                textAlign: 'left', 
                color: '#ccc',
                lineHeight: '1.6',
                margin: 0,
                paddingLeft: '1.5rem'
              }}>
                <li>Your track is now live and discoverable by the SoundBridge community</li>
                <li>Share your track on social media to reach more listeners</li>
                <li>Engage with your audience through comments and likes</li>
                <li>Upload more tracks to build your presence</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </main>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
