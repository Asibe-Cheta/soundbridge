'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, 
  Heart, Share2, List, Settings, Maximize2, Minimize2
} from 'lucide-react';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext';
import { useSocial } from '../../hooks/useSocial';
import { useAuth } from '../../contexts/AuthContext';
import { cn, formatTime } from '../../lib/utils';
import ShareModal from '../social/ShareModal';

export function GlobalAudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isLoading,
    error,
    playTrack,
    pause,
    resume,
    stop,
    seek,
    setVolume,
    clearError
  } = useAudioPlayer();

  const { toggleLike, isLiked, createShare } = useSocial();
  const { user } = useAuth();
  const [showVolume, setShowVolume] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isTrackLiked, setIsTrackLiked] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if current track is liked
  useEffect(() => {
    const checkIfLiked = async () => {
      if (!user || !currentTrack) {
        setIsTrackLiked(false);
        return;
      }

      try {
        const result = await isLiked(currentTrack.id, 'track');
        setIsTrackLiked(result.data);
      } catch (error) {
        console.error('Error checking if track is liked:', error);
        setIsTrackLiked(false);
      }
    };

    checkIfLiked();
  }, [user, currentTrack, isLiked]);

  // Don't render if no track is playing
  if (!currentTrack) {
    return null;
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressWidth = rect.width;
    const clickPercent = clickX / progressWidth;
    const newTime = clickPercent * duration;
    seek(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolume(volume || 0.7);
      setIsMuted(false);
    } else {
      setVolume(0);
      setIsMuted(true);
    }
  };

  const handleLikeTrack = async () => {
    if (!user || !currentTrack) {
      alert('Please sign in to like tracks');
      return;
    }

    try {
      const result = await toggleLike({
        content_id: currentTrack.id,
        content_type: 'track'
      });

      if (result.error) {
        console.error('Error toggling like:', result.error);
        return;
      }

      // Update local state
      setIsTrackLiked(!isTrackLiked);

      // Update like count in database
      const updateResponse = await fetch('/api/audio/update-likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackId: currentTrack.id,
          action: isTrackLiked ? 'unlike' : 'like'
        }),
      });

      if (!updateResponse.ok) {
        console.error('Failed to update like count in database');
      }

    } catch (error) {
      console.error('Error handling like:', error);
    }
  };

  const handleShareTrack = async () => {
    if (!user || !currentTrack) {
      alert('Please sign in to share tracks');
      return;
    }

    setShareModalOpen(true);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Format time to MM:SS format
  const formatTimeDisplay = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ 
          y: 0, 
          opacity: 1,
          height: isExpanded ? '100vh' : '90px'
        }}
        transition={{ 
          duration: 0.3,
          ease: 'easeInOut'
        }}
        style={{ 
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          backgroundColor: isExpanded 
            ? 'rgba(15, 15, 35, 0.98)'
            : 'rgba(26, 26, 26, 0.98)',
          backdropFilter: 'blur(20px)',
          borderTop: isExpanded ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
          maxHeight: isExpanded ? '100vh' : '90px',
          overflow: isExpanded ? 'auto' : 'hidden',
          display: 'flex',
          alignItems: isExpanded ? 'center' : 'center',
          justifyContent: isExpanded ? 'center' : 'flex-start',
          padding: isExpanded ? '2rem' : '0 24px'
        }}
      >
        {isExpanded ? (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            padding: '2rem',
            position: 'relative'
          }}>
            {/* Background Blur Effect */}
            {currentTrack.artwork && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `url(${currentTrack.artwork})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(40px)',
                opacity: 0.3,
                zIndex: 0
              }} />
            )}

            {/* Close Button */}
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                position: 'absolute',
                top: '2rem',
                right: '2rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                color: 'white',
                zIndex: 10
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              <Minimize2 size={20} />
            </button>

            {/* Main Content */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3rem',
              zIndex: 1,
              maxWidth: '1200px',
              width: '100%'
            }}>
              {/* Album Art */}
              <div style={{
                flexShrink: 0,
                position: 'relative'
              }}>
                <div style={{
                  width: '400px',
                  height: '400px',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                  position: 'relative'
                }}>
                  {currentTrack.artwork ? (
                    <img
                      src={currentTrack.artwork}
                      alt={currentTrack.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '4rem'
                    }}>
                      🎵
                    </div>
                  )}
                </div>
              </div>

              {/* Track Info and Controls */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                textAlign: 'left',
                maxWidth: '500px'
              }}>
                {/* Track Info */}
                <div style={{ marginBottom: '2rem' }}>
                  <h1 style={{
                    fontSize: '3rem',
                    fontWeight: '700',
                    marginBottom: '0.5rem',
                    color: 'white'
                  }}>
                    {currentTrack.title}
                  </h1>
                  <p style={{
                    fontSize: '1.5rem',
                    color: '#ccc',
                    marginBottom: '0.5rem'
                  }}>
                    {currentTrack.artist}
                  </p>
                  {currentTrack.album && (
                    <p style={{
                      fontSize: '1rem',
                      color: '#999'
                    }}>
                      {currentTrack.album}
                    </p>
                  )}
                </div>

                {/* Progress Bar */}
                <div style={{
                  width: '100%',
                  marginBottom: '2rem'
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    height: '6px',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{
                      background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                      height: '100%',
                      width: `${(currentTime / duration) * 100}%`,
                      transition: 'width 0.1s ease'
                    }} />
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.9rem',
                    color: '#ccc'
                  }}>
                    <span>{formatTimeDisplay(currentTime)}</span>
                    <span>{formatTimeDisplay(duration)}</span>
                  </div>
                </div>

                {/* Main Controls */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                  marginBottom: '2rem'
                }}>
                  <button
                    onClick={handlePlayPause}
                    style={{
                      background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '70px',
                      height: '70px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 8px 25px rgba(220, 38, 38, 0.4)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 12px 35px rgba(220, 38, 38, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
                    }}
                  >
                    {isPlaying ? <Pause size={28} /> : <Play size={28} />}
                  </button>
                </div>

                {/* Secondary Controls */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                  width: '100%'
                }}>
                  <button
                    onClick={toggleMute}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>

                  <div style={{
                    flex: 1,
                    maxWidth: '200px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      style={{
                        flex: 1,
                        height: '4px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '2px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  <button
                    onClick={handleLikeTrack}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: isTrackLiked ? '#EC4899' : 'white',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Heart size={20} style={{ fill: isTrackLiked ? '#EC4899' : 'none' }} />
                  </button>

                  <button
                    onClick={handleShareTrack}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Share2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ 
            width: '100%', 
            maxWidth: '1400px', 
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'white',
            fontSize: '14px'
          }}>
          {/* Left Section - Track Info & Cover Art */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1', minWidth: 0 }}>
            {/* Cover Art */}
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '8px',
              overflow: 'hidden',
              flexShrink: 0,
              background: 'linear-gradient(135deg, #DC2626, #EC4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {currentTrack.artwork ? (
                <img 
                  src={currentTrack.artwork} 
                  alt={currentTrack.title}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }}
                />
              ) : (
                <span style={{ fontSize: '24px', color: 'white' }}>🎵</span>
              )}
            </div>
            
            {/* Track Info */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ 
                fontWeight: '600', 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                color: 'white',
                fontSize: '14px',
                marginBottom: '4px'
              }}>
                {currentTrack.title}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#9CA3AF',
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis'
              }}>
                {currentTrack.artist}
              </div>
            </div>
          </div>

          {/* Center Section - Playback Controls & Progress */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '12px',
            flex: '1',
            maxWidth: '500px'
          }}>
            {/* Playback Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => {/* TODO: Previous track */}}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#9CA3AF', 
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#9CA3AF';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <SkipBack size={20} />
              </button>

              <button
                onClick={handlePlayPause}
                disabled={isLoading}
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  background: 'linear-gradient(135deg, #DC2626, #EC4899)', 
                  borderRadius: '50%', 
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '16px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(220, 38, 38, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
                }}
              >
                {isLoading ? (
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '50%',
                    borderTopColor: 'white',
                    animation: 'spin 1s linear infinite'
                  }} />
                ) : isPlaying ? (
                  <Pause size={20} />
                ) : (
                  <Play size={20} style={{ marginLeft: '2px' }} />
                )}
              </button>

              <button
                onClick={() => {/* TODO: Next track */}}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#9CA3AF', 
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#9CA3AF';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <SkipForward size={20} />
              </button>
            </div>

            {/* Progress Bar */}
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ 
                fontSize: '11px', 
                color: '#9CA3AF', 
                width: '35px', 
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {formatTimeDisplay(currentTime)}
              </span>
              
              <div 
                style={{ 
                  flex: 1, 
                  height: '4px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: '2px', 
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={handleSeek}
              >
                <div 
                  style={{ 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #DC2626, #EC4899)', 
                    borderRadius: '2px',
                    width: `${progressPercent}%`,
                    transition: 'width 0.1s ease',
                    position: 'relative'
                  }}
                />
                <div 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${progressPercent}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '12px',
                    height: '12px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                    opacity: progressPercent > 0 ? 1 : 0,
                    transition: 'opacity 0.2s ease'
                  }}
                />
              </div>
              
              <span style={{ 
                fontSize: '11px', 
                color: '#9CA3AF', 
                width: '35px',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {formatTimeDisplay(duration)}
              </span>
            </div>
          </div>

          {/* Right Section - Volume & Additional Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
            {/* Volume Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={toggleMute}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#9CA3AF', 
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#9CA3AF';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              
              <div style={{ position: 'relative' }}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  style={{
                    width: '80px',
                    height: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '2px',
                    outline: 'none',
                    cursor: 'pointer',
                    WebkitAppearance: 'none'
                  }}
                  onMouseEnter={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                />
                                 <style dangerouslySetInnerHTML={{
                   __html: `
                     input[type="range"]::-webkit-slider-thumb {
                       appearance: none;
                       width: 12px;
                       height: 12px;
                       border-radius: 50%;
                       background: linear-gradient(135deg, #DC2626, #EC4899);
                       cursor: pointer;
                       box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                     }
                     
                     input[type="range"]::-moz-range-thumb {
                       width: 12px;
                       height: 12px;
                       border-radius: 50%;
                       background: linear-gradient(135deg, #DC2626, #EC4899);
                       cursor: pointer;
                       border: none;
                       box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                     }
                   `
                 }} />
              </div>
            </div>

            {/* Additional Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleLikeTrack}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: isTrackLiked ? '#EC4899' : '#9CA3AF', 
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#EC4899';
                  e.currentTarget.style.backgroundColor = 'rgba(236, 72, 153, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isTrackLiked ? '#EC4899' : '#9CA3AF';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Heart 
                  size={18} 
                  style={{ 
                    fill: isTrackLiked ? '#EC4899' : 'none'
                  }} 
                />
              </button>

              <button
                onClick={handleShareTrack}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#9CA3AF', 
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#9CA3AF';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Share2 size={18} />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#9CA3AF', 
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#9CA3AF';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title={isExpanded ? "Minimize Player" : "Expand Player"}
              >
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
          </div>
          </div>
        )}
        
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `
        }} />
      </motion.div>

      {/* Share Modal */}
      {shareModalOpen && currentTrack && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          content={{
            id: currentTrack.id,
            title: currentTrack.title,
            type: 'track',
            creator: {
              name: currentTrack.artist || 'Unknown Artist',
              username: 'unknown'
            },
            coverArt: currentTrack.artwork,
            url: currentTrack.url
          }}
        />
      )}
      </motion.div>
    </div>
  );
}
