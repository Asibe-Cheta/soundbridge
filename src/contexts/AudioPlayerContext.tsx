'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AudioTrack } from '../lib/types/audio';

interface AudioPlayerContextType {
  // State
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  playTrack: (track: AudioTrack) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  clearError: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}

interface AudioPlayerProviderProps {
  children: ReactNode;
}

export function AudioPlayerProvider({ children }: AudioPlayerProviderProps) {
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
      
      // Set up event listeners
      const audio = audioRef.current;
      
      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
        setIsLoading(false);
        setError(null);
      };
      
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };
      
      const handleEnded = async () => {
        setIsPlaying(false);
        setCurrentTime(0);
        
        // Update play count when track completes
        if (currentTrack?.id) {
          try {
            const response = await fetch('/api/audio/update-play-count', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                trackId: currentTrack.id
              }),
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log('✅ Play count updated:', result.playCount);
              
              // Dispatch custom event to notify components of play count update
              const event = new CustomEvent('playCountUpdated', {
                detail: {
                  trackId: currentTrack.id,
                  newPlayCount: result.playCount
                }
              });
              window.dispatchEvent(event);
            } else {
              console.error('❌ Failed to update play count');
            }
          } catch (error) {
            console.error('❌ Error updating play count:', error);
          }
        }
      };
      
      const handleError = (event: Event) => {
        const audio = event.target as HTMLAudioElement;
        let errorMessage = 'Failed to load audio file';
        
        if (audio.error) {
          switch (audio.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMessage = 'Audio loading was aborted';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error while loading audio';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage = 'Audio format not supported';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Audio source not supported or invalid URL';
              break;
            default:
              errorMessage = `Audio error: ${audio.error.message || 'Unknown error'}`;
          }
        }
        
        console.error('Audio error:', audio.error, errorMessage);
        setError(errorMessage);
        setIsLoading(false);
        setIsPlaying(false);
      };
      
      const handlePlay = () => {
        setIsPlaying(true);
        setError(null);
      };
      
      const handlePause = () => {
        setIsPlaying(false);
      };
      
      const handleLoadStart = () => {
        setIsLoading(true);
        setError(null);
      };
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('loadstart', handleLoadStart);
      
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('loadstart', handleLoadStart);
      };
    }
  }, []);

  const playTrack = useCallback(async (track: AudioTrack) => {
    console.log('🎵 playTrack called with:', track);
    
    if (!audioRef.current) {
      console.log('🎵 No audio ref, returning');
      return;
    }
    
    // Validate track URL
    if (!track.url || track.url.trim() === '') {
      console.error('🎵 Invalid track URL:', track.url);
      setError('Invalid audio URL');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // If it's the same track, just resume
      if (currentTrack?.id === track.id) {
        console.log('🎵 Same track, toggling play/pause');
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          await audioRef.current.play();
        }
        return;
      }
      
      // Load new track
      console.log('🎵 Loading new track:', track.title);
      console.log('🎵 Audio URL:', track.url);
      setCurrentTrack(track);
      audioRef.current.src = track.url;
      audioRef.current.currentTime = 0;
      
      await audioRef.current.play();
      console.log('🎵 Track started playing');
    } catch (err) {
      console.error('Error playing track:', err);
      setError('Failed to play track');
      setIsLoading(false);
    }
  }, [currentTrack?.id, isPlaying]);

  const pause = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const resume = useCallback(async () => {
    if (audioRef.current && !isPlaying && currentTrack) {
      try {
        await audioRef.current.play();
      } catch (err) {
        console.error('Error resuming track:', err);
        setError('Failed to resume track');
      }
    }
  }, [isPlaying, currentTrack]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolumeState(newVolume);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AudioPlayerContextType = {
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
    clearError,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}
