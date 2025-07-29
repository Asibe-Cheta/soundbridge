'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AudioPlayer } from '../../../src/components/ui/AudioPlayer';
import { createBrowserClient } from '../../../src/lib/supabase';
import { 
  Music, 
  Upload, 
  Play, 
  Clock, 
  User,
  Calendar,
  Tag
} from 'lucide-react';

interface Track {
  id: string;
  title: string;
  description?: string;
  creator_id: string;
  file_url: string;
  cover_art_url?: string;
  duration: number;
  genre?: string;
  tags?: string[];
  is_public: boolean;
  created_at: string;
  creator?: {
    username: string;
    display_name: string;
  };
}

export default function UploadTestPage() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    if (user) {
      fetchTracks();
    }
  }, [user]);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('No active session');
        return;
      }

      const response = await fetch('/api/upload', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tracks');
      }

      const result = await response.json();
      setTracks(result.tracks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tracks');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!user) {
    return (
      <div className="main-container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '1rem' }}>Authentication Required</h2>
          <p style={{ color: '#999', marginBottom: '2rem' }}>
            You need to be logged in to view your uploaded tracks.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="logo">
          🌉 SoundBridge
        </div>
        <nav className="nav">
          <a href="/">For You</a>
          <a href="#">Discover</a>
          <a href="#">Events</a>
          <a href="#">Creators</a>
        </nav>
        <input type="search" className="search-bar" placeholder="Search creators, events, podcasts..." />
        <div className="auth-buttons">
          <button className="btn-secondary">Login</button>
          <button className="btn-primary">Sign Up</button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-container">
        <div className="section-header">
          <h1 className="section-title">Your Uploaded Tracks</h1>
          <p style={{ color: '#ccc', marginTop: '0.5rem' }}>
            Test and manage your uploaded audio tracks
          </p>
        </div>

        {/* Upload Link */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Upload size={24} style={{ color: '#EC4899' }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Upload New Track</h3>
              <p style={{ color: '#999', margin: 0 }}>
                Upload your latest music, podcast, or audio content
              </p>
            </div>
            <a href="/upload" style={{ textDecoration: 'none' }}>
              <button className="btn-primary">Upload Track</button>
            </a>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="card" style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)',
            marginBottom: '2rem'
          }}>
            <div style={{ color: '#EF4444' }}>
              Error: {error}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid rgba(255, 255, 255, 0.1)',
              borderTop: '4px solid #EC4899',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <p>Loading your tracks...</p>
          </div>
        )}

        {/* Tracks List */}
        {!loading && tracks.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <Music size={48} style={{ color: '#999', marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>No Tracks Yet</h3>
            <p style={{ color: '#999', marginBottom: '2rem' }}>
              You haven't uploaded any tracks yet. Start sharing your music!
            </p>
            <a href="/upload" style={{ textDecoration: 'none' }}>
              <button className="btn-primary">Upload Your First Track</button>
            </a>
          </div>
        )}

        {/* Tracks Grid */}
        {!loading && tracks.length > 0 && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {tracks.map((track) => (
              <div key={track.id} className="card">
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  {/* Cover Art */}
                  <div style={{ 
                    width: '120px', 
                    height: '120px', 
                    borderRadius: '12px', 
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '2rem'
                  }}>
                    {track.cover_art_url ? (
                      <img 
                        src={track.cover_art_url} 
                        alt={track.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      '🎵'
                    )}
                  </div>

                  {/* Track Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>
                        {track.title}
                      </h3>
                      {track.description && (
                        <p style={{ color: '#999', margin: '0 0 1rem 0' }}>
                          {track.description}
                        </p>
                      )}
                      
                      {/* Track Metadata */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.9rem', color: '#666' }}>
                        {track.genre && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Tag size={14} />
                            <span>{track.genre}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={14} />
                          <span>{formatDuration(track.duration)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={14} />
                          <span>{formatDate(track.created_at)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <User size={14} />
                          <span>{track.creator?.display_name || 'Unknown Artist'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Audio Player */}
                    <AudioPlayer
                      src={track.file_url}
                      title={track.title}
                      artist={track.creator?.display_name}
                      coverArt={track.cover_art_url}
                      className="track-player"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          .track-player {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 1rem;
            margin-top: 1rem;
          }
        `}</style>
      </main>
    </>
  );
} 