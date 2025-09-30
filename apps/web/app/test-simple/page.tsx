'use client';

import React from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAudioPlayer } from '@/src/contexts/AudioPlayerContext';
import { useSocial } from '@/src/hooks/useSocial';
import { usePersonalizedFeed } from '@/src/hooks/usePersonalizedFeed';

export default function TestSimplePage() {
  const { user, loading, error: authError } = useAuth();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();
  const { toggleLike, isLiked } = useSocial();
  const { data: personalizedFeed, hasPersonalizedData } = usePersonalizedFeed();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
        color: 'white',
        padding: '2rem'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
        color: 'white',
        padding: '2rem'
      }}>
        <div>
          <h1 style={{ color: '#DC2626', marginBottom: '1rem' }}>Authentication Error</h1>
          <p>{authError}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
      color: 'white',
      padding: '2rem'
    }}>
      <h1 style={{ color: '#DC2626', marginBottom: '2rem' }}>Simple Test Page</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#EC4899', marginBottom: '1rem' }}>Authentication Status</h2>
        <pre style={{
          background: '#2d1b3d',
          padding: '1rem',
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '14px'
        }}>
          {JSON.stringify({
            user: user ? { id: user.id, email: user.email } : null,
            loading,
            authError
          }, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#EC4899', marginBottom: '1rem' }}>Audio Player Status</h2>
        <pre style={{
          background: '#2d1b3d',
          padding: '1rem',
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '14px'
        }}>
          {JSON.stringify({
            currentTrack: currentTrack ? { id: currentTrack.id, title: currentTrack.title } : null,
            isPlaying
          }, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#EC4899', marginBottom: '1rem' }}>Personalized Feed Status</h2>
        <pre style={{
          background: '#2d1b3d',
          padding: '1rem',
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '14px'
        }}>
          {JSON.stringify({
            hasPersonalizedData,
            data: personalizedFeed ? {
              music: personalizedFeed.music?.length || 0,
              creators: personalizedFeed.creators?.length || 0,
              events: personalizedFeed.events?.length || 0,
              podcasts: personalizedFeed.podcasts?.length || 0
            } : null
          }, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#EC4899', marginBottom: '1rem' }}>Social Hook Status</h2>
        <pre style={{
          background: '#2d1b3d',
          padding: '1rem',
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '14px'
        }}>
          {JSON.stringify({
            toggleLike: typeof toggleLike,
            isLiked: typeof isLiked
          }, null, 2)}
        </pre>
      </div>

      <button 
        onClick={() => window.location.reload()}
        style={{
          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
          color: 'white',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '12px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '600'
        }}
      >
        Refresh Test
      </button>
    </div>
  );
}
