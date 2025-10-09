'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, 
  Heart, Share2, List, Settings, Maximize2, Minimize2, Type
} from 'lucide-react';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext';
import { useSocial } from '../../hooks/useSocial';
import { useAuth } from '../../contexts/AuthContext';
import { cn, formatTime } from '../../lib/utils';
import ShareModal from '../social/ShareModal';
import { SimpleLyricsPanel } from './SimpleLyricsPanel';

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
  const [showLyrics, setShowLyrics] = useState(false);
  const [showLyricsPanel, setShowLyricsPanel] = useState(false);
  const [showInlineLyrics, setShowInlineLyrics] = useState(false);

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

  // Don't render if no track is playing
  if (!currentTrack) return null;

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
              gap: showInlineLyrics ? '2rem' : '3rem',
              zIndex: 1,
              maxWidth: '1400px',
              width: '100%',
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              {/* Left Section - Album Art and Track Info */}
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '2rem',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                flex: showInlineLyrics ? '0 0 auto' : '1'
              }}>
                {/* Album Art */}
                <motion.div
                  animate={{
                    width: showInlineLyrics ? 200 : 400,
                    height: showInlineLyrics ? 200 : 400,
                  }}
                  transition={{
                    duration: 0.5,
                    ease: 'easeInOut'
                  }}
                  style={{
                    flexShrink: 0,
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '100%',
                    height: '100%',
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
                        fontSize: showInlineLyrics ? '2rem' : '4rem'
                      }}>
                        🎵
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Track Info and Controls */}
                <motion.div
                  animate={{
                    opacity: 1,
                    x: 0
                  }}
                  initial={{
                    opacity: 0,
                    x: showInlineLyrics ? -50 : 0
                  }}
                  transition={{
                    duration: 0.5,
                    ease: 'easeInOut'
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    minWidth: showInlineLyrics ? '300px' : '500px',
                    maxWidth: showInlineLyrics ? '300px' : '500px'
                  }}
                >
                {/* Track Info */}
                <motion.div 
                  animate={{
                    marginBottom: showInlineLyrics ? '1rem' : '2rem'
                  }}
                  transition={{
                    duration: 0.5,
                    ease: 'easeInOut'
                  }}
                >
                  <motion.h1 
                    animate={{
                      fontSize: showInlineLyrics ? '2rem' : '3rem'
                    }}
                    transition={{
                      duration: 0.5,
                      ease: 'easeInOut'
                    }}
                    style={{
                      fontWeight: '700',
                      marginBottom: '0.5rem',
                      color: 'white'
                    }}
                  >
                    {currentTrack.title}
                  </motion.h1>
                  <motion.p 
                    animate={{
                      fontSize: showInlineLyrics ? '1.2rem' : '1.5rem'
                    }}
                    transition={{
                      duration: 0.5,
                      ease: 'easeInOut'
                    }}
                    style={{
                      color: '#ccc',
                      marginBottom: '0.5rem'
                    }}
                  >
                    {currentTrack.artist}
                  </motion.p>
                  {currentTrack.album && (
                    <p style={{
                      fontSize: '1rem',
                      color: '#999'
                    }}>
                      {currentTrack.album}
                    </p>
                  )}
                </motion.div>

                {/* Progress Bar */}
                <motion.div 
                  animate={{
                    marginBottom: showInlineLyrics ? '1rem' : '2rem'
                  }}
                  transition={{
                    duration: 0.5,
                    ease: 'easeInOut'
                  }}
                  style={{
                    width: '100%'
                  }}
                >
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

                  {/* Lyrics Toggle Button */}
                  <button
                    onClick={() => {
                      console.log('🎵 Expanded lyrics button clicked!', {
                        showLyricsPanel,
                        currentTrack: currentTrack?.title,
                        hasLyrics: !!currentTrack?.lyrics,
                        lyrics: currentTrack?.lyrics
                      });
                      if (isExpanded) {
                        setShowInlineLyrics(!showInlineLyrics);
                      } else {
                        setShowLyricsPanel(!showLyricsPanel);
                      }
                    }}
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
                      color: (isExpanded ? showInlineLyrics : showLyrics) ? '#EC4899' : 'white',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Type size={20} />
                  </button>
                </div>
              </motion.div>
              </div>

              {/* Lyrics Panel - Right Side */}
              {showInlineLyrics && currentTrack?.lyrics && (
                <motion.div
                  initial={{ opacity: 0, x: 50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 50, scale: 0.9 }}
                  transition={{
                    duration: 0.5,
                    ease: 'easeInOut'
                  }}
                  style={{
                    flex: '1',
                    maxWidth: '500px',
                    height: '600px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '2rem',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  {/* Lyrics Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.5rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Type size={20} color="#EC4899" />
                      <h3 style={{
                        color: 'white',
                        fontSize: '1.2rem',
                        fontWeight: '600',
                        margin: 0
                      }}>
                        Lyrics
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowInlineLyrics(false)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Lyrics Content */}
                  <div style={{
                    flex: 1,
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <motion.div
                      style={{
                        height: '100%',
                        overflow: 'auto',
                        paddingRight: '0.5rem'
                      }}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                    >
                      {currentTrack.lyrics.split('\n').map((line, index) => (
                        <motion.p
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ 
                            delay: 0.3 + (index * 0.05),
                            duration: 0.4
                          }}
                          style={{
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: '1.1rem',
                            lineHeight: '1.6',
                            marginBottom: '0.8rem',
                            textAlign: 'left',
                            fontWeight: '400'
                          }}
                        >
                          {line}
                        </motion.p>
                      ))}
                    </motion.div>
                  </div>

                  {/* Lyrics Footer */}
                  <div style={{
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.9rem',
                    color: 'rgba(255, 255, 255, 0.6)'
                  }}>
                    <span>Language: {currentTrack.lyricsLanguage || 'English'}</span>
                    <span>{currentTrack.lyrics.split('\n').length} lines</span>
                  </div>
                </motion.div>
              )}
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

              {/* Lyrics Toggle Button */}
              <button
                onClick={() => {
                  console.log('🎵 Expanded lyrics button clicked!', {
                    showLyricsPanel,
                    currentTrack: currentTrack?.title,
                    hasLyrics: !!currentTrack?.lyrics,
                    lyrics: currentTrack?.lyrics
                  });
                  if (isExpanded) {
                    setShowInlineLyrics(!showInlineLyrics);
                  } else {
                    setShowLyricsPanel(!showLyricsPanel);
                  }
                }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: showLyrics ? '#EC4899' : '#9CA3AF', 
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = showLyrics ? '#EC4899' : 'white';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = showLyrics ? '#EC4899' : '#9CA3AF';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Type size={18} />
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

      {/* Lyrics Panel */}
      {showLyricsPanel && currentTrack && (
        currentTrack.lyrics ? (
          <SimpleLyricsPanel
            lyrics={currentTrack.lyrics}
            currentTime={currentTime}
            onClose={() => setShowLyricsPanel(false)}
          />
        ) : (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-lg p-8 max-w-md mx-4">
              <h3 className="text-white text-lg font-semibold mb-4">No Lyrics Available</h3>
              <p className="text-gray-300 mb-6">This track doesn't have lyrics available.</p>
              <button
                onClick={() => setShowLyricsPanel(false)}
                className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )
      )}
      </motion.div>
    </div>
  );
}
