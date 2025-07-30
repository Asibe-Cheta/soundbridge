'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

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

interface AudioPlayerProps {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffled: boolean;
  repeatMode: 'none' | 'one' | 'all';
  onPlayPause: () => void;
  onSkipNext: () => void;
  onSkipPrevious: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: () => void;
  onAddToPlaylist: () => void;
  onShare: () => void;
  onQueueReorder: (fromIndex: number, toIndex: number) => void;
  onRemoveFromQueue: (index: number) => void;
  className?: string;
}

export function AudioPlayer({
  currentTrack,
  queue,
  isPlaying,
  currentTime,
  duration,
  volume,
  isShuffled,
  repeatMode,
  onPlayPause,
  onSkipNext,
  onSkipPrevious,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onAddToPlaylist,
  onShare,
  onQueueReorder,
  onRemoveFromQueue,
  className = ''
}: AudioPlayerProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    const handleLoadedMetadata = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setError('Failed to load audio file');
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
    };
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const togglePlayPause = () => {
    onPlayPause();
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progress = progressRef.current;
    if (!progress) return;

    const rect = progress.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressWidth = rect.width;
    const clickPercent = clickX / progressWidth;
    const newTime = clickPercent * duration;

    onSeek(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    onVolumeChange(isMuted ? volume : 0);
  };

  if (error) {
    return (
      <div className={`audio-player error ${className}`}>
        <div style={{ color: '#EF4444', textAlign: 'center', padding: '1rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>⚠️ Audio Error</div>
          <div style={{ fontSize: '0.9rem' }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!currentTrack) {
    return (
      <div className={`audio-player ${className}`}>
        <div style={{ textAlign: 'center', padding: '1rem', color: '#999' }}>
          No track selected
        </div>
      </div>
    );
  }

  return (
    <div className={`audio-player ${className}`}>
      <audio ref={audioRef} src={currentTrack.url} preload="metadata" />

      {/* Cover Art */}
      <div style={{
        width: '60px',
        height: '60px',
        borderRadius: '8px',
        overflow: 'hidden',
        marginRight: '1rem',
        flexShrink: 0
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem'
        }}>
          {currentTrack.artwork}
        </div>
      </div>

      {/* Track Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
          {currentTrack.title}
        </div>
        <div style={{ fontSize: '0.9rem', color: '#999' }}>
          {currentTrack.artist}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          disabled={isLoading}
          style={{
            background: 'linear-gradient(45deg, #DC2626, #EC4899)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? (
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid transparent',
              borderTop: '2px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          ) : isPlaying ? (
            <Pause size={16} />
          ) : (
            <Play size={16} />
          )}
        </button>

        {/* Progress Bar */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#999', marginBottom: '0.25rem' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              height: '8px',
              cursor: 'pointer',
              overflow: 'hidden'
            }}
          >
            <div style={{
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              height: '100%',
              width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              transition: 'width 0.1s ease'
            }} />
          </div>
        </div>

        {/* Volume Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={toggleMute}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            style={{
              width: '60px',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '2px',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 