'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  Shuffle, 
  Volume2, 
  VolumeX,
  Heart,
  Share2,
  Plus,
  List,
  X,
  Maximize2,
  Minimize2,
  GripVertical,
  Clock
} from 'lucide-react';

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
  onRemoveFromQueue
}: AudioPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    onSeek(newTime);
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeRef.current) return;
    const rect = volumeRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newVolume = Math.max(0, Math.min(1, percentage));
    onVolumeChange(newVolume);
  };

  const toggleMute = () => {
    if (isMuted) {
      onVolumeChange(volume);
    } else {
      onVolumeChange(0);
    }
    setIsMuted(!isMuted);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverItem(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem !== null && draggedItem !== index) {
      onQueueReorder(draggedItem, index);
    }
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  if (!currentTrack) return null;

  return (
    <>
      {/* Mini Player */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '0.75rem 1rem',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        {/* Track Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(45deg, #DC2626, #EC4899)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.2rem',
            fontWeight: '600'
          }}>
            {currentTrack.artwork || '🎵'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ 
              fontWeight: '600', 
              color: 'white',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {currentTrack.title}
            </div>
            <div style={{ 
              color: '#999',
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {currentTrack.artist}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={onSkipPrevious}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '50%',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#EC4899'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
          >
            <SkipBack size={20} />
          </button>
          
          <button
            onClick={onPlayPause}
            style={{
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '0.75rem',
              borderRadius: '50%',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          
          <button
            onClick={onSkipNext}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '50%',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#EC4899'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
          >
            <SkipForward size={20} />
          </button>
        </div>

        {/* Volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '120px' }}>
          <button
            onClick={toggleMute}
            style={{
              background: 'none',
              border: 'none',
              color: isMuted ? '#EC4899' : '#999',
              cursor: 'pointer',
              padding: '0.25rem',
              transition: 'all 0.3s ease'
            }}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <div
            ref={volumeRef}
            onClick={handleVolumeClick}
            style={{
              flex: 1,
              height: '4px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '2px',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <div style={{
              width: `${isMuted ? 0 : volume * 100}%`,
              height: '100%',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              borderRadius: '2px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Expand Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'none',
            border: 'none',
            color: '#999',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '50%',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#EC4899'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
        >
          {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
      </div>

      {/* Full-Screen Player */}
      {isExpanded && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(30px)',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem'
        }}>
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <h2 style={{ color: 'white', margin: 0 }}>Now Playing</h2>
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#999',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '50%',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#EC4899'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
            >
              <X size={24} />
            </button>
          </div>

          {/* Main Content */}
          <div style={{ display: 'flex', flex: 1, gap: '2rem' }}>
            {/* Left Side - Track Info and Controls */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Album Art */}
              <div style={{
                width: '100%',
                maxWidth: '400px',
                aspectRatio: '1',
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '4rem',
                fontWeight: '600',
                margin: '0 auto'
              }}>
                {currentTrack.artwork || '🎵'}
              </div>

              {/* Track Info */}
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '2rem' }}>
                  {currentTrack.title}
                </h1>
                <p style={{ color: '#999', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
                  {currentTrack.artist}
                </p>
                <p style={{ color: '#666', margin: 0, fontSize: '1rem' }}>
                  {currentTrack.album}
                </p>
              </div>

              {/* Waveform Visualization */}
              <div style={{
                height: '60px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}>
                {Array.from({ length: 50 }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      width: '3px',
                      height: `${Math.random() * 40 + 10}px`,
                      background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                      borderRadius: '2px',
                      animation: isPlaying ? 'waveform 1s ease-in-out infinite' : 'none',
                      animationDelay: `${i * 0.02}s`
                    }}
                  />
                ))}
              </div>

              {/* Progress Bar */}
              <div style={{ marginTop: '1rem' }}>
                <div
                  ref={progressRef}
                  onClick={handleProgressClick}
                  style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    position: 'relative',
                    marginBottom: '0.5rem'
                  }}
                >
                  <div style={{
                    width: `${(currentTime / duration) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                    borderRadius: '3px',
                    transition: 'width 0.1s ease'
                  }} />
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  color: '#999',
                  fontSize: '0.9rem'
                }}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Main Controls */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '1rem',
                marginTop: '1rem'
              }}>
                <button
                  onClick={onToggleShuffle}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isShuffled ? '#EC4899' : '#999',
                    cursor: 'pointer',
                    padding: '0.75rem',
                    borderRadius: '50%',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => !isShuffled && (e.currentTarget.style.color = '#EC4899')}
                  onMouseLeave={(e) => !isShuffled && (e.currentTarget.style.color = '#999')}
                >
                  <Shuffle size={24} />
                </button>
                
                <button
                  onClick={onSkipPrevious}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    padding: '0.75rem',
                    borderRadius: '50%',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#EC4899'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
                >
                  <SkipBack size={28} />
                </button>
                
                <button
                  onClick={onPlayPause}
                  style={{
                    background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '1.5rem',
                    borderRadius: '50%',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                </button>
                
                <button
                  onClick={onSkipNext}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    padding: '0.75rem',
                    borderRadius: '50%',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#EC4899'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
                >
                  <SkipForward size={28} />
                </button>
                
                <button
                  onClick={onToggleRepeat}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: repeatMode !== 'none' ? '#EC4899' : '#999',
                    cursor: 'pointer',
                    padding: '0.75rem',
                    borderRadius: '50%',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => repeatMode === 'none' && (e.currentTarget.style.color = '#EC4899')}
                  onMouseLeave={(e) => repeatMode === 'none' && (e.currentTarget.style.color = '#999')}
                >
                  <Repeat size={24} />
                </button>
              </div>

              {/* Social Controls */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '1rem',
                marginTop: '1rem'
              }}>
                <button
                  onClick={onToggleLike}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: currentTrack.liked ? '#EC4899' : '#999',
                    cursor: 'pointer',
                    padding: '0.75rem',
                    borderRadius: '50%',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => !currentTrack.liked && (e.currentTarget.style.color = '#EC4899')}
                  onMouseLeave={(e) => !currentTrack.liked && (e.currentTarget.style.color = '#999')}
                >
                  <Heart size={24} fill={currentTrack.liked ? '#EC4899' : 'none'} />
                </button>
                
                <button
                  onClick={onAddToPlaylist}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    padding: '0.75rem',
                    borderRadius: '50%',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#EC4899'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
                >
                  <Plus size={24} />
                </button>
                
                <button
                  onClick={onShare}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    padding: '0.75rem',
                    borderRadius: '50%',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#EC4899'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
                >
                  <Share2 size={24} />
                </button>
              </div>
            </div>

            {/* Right Side - Queue */}
            <div style={{ 
              width: '400px', 
              background: 'rgba(255, 255, 255, 0.05)', 
              borderRadius: '15px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <h3 style={{ color: 'white', margin: 0 }}>Up Next</h3>
                <button
                  onClick={() => setShowQueue(!showQueue)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '50%',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#EC4899'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
                >
                  <List size={20} />
                </button>
              </div>

              <div style={{ flex: 1, overflow: 'auto' }}>
                {queue.map((track, index) => (
                  <div
                    key={track.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      background: draggedItem === index ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
                      border: dragOverItem === index ? '2px dashed #EC4899' : 'none',
                      cursor: 'grab',
                      transition: 'all 0.3s ease',
                      marginBottom: '0.5rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <GripVertical size={16} style={{ color: '#666', cursor: 'grab' }} />
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      {track.artwork || '🎵'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: 'white',
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {track.title}
                      </div>
                      <div style={{ 
                        color: '#999',
                        fontSize: '0.8rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {track.artist}
                      </div>
                    </div>
                    <div style={{ color: '#666', fontSize: '0.8rem' }}>
                      {formatTime(track.duration)}
                    </div>
                    <button
                      onClick={() => onRemoveFromQueue(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        borderRadius: '50%',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#EC4899'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS for waveform animation */}
      <style jsx>{`
        @keyframes waveform {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.5); }
        }
      `}</style>
    </>
  );
} 