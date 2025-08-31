'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Footer } from '../../../../src/components/layout/Footer';
import { CheckCircle, Mic, Headphones, Share2, Users, TrendingUp, ArrowLeft } from 'lucide-react';

function PodcastUploadSuccessContent() {
  const searchParams = useSearchParams();
  const [title, setTitle] = useState('Your Podcast');

  useEffect(() => {
    const podcastTitle = searchParams.get('title') || 'Your Podcast';
    setTitle(podcastTitle);
  }, [searchParams]);

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="logo">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Mic size={20} color="white" />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>
                SoundBridge
              </span>
            </div>
          </Link>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <input
            type="search"
            placeholder="Search creators, events, podcasts..."
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              color: 'white',
              fontSize: '0.9rem',
              width: '300px'
            }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="main-container">
        {/* Back to Home */}
        <div style={{ padding: '2rem 2rem 0' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem'
            }}>
              <ArrowLeft size={16} />
              Back to Home
            </button>
          </Link>
        </div>

        {/* Success Content */}
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          {/* Success Message */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'rgba(34, 197, 94, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <CheckCircle size={40} color="#22C55E" />
            </div>
            
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '1rem'
            }}>
              Podcast Published Successfully!
            </h1>
            
            <p style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.5rem' }}>
              "{title}" is now live on SoundBridge
            </p>
            
            <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Your podcast episode is now available for listeners to discover and enjoy
            </p>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(59, 130, 246, 0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <Headphones size={24} color="#3B82F6" />
              </div>
              <h3 style={{ color: 'white', fontWeight: '600', marginBottom: '0.5rem' }}>Ready to Listen</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                Your episode is now available for streaming
              </p>
            </div>
            
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(147, 51, 234, 0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <Share2 size={24} color="#9333EA" />
              </div>
              <h3 style={{ color: 'white', fontWeight: '600', marginBottom: '0.5rem' }}>Share & Promote</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                Share your episode with your audience
              </p>
            </div>
            
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(34, 197, 94, 0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <TrendingUp size={24} color="#22C55E" />
              </div>
              <h3 style={{ color: 'white', fontWeight: '600', marginBottom: '0.5rem' }}>Track Performance</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                Monitor plays, likes, and engagement
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '1.5rem' }}>
              What's Next?
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#EC4899',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '0.25rem'
                }}>
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>1</span>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: 'white', fontWeight: '600', marginBottom: '0.5rem' }}>Share Your Episode</h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.75rem' }}>
                    Promote your podcast episode on social media and share the link with your audience
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button style={{
                      background: '#1DA1F2',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      Share on Twitter
                    </button>
                    <button style={{
                      background: '#1877F2',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      Share on Facebook
                    </button>
                    <button style={{
                      background: '#E4405F',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      Share on Instagram
                    </button>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#EC4899',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '0.25rem'
                }}>
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>2</span>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: 'white', fontWeight: '600', marginBottom: '0.5rem' }}>Engage with Listeners</h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.75rem' }}>
                    Respond to comments, answer questions, and build a community around your podcast
                  </p>
                  <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                    <button style={{
                      background: '#EC4899',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      Go to Dashboard
                    </button>
                  </Link>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#EC4899',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '0.25rem'
                }}>
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>3</span>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: 'white', fontWeight: '600', marginBottom: '0.5rem' }}>Plan Your Next Episode</h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.75rem' }}>
                    Keep the momentum going by planning and recording your next podcast episode
                  </p>
                  <Link href="/podcast/upload" style={{ textDecoration: 'none' }}>
                    <button style={{
                      background: 'linear-gradient(45deg, #EC4899, #DC2626)',
                      color: 'white',
                      padding: '0.5rem 1.5rem',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      Upload Next Episode
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '0.75rem 2rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}>
                  Back to Home
                </button>
              </Link>
              
              <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: '#EC4899',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 2rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}>
                  View Dashboard
                </button>
              </Link>
              
              <Link href="/podcast/upload" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'linear-gradient(45deg, #EC4899, #DC2626)',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 2rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}>
                  Upload Another Episode
                </button>
              </Link>
            </div>
          </div>

          {/* Tips */}
          <div className="card">
            <h3 style={{ 
              fontSize: '1.25rem', 
              fontWeight: 'bold', 
              color: 'white', 
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Users size={20} color="#EC4899" />
              Pro Tips for Podcast Success
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ width: '8px', height: '8px', background: '#EC4899', borderRadius: '50%', marginTop: '0.5rem', flexShrink: 0 }}></div>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                    Consistency is key - upload episodes regularly
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ width: '8px', height: '8px', background: '#EC4899', borderRadius: '50%', marginTop: '0.5rem', flexShrink: 0 }}></div>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                    Engage with your audience through comments and social media
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ width: '8px', height: '8px', background: '#EC4899', borderRadius: '50%', marginTop: '0.5rem', flexShrink: 0 }}></div>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                    Use relevant tags to help listeners discover your content
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ width: '8px', height: '8px', background: '#EC4899', borderRadius: '50%', marginTop: '0.5rem', flexShrink: 0 }}></div>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                    Collaborate with other creators to expand your reach
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ width: '8px', height: '8px', background: '#EC4899', borderRadius: '50%', marginTop: '0.5rem', flexShrink: 0 }}></div>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                    Analyze your performance data to understand what works
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ width: '8px', height: '8px', background: '#EC4899', borderRadius: '50%', marginTop: '0.5rem', flexShrink: 0 }}></div>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                    Keep your content authentic and true to your voice
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </main>
    </>
  );
}

export default function PodcastUploadSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>Loading...</div>
      </div>
    }>
      <PodcastUploadSuccessContent />
    </Suspense>
  );
}
