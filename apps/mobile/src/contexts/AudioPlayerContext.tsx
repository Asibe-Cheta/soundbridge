import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AudioTrack } from '@soundbridge/types';

interface AudioPlayerContextType {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  isPaused: boolean;
  duration: number;
  position: number;
  play: (track: AudioTrack) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seekTo: (position: number) => void;
  setVolume: (volume: number) => void;
  volume: number;
  isShuffled: boolean;
  isRepeat: boolean;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  playNext: () => void;
  playPrevious: () => void;
  queue: AudioTrack[];
  addToQueue: (track: AudioTrack) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

interface AudioPlayerProviderProps {
  children: ReactNode;
}

export function AudioPlayerProvider({ children }: AudioPlayerProviderProps) {
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [queue, setQueue] = useState<AudioTrack[]>([]);

  const play = (track: AudioTrack) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setIsPaused(false);
    setPosition(0);
    // TODO: Implement actual audio playback
    console.log('Playing track:', track.title);
  };

  const pause = () => {
    setIsPlaying(false);
    setIsPaused(true);
    // TODO: Pause audio playback
    console.log('Paused playback');
  };

  const resume = () => {
    setIsPlaying(true);
    setIsPaused(false);
    // TODO: Resume audio playback
    console.log('Resumed playback');
  };

  const stop = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setPosition(0);
    // TODO: Stop audio playback
    console.log('Stopped playback');
  };

  const seekTo = (newPosition: number) => {
    setPosition(newPosition);
    // TODO: Seek audio to position
    console.log('Seeked to:', newPosition);
  };

  const setVolume = (newVolume: number) => {
    setVolumeState(Math.max(0, Math.min(1, newVolume)));
    // TODO: Set audio volume
    console.log('Volume set to:', newVolume);
  };

  const toggleShuffle = () => {
    setIsShuffled(!isShuffled);
    console.log('Shuffle toggled:', !isShuffled);
  };

  const toggleRepeat = () => {
    setIsRepeat(!isRepeat);
    console.log('Repeat toggled:', !isRepeat);
  };

  const playNext = () => {
    if (queue.length === 0) return;
    
    const currentIndex = queue.findIndex(track => track.id === currentTrack?.id);
    let nextIndex: number;
    
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = (currentIndex + 1) % queue.length;
    }
    
    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      play(nextTrack);
    }
  };

  const playPrevious = () => {
    if (queue.length === 0) return;
    
    const currentIndex = queue.findIndex(track => track.id === currentTrack?.id);
    let prevIndex: number;
    
    if (isShuffled) {
      prevIndex = Math.floor(Math.random() * queue.length);
    } else {
      prevIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
    }
    
    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      play(prevTrack);
    }
  };

  const addToQueue = (track: AudioTrack) => {
    setQueue(prev => [...prev, track]);
    console.log('Added to queue:', track.title);
  };

  const removeFromQueue = (trackId: string) => {
    setQueue(prev => prev.filter(track => track.id !== trackId));
    console.log('Removed from queue:', trackId);
  };

  const clearQueue = () => {
    setQueue([]);
    console.log('Queue cleared');
  };

  const value: AudioPlayerContextType = {
    currentTrack,
    isPlaying,
    isPaused,
    duration,
    position,
    play,
    pause,
    resume,
    stop,
    seekTo,
    setVolume,
    volume,
    isShuffled,
    isRepeat,
    toggleShuffle,
    toggleRepeat,
    playNext,
    playPrevious,
    queue,
    addToQueue,
    removeFromQueue,
    clearQueue,
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
