'use client';

import React, { useState, useEffect } from 'react';
import { AudioPlayer } from '../../src/components/ui/AudioPlayer';

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  artwork: string;
  url: string;
  liked: boolean;
}

export default function PlayerDemoPage() {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');

  // Mock data
  const mockTracks: Track[] = [
    {
      id: '1',
      title: 'Lagos Nights',
      artist: 'Kwame Asante',
      album: 'Afrobeats Vibes',
      duration: 225, // 3:45
      artwork: '🎵',
      url: '/audio/lagos-nights.mp3',
      liked: true
    },
    {
      id: '2',
      title: 'Gospel Fusion',
      artist: 'Sarah Johnson',
      album: 'Spiritual Journey',
      duration: 252, // 4:12
      artwork: '🎵',
      url: '/audio/gospel-fusion.mp3',
      liked: false
    },
    {
      id: '3',
      title: 'UK Drill Mix',
      artist: 'Tommy B',
      album: 'Underground Sounds',
      duration: 208, // 3:28
      artwork: '🎵',
      url: '/audio/uk-drill-mix.mp3',
      liked: true
    },
    {
      id: '4',
      title: 'Afro Fusion',
      artist: 'Michael Okafor',
      album: 'Modern African',
      duration: 235, // 3:55
      artwork: '🎵',
      url: '/audio/afro-fusion.mp3',
      liked: false
    },
    {
      id: '5',
      title: 'Praise & Worship',
      artist: 'Grace Community',
      album: 'Worship Collection',
      duration: 270, // 4:30
      artwork: '🎵',
      url: '/audio/praise-worship.mp3',
      liked: true
    },
    {
      id: '6',
      title: 'Lagos Anthem',
      artist: 'Wizkid Jr',
      album: 'Nigerian Vibes',
      duration: 195, // 3:15
      artwork: '🎵',
      url: '/audio/lagos-anthem.mp3',
      liked: false
    }
  ];

  // Initialize with first track
  useEffect(() => {
    if (mockTracks.length > 0) {
      setCurrentTrack(mockTracks[0]);
      setQueue(mockTracks.slice(1));
      setDuration(mockTracks[0].duration);
    }
  }, []);

  // Simulate audio progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentTrack) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          if (newTime >= duration) {
            // Auto advance to next track
            handleSkipNext();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, duration]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSkipNext = () => {
    if (queue.length > 0) {
      const nextTrack = queue[0];
      setCurrentTrack(nextTrack);
      setQueue(prev => [...prev.slice(1), currentTrack!]);
      setCurrentTime(0);
      setDuration(nextTrack.duration);
    }
  };

  const handleSkipPrevious = () => {
    // In a real implementation, this would go to previous track or restart current
    setCurrentTime(0);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, duration)));
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
  };

  const handleToggleShuffle = () => {
    setIsShuffled(!isShuffled);
    if (!isShuffled) {
      // Shuffle the queue
      const shuffled = [...queue].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
    } else {
      // Restore original order
      const originalOrder = mockTracks.slice(1);
      setQueue(originalOrder);
    }
  };

  const handleToggleRepeat = () => {
    if (repeatMode === 'none') {
      setRepeatMode('all');
    } else if (repeatMode === 'all') {
      setRepeatMode('one');
    } else {
      setRepeatMode('none');
    }
  };

  const handleToggleLike = () => {
    if (currentTrack) {
      setCurrentTrack({ ...currentTrack, liked: !currentTrack.liked });
    }
  };

  const handleAddToPlaylist = () => {
    alert('Added to playlist!');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: currentTrack?.title,
        text: `Check out "${currentTrack?.title}" by ${currentTrack?.artist}`,
        url: window.location.href
      });
    } else {
      alert('Share feature not supported in this browser');
    }
  };

  const handleQueueReorder = (fromIndex: number, toIndex: number) => {
    const newQueue = [...queue];
    const [movedItem] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, movedItem);
    setQueue(newQueue);
  };

  const handleRemoveFromQueue = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
      paddingBottom: '80px' // Space for mini player
    }}>
      {/* Demo Header */}
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: 'white'
      }}>
        <h1 style={{ 
          fontSize: '3rem', 
          margin: '0 0 1rem 0',
          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Audio Player Demo
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          color: '#999',
          margin: '0 0 2rem 0'
        }}>
          Experience the full-screen audio player with playlist management
        </p>
        
        {/* Demo Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '2rem'
        }}>
          <button
            onClick={() => setCurrentTrack(mockTracks[0])}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Load Track 1
          </button>
          <button
            onClick={() => setCurrentTrack(mockTracks[1])}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            Load Track 2
          </button>
          <button
            onClick={() => setQueue(mockTracks.slice(2))}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            Load Queue
          </button>
        </div>

        {/* Current Track Info */}
        {currentTrack && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '15px',
            padding: '2rem',
            maxWidth: '600px',
            margin: '0 auto',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 1rem 0' }}>Current Track</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.5rem',
                fontWeight: '600'
              }}>
                {currentTrack.artwork}
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: '600', fontSize: '1.1rem' }}>
                  {currentTrack.title}
                </div>
                <div style={{ color: '#999', fontSize: '0.9rem' }}>
                  {currentTrack.artist} • {currentTrack.album}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features List */}
        <div style={{
          marginTop: '3rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          maxWidth: '1200px',
          margin: '3rem auto 0'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '15px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ color: '#EC4899', margin: '0 0 1rem 0' }}>🎵 Mini Player</h3>
            <p style={{ color: '#ccc', margin: 0, fontSize: '0.9rem' }}>
              Always visible at the bottom of the screen with essential controls and track info
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '15px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ color: '#EC4899', margin: '0 0 1rem 0' }}>🖥️ Full-Screen Player</h3>
            <p style={{ color: '#ccc', margin: 0, fontSize: '0.9rem' }}>
              Expandable interface with detailed track info, waveform visualization, and advanced controls
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '15px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ color: '#EC4899', margin: '0 0 1rem 0' }}>📋 Queue Management</h3>
            <p style={{ color: '#ccc', margin: 0, fontSize: '0.9rem' }}>
              Drag-to-reorder playlist with visual feedback and easy track removal
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '15px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ color: '#EC4899', margin: '0 0 1rem 0' }}>🎛️ Audio Controls</h3>
            <p style={{ color: '#ccc', margin: 0, fontSize: '0.9rem' }}>
              Play/pause, skip, repeat, shuffle, volume control with seek functionality
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '15px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ color: '#EC4899', margin: '0 0 1rem 0' }}>📊 Progress Tracking</h3>
            <p style={{ color: '#ccc', margin: 0, fontSize: '0.9rem' }}>
              Real-time progress bar with click-to-seek and time display
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '15px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ color: '#EC4899', margin: '0 0 1rem 0' }}>💝 Social Features</h3>
            <p style={{ color: '#ccc', margin: 0, fontSize: '0.9rem' }}>
              Like, share, and add to playlist buttons with smooth animations
            </p>
          </div>
        </div>
      </div>

      {/* Audio Player */}
      <AudioPlayer
        currentTrack={currentTrack}
        queue={queue}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isShuffled={isShuffled}
        repeatMode={repeatMode}
        onPlayPause={handlePlayPause}
        onSkipNext={handleSkipNext}
        onSkipPrevious={handleSkipPrevious}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleLike={handleToggleLike}
        onAddToPlaylist={handleAddToPlaylist}
        onShare={handleShare}
        onQueueReorder={handleQueueReorder}
        onRemoveFromQueue={handleRemoveFromQueue}
      />
    </div>
  );
} 