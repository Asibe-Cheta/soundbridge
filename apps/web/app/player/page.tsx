'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAudioPlayer } from '@/src/contexts/AudioPlayerContext';
import { useRouter } from 'next/navigation';
import { Maximize, Minimize, ArrowLeft, Music, User, Heart, Share2, Download, Volume2, VolumeX, Repeat, Shuffle, SkipBack, SkipForward, Play, Pause, MoreHorizontal, Clock, List } from 'lucide-react';
import Image from 'next/image';

// Dynamically import the AdvancedAudioPlayer to avoid SSR issues
const AdvancedAudioPlayer = dynamic(
  () => import('../../src/components/audio/AdvancedAudioPlayer').then(mod => ({ default: mod.AdvancedAudioPlayer })),
  { 
    ssr: false,
    loading: () => <div>Loading audio player...</div>
  }
);

export default function MusicPlayerPage() {
  const { currentTrack, isPlaying, playTrack, pause, resume, stop } = useAudioPlayer();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isShuffled, setIsShuffled] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleMinimize = () => {
    setIsExpanded(false);
  };

  const handleBack = () => {
    router.back();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleRepeat = () => {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  const toggleShuffle = () => {
    setIsShuffled(!isShuffled);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  if (!isClient) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>Loading player...</div>
      </div>
    );
  }

  if (!currentTrack) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <Music size={64} style={{ color: '#EC4899', marginBottom: '1rem', opacity: 0.5 }} />
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#EC4899' }}>No Track Playing</h1>
        <p style={{ color: '#ccc', marginBottom: '2rem', textAlign: 'center' }}>
          Start playing a track from anywhere on SoundBridge to see the full player experience.
        </p>
        <button
          onClick={handleBack}
          style={{
            background: 'linear-gradient(45deg, #DC2626, #EC4899)',
            color: 'white',
            border: 'none',
            padding: '1rem 2rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
          }}
        >
          <ArrowLeft size={20} />
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: isExpanded 
        ? 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'
        : 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      color: 'white',
      position: 'relative',
      overflow: 'hidden'
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

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: isExpanded ? '2rem' : '1rem',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isExpanded ? '2rem' : '1rem'
        }}>
          <button
            onClick={handleBack}
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
              transition: 'all 0.3s ease',
              color: 'white'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            <ArrowLeft size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setShowQueue(!showQueue)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                color: 'white'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              <List size={20} />
            </button>

            <button
              onClick={isExpanded ? handleMinimize : handleExpand}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                color: 'white'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              title={isExpanded ? 'Minimize' : 'Expand'}
            >
              {isExpanded ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>

        {/* Main Player Content */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: isExpanded ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isExpanded ? '3rem' : '2rem'
        }}>
          {/* Album Art */}
          <div style={{
            flexShrink: 0,
            position: 'relative'
          }}>
            <div style={{
              width: isExpanded ? '400px' : '300px',
              height: isExpanded ? '400px' : '300px',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              position: 'relative'
            }}>
              {currentTrack.artwork ? (
                <Image
                  src={currentTrack.artwork}
                  alt={currentTrack.title}
                  width={isExpanded ? 400 : 300}
                  height={isExpanded ? 400 : 300}
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
                  <Music size={isExpanded ? 120 : 80} />
                </div>
              )}
            </div>
          </div>

          {/* Track Info and Controls */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: isExpanded ? 'flex-start' : 'center',
            textAlign: isExpanded ? 'left' : 'center',
            maxWidth: isExpanded ? 'none' : '500px'
          }}>
            {/* Track Info */}
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{
                fontSize: isExpanded ? '3rem' : '2rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
                color: 'white'
              }}>
                {currentTrack.title}
              </h1>
              <p style={{
                fontSize: isExpanded ? '1.5rem' : '1.2rem',
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
                  width: '30%', // This would be dynamic based on current time
                  transition: 'width 0.1s ease'
                }} />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.9rem',
                color: '#ccc'
              }}>
                <span>1:23</span>
                <span>{currentTrack.duration || '3:45'}</span>
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
                onClick={toggleShuffle}
                style={{
                  background: isShuffled ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: isShuffled ? '#EC4899' : 'white',
                  transition: 'all 0.3s ease'
                }}
              >
                <Shuffle size={20} />
              </button>

              <button
                onClick={() => {/* Previous track functionality not implemented */}}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  transition: 'all 0.3s ease'
                }}
              >
                <SkipBack size={24} />
              </button>

              <button
                onClick={isPlaying ? pause : () => currentTrack && playTrack(currentTrack)}
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

              <button
                onClick={() => {/* Next track functionality not implemented */}}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  transition: 'all 0.3s ease'
                }}
              >
                <SkipForward size={24} />
              </button>

              <button
                onClick={toggleRepeat}
                style={{
                  background: repeatMode !== 'off' ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: repeatMode !== 'off' ? '#EC4899' : 'white',
                  transition: 'all 0.3s ease'
                }}
              >
                <Repeat size={20} />
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
                <Heart size={20} />
              </button>

              <button
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

              <button
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
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Queue Panel */}
        {showQueue && (
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '300px',
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#EC4899' }}>Queue</h3>
            <div style={{ color: '#ccc' }}>
              <p>No tracks in queue</p>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Audio Player (Hidden) */}
      <div style={{ display: 'none' }}>
        <AdvancedAudioPlayer />
      </div>
    </div>
  );
}
