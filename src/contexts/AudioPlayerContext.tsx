import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

// Audio track interface
interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  url: string;
  artwork?: string;
  album?: string;
  genre?: string;
}

interface AudioPlayerContextType {
  // Current track and playback state
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  duration: number;
  position: number;
  
  // Playback controls
  play: (track: AudioTrack) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  
  // Volume and audio settings
  volume: number;
  setVolume: (volume: number) => Promise<void>;
  isMuted: boolean;
  toggleMute: () => Promise<void>;
  
  // Playlist controls
  isShuffled: boolean;
  isRepeat: boolean;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  
  // Queue management
  queue: AudioTrack[];
  currentIndex: number;
  addToQueue: (track: AudioTrack) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  setQueue: (tracks: AudioTrack[], startIndex?: number) => void;
  
  // Playback rate
  playbackRate: number;
  setPlaybackRate: (rate: number) => Promise<void>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

interface AudioPlayerProviderProps {
  children: ReactNode;
}

export function AudioPlayerProvider({ children }: AudioPlayerProviderProps) {
  // Audio instance and refs
  const soundRef = useRef<Audio.Sound | null>(null);
  const positionUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Playback state
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  
  // Audio settings
  const [volume, setVolumeState] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1.0);
  
  // Playlist state
  const [isShuffled, setIsShuffled] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [queue, setQueueState] = useState<AudioTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Initialize audio session
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error('Failed to initialize audio session:', error);
      }
    };

    initializeAudio();

    // Cleanup on unmount
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (positionUpdateTimer.current) {
        clearInterval(positionUpdateTimer.current);
      }
    };
  }, []);

  // Position tracking
  const startPositionTracking = () => {
    if (positionUpdateTimer.current) {
      clearInterval(positionUpdateTimer.current);
    }
    
    positionUpdateTimer.current = setInterval(async () => {
      if (soundRef.current && isPlaying) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            setPosition(status.positionMillis || 0);
            
            // Auto-advance to next track when current finishes
            if (status.didJustFinish) {
              await playNext();
            }
          }
        } catch (error) {
          console.error('Error getting playback status:', error);
        }
      }
    }, 500); // Update every 500ms
  };

  const stopPositionTracking = () => {
    if (positionUpdateTimer.current) {
      clearInterval(positionUpdateTimer.current);
      positionUpdateTimer.current = null;
    }
  };

  // Load and play a track
  const play = async (track: AudioTrack): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Stop current track if playing
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Create new sound instance
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        {
          shouldPlay: true,
          volume: isMuted ? 0 : volume,
          rate: playbackRate,
        },
        (status) => {
          if (status.isLoaded) {
            setDuration(status.durationMillis || 0);
            setPosition(status.positionMillis || 0);
            setIsPlaying(status.isPlaying || false);
            setIsPaused(!status.isPlaying && status.positionMillis > 0);
          }
        }
      );

      soundRef.current = sound;
      setCurrentTrack(track);
      setIsPlaying(true);
      setIsPaused(false);
      setPosition(0);
      
      startPositionTracking();
      
      console.log('🎵 Now playing:', track.title, 'by', track.artist);
    } catch (error) {
      console.error('Error playing track:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pause = async (): Promise<void> => {
    try {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        setIsPaused(true);
        stopPositionTracking();
        console.log('⏸️ Playback paused');
      }
    } catch (error) {
      console.error('Error pausing playback:', error);
    }
  };

  const resume = async (): Promise<void> => {
    try {
      if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        setIsPaused(false);
        startPositionTracking();
        console.log('▶️ Playback resumed');
      }
    } catch (error) {
      console.error('Error resuming playback:', error);
    }
  };

  const stop = async (): Promise<void> => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        setIsPlaying(false);
        setIsPaused(false);
        setPosition(0);
        stopPositionTracking();
        console.log('⏹️ Playback stopped');
      }
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  };

  const seekTo = async (positionMs: number): Promise<void> => {
    try {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(positionMs);
        setPosition(positionMs);
        console.log('⏩ Seeked to:', positionMs / 1000, 'seconds');
      }
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const setVolume = async (newVolume: number): Promise<void> => {
    try {
      const clampedVolume = Math.max(0, Math.min(1, newVolume));
      setVolumeState(clampedVolume);
      
      if (soundRef.current && !isMuted) {
        await soundRef.current.setVolumeAsync(clampedVolume);
      }
      
      console.log('🔊 Volume set to:', Math.round(clampedVolume * 100) + '%');
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  };

  const toggleMute = async (): Promise<void> => {
    try {
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      
      if (soundRef.current) {
        await soundRef.current.setVolumeAsync(newMutedState ? 0 : volume);
      }
      
      console.log(newMutedState ? '🔇 Audio muted' : '🔊 Audio unmuted');
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const setPlaybackRate = async (rate: number): Promise<void> => {
    try {
      const clampedRate = Math.max(0.5, Math.min(2.0, rate));
      setPlaybackRateState(clampedRate);
      
      if (soundRef.current) {
        await soundRef.current.setRateAsync(clampedRate, true);
      }
      
      console.log('⚡ Playback rate set to:', clampedRate + 'x');
    } catch (error) {
      console.error('Error setting playback rate:', error);
    }
  };

  // Playlist controls
  const toggleShuffle = () => {
    setIsShuffled(!isShuffled);
    console.log('🔀 Shuffle:', !isShuffled ? 'on' : 'off');
  };

  const toggleRepeat = () => {
    setIsRepeat(!isRepeat);
    console.log('🔁 Repeat:', !isRepeat ? 'on' : 'off');
  };

  const getNextIndex = (): number => {
    if (queue.length === 0) return 0;
    
    if (isShuffled) {
      // Generate random index that's different from current
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * queue.length);
      } while (nextIndex === currentIndex && queue.length > 1);
      return nextIndex;
    } else {
      // Sequential playback
      return (currentIndex + 1) % queue.length;
    }
  };

  const getPreviousIndex = (): number => {
    if (queue.length === 0) return 0;
    
    if (isShuffled) {
      // For shuffle, just go to a random track
      let prevIndex;
      do {
        prevIndex = Math.floor(Math.random() * queue.length);
      } while (prevIndex === currentIndex && queue.length > 1);
      return prevIndex;
    } else {
      // Sequential playback
      return currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
    }
  };

  const playNext = async (): Promise<void> => {
    if (queue.length === 0) return;
    
    const nextIndex = getNextIndex();
    const nextTrack = queue[nextIndex];
    
    if (nextTrack) {
      setCurrentIndex(nextIndex);
      await play(nextTrack);
      console.log('⏭️ Playing next track:', nextTrack.title);
    }
  };

  const playPrevious = async (): Promise<void> => {
    if (queue.length === 0) return;
    
    const prevIndex = getPreviousIndex();
    const prevTrack = queue[prevIndex];
    
    if (prevTrack) {
      setCurrentIndex(prevIndex);
      await play(prevTrack);
      console.log('⏮️ Playing previous track:', prevTrack.title);
    }
  };

  // Queue management
  const addToQueue = (track: AudioTrack) => {
    setQueueState(prev => [...prev, track]);
    console.log('➕ Added to queue:', track.title);
  };

  const removeFromQueue = (trackId: string) => {
    setQueueState(prev => {
      const newQueue = prev.filter(track => track.id !== trackId);
      
      // Adjust current index if necessary
      const removedIndex = prev.findIndex(track => track.id === trackId);
      if (removedIndex !== -1 && removedIndex <= currentIndex) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
      
      return newQueue;
    });
    console.log('➖ Removed from queue:', trackId);
  };

  const clearQueue = () => {
    setQueueState([]);
    setCurrentIndex(0);
    console.log('🗑️ Queue cleared');
  };

  const setQueue = (tracks: AudioTrack[], startIndex: number = 0) => {
    setQueueState(tracks);
    setCurrentIndex(startIndex);
    console.log('📋 Queue set with', tracks.length, 'tracks, starting at index', startIndex);
  };

  const value: AudioPlayerContextType = {
    // Current track and state
    currentTrack,
    isPlaying,
    isPaused,
    isLoading,
    duration,
    position,
    
    // Playback controls
    play,
    pause,
    resume,
    stop,
    seekTo,
    
    // Audio settings
    volume,
    setVolume,
    isMuted,
    toggleMute,
    playbackRate,
    setPlaybackRate,
    
    // Playlist controls
    isShuffled,
    isRepeat,
    toggleShuffle,
    toggleRepeat,
    playNext,
    playPrevious,
    
    // Queue management
    queue,
    currentIndex,
    addToQueue,
    removeFromQueue,
    clearQueue,
    setQueue,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer(): AudioPlayerContextType {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}