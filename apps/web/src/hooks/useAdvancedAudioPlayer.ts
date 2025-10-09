import { useState, useEffect, useCallback, useRef } from 'react';
import audioPlayerService from '../lib/audio-player-service';
import { 
  AudioTrack, 
  AudioPlayerState, 
  AudioPlayerActions, 
  AudioVisualization,
  Lyrics,
  AudioPlayerAnalytics
} from '../lib/types/audio';

export function useAdvancedAudioPlayer() {
  const [state, setState] = useState<AudioPlayerState>(audioPlayerService.getState());
  const [visualizationData, setVisualizationData] = useState<number[]>([]);
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [analytics, setAnalytics] = useState<AudioPlayerAnalytics>(audioPlayerService.getAnalytics());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const eventListeners = useRef<Map<string, Function>>(new Map());
  
  // Initialize event listeners
  useEffect(() => {
    const events = [
      'trackLoaded',
      'play',
      'pause',
      'stop',
      'timeUpdate',
      'volumeChange',
      'muteToggle',
      'queueChange',
      'shuffleToggle',
      'repeatModeChange',
      'playbackRateChange',
      'pitchChange',
      'equalizerPresetChange',
      'equalizerBandChange',
      'equalizerToggle',
      'reverbToggle',
      'reverbLevelChange',
      'audioAnalysisComplete',
      'visualizationData',
      'buffering',
      'canPlay',
      'loading',
      'error'
    ];
    
    events.forEach(event => {
      const listener = (data?: any) => {
        if (event === 'visualizationData') {
          setVisualizationData(data);
        } else if (event === 'error') {
          setError(data?.message || 'An error occurred');
        } else if (event === 'loading') {
          setIsLoading(true);
        } else if (event === 'trackLoaded' || event === 'canPlay') {
          setIsLoading(false);
        } else {
          // Update state for other events
          setState(audioPlayerService.getState());
        }
      };
      
      audioPlayerService.on(event, listener);
      eventListeners.current.set(event, listener);
    });
    
    // Initial state sync
    setState(audioPlayerService.getState());
    setAnalytics(audioPlayerService.getAnalytics());
    
    return () => {
      // Cleanup event listeners
      eventListeners.current.forEach((listener, event) => {
        audioPlayerService.off(event, listener);
      });
      eventListeners.current.clear();
    };
  }, []);
  
  // Audio loading and playback actions
  const loadTrack = useCallback(async (track: AudioTrack): Promise<void> => {
    try {
      setError(null);
      setIsLoading(true);
      await audioPlayerService.loadTrack(track);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load track');
      setIsLoading(false);
    }
  }, []);
  
  const play = useCallback((): void => {
    audioPlayerService.play();
  }, []);
  
  const pause = useCallback((): void => {
    audioPlayerService.pause();
  }, []);
  
  const stop = useCallback((): void => {
    audioPlayerService.stop();
  }, []);
  
  const seek = useCallback((time: number): void => {
    audioPlayerService.seek(time);
  }, []);
  
  const skipNext = useCallback((): void => {
    audioPlayerService.skipNext();
  }, []);
  
  const skipPrevious = useCallback((): void => {
    audioPlayerService.skipPrevious();
  }, []);
  
  const togglePlayPause = useCallback((): void => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);
  
  // Volume controls
  const setVolume = useCallback((volume: number): void => {
    audioPlayerService.setVolume(volume);
  }, []);
  
  const toggleMute = useCallback((): void => {
    audioPlayerService.toggleMute();
  }, []);
  
  // Queue management
  const addToQueue = useCallback((track: AudioTrack, position?: number): void => {
    audioPlayerService.addToQueue(track, position);
  }, []);
  
  const removeFromQueue = useCallback((index: number): void => {
    audioPlayerService.removeFromQueue(index);
  }, []);
  
  const clearQueue = useCallback((): void => {
    audioPlayerService.clearQueue();
  }, []);
  
  const reorderQueue = useCallback((fromIndex: number, toIndex: number): void => {
    audioPlayerService.reorderQueue(fromIndex, toIndex);
  }, []);
  
  // Playback modes
  const toggleShuffle = useCallback((): void => {
    audioPlayerService.toggleShuffle();
  }, []);
  
  const toggleRepeat = useCallback((): void => {
    const currentMode = state.repeatMode;
    if (currentMode === 'none') {
      audioPlayerService.setRepeatMode('all');
    } else if (currentMode === 'all') {
      audioPlayerService.setRepeatMode('one');
    } else {
      audioPlayerService.setRepeatMode('none');
    }
  }, [state.repeatMode]);
  
  const setRepeatMode = useCallback((mode: 'none' | 'one' | 'all'): void => {
    audioPlayerService.setRepeatMode(mode);
  }, []);
  
  // Advanced controls
  const setPlaybackRate = useCallback((rate: number): void => {
    audioPlayerService.setPlaybackRate(rate);
  }, []);
  
  const setPitch = useCallback((pitch: number): void => {
    audioPlayerService.setPitch(pitch);
  }, []);
  
  const toggleFullscreen = useCallback((): void => {
    setState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  }, []);
  
  // Equalizer controls
  const setEqualizerPreset = useCallback((preset: string): void => {
    audioPlayerService.setEqualizerPreset(preset);
  }, []);
  
  const setEqualizerBand = useCallback((band: number, value: number): void => {
    audioPlayerService.setEqualizerBand(band, value);
  }, []);
  
  const toggleEqualizer = useCallback((): void => {
    audioPlayerService.toggleEqualizer();
  }, []);
  
  // Effects controls
  const toggleReverb = useCallback((): void => {
    audioPlayerService.toggleReverb();
  }, []);
  
  const setReverbLevel = useCallback((level: number): void => {
    audioPlayerService.setReverbLevel(level);
  }, []);
  
  const toggleEcho = useCallback((): void => {
    setState(prev => ({
      ...prev,
      effects: {
        ...prev.effects,
        echo: {
          ...prev.effects.echo,
          enabled: !prev.effects.echo.enabled
        }
      }
    }));
  }, []);
  
  const setEchoLevel = useCallback((level: number): void => {
    setState(prev => ({
      ...prev,
      effects: {
        ...prev.effects,
        echo: {
          ...prev.effects.echo,
          level: Math.max(0, Math.min(1, level))
        }
      }
    }));
  }, []);
  
  const toggleCompression = useCallback((): void => {
    setState(prev => ({
      ...prev,
      effects: {
        ...prev.effects,
        compression: {
          ...prev.effects.compression,
          enabled: !prev.effects.compression.enabled
        }
      }
    }));
  }, []);
  
  const toggleDistortion = useCallback((): void => {
    setState(prev => ({
      ...prev,
      effects: {
        ...prev.effects,
        distortion: {
          ...prev.effects.distortion,
          enabled: !prev.effects.distortion.enabled
        }
      }
    }));
  }, []);
  
  // Settings controls
  const toggleCrossfade = useCallback((): void => {
    setState(prev => ({
      ...prev,
      crossfadeEnabled: !prev.crossfadeEnabled
    }));
  }, []);
  
  const setCrossfade = useCallback((seconds: number): void => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        crossfade: Math.max(0, Math.min(10, seconds))
      }
    }));
  }, []);
  
  const toggleNormalization = useCallback((): void => {
    setState(prev => ({
      ...prev,
      normalizationEnabled: !prev.normalizationEnabled
    }));
  }, []);
  
  // Social features
  const toggleLike = useCallback((): void => {
    if (state.currentTrack) {
      setState(prev => ({
        ...prev,
        currentTrack: prev.currentTrack ? {
          ...prev.currentTrack,
          liked: !prev.currentTrack.liked
        } : null
      }));
    }
  }, [state.currentTrack]);
  
  const share = useCallback((): void => {
    if (state.currentTrack && navigator.share) {
      navigator.share({
        title: state.currentTrack.title,
        text: `Check out "${state.currentTrack.title}" by ${state.currentTrack.artist}`,
        url: window.location.href
      });
    }
  }, [state.currentTrack]);
  
  const addToPlaylist = useCallback((playlistId: string): void => {
    if (state.currentTrack) {
      // This would integrate with the playlist service
      console.log(`Adding ${state.currentTrack.title} to playlist ${playlistId}`);
    }
  }, [state.currentTrack]);
  
  // Analysis controls
  const toggleWaveform = useCallback((): void => {
    setState(prev => ({
      ...prev,
      showWaveform: !prev.showWaveform
    }));
  }, []);
  
  const toggleSpectrum = useCallback((): void => {
    setState(prev => ({
      ...prev,
      showSpectrum: !prev.showSpectrum
    }));
  }, []);
  
  const toggleLyrics = useCallback((): void => {
    setState(prev => ({
      ...prev,
      showLyrics: !prev.showLyrics
    }));
  }, []);
  
  // Lyrics management
  const loadLyrics = useCallback(async (trackId: string): Promise<void> => {
    try {
      // This would fetch lyrics from an API
      const mockLyrics: Lyrics = {
        trackId,
        language: 'en',
        lines: [
          { time: 0, text: "Loading lyrics..." },
          { time: 5, text: "This is a sample lyric line" },
          { time: 10, text: "Another line of lyrics" }
        ],
        hasTranslation: false
      };
      setLyrics(mockLyrics);
    } catch (err) {
      setError('Failed to load lyrics');
    }
  }, []);
  
  // Utility functions
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  const formatDuration = useCallback((seconds: number): string => {
    return formatTime(seconds);
  }, [formatTime]);
  
  const getCurrentLyricLine = useCallback((): string => {
    if (!lyrics || !state.currentTrack) return '';
    
    // Handle simple text lyrics (stored as string)
    if (typeof lyrics === 'string') {
      // For simple text lyrics, we can't sync with time, so return the full text
      // or split by lines and return based on some logic
      const lines = lyrics.split('\n').filter(line => line.trim() !== '');
      if (lines.length === 0) return '';
      
      // Simple logic: show different lines based on current time
      const lineIndex = Math.floor(state.currentTime / 10) % lines.length;
      return lines[lineIndex] || '';
    }
    
    // Handle timestamped lyrics (legacy format)
    if (lyrics && typeof lyrics === 'object' && lyrics.lines) {
      const currentTime = state.currentTime;
      const currentLine = lyrics.lines.find(line => line.time <= currentTime);
      
      if (currentLine) {
        return currentLine.text;
      }
    }
    
    return '';
  }, [lyrics, state.currentTime, state.currentTrack]);
  
  const getVisualizationConfig = useCallback((): AudioVisualization => {
    return {
      type: state.showSpectrum ? 'spectrum' : 'waveform',
      data: visualizationData,
      colors: ['#DC2626', '#EC4899', '#8B5CF6', '#06B6D4'],
      animation: state.isPlaying,
      sensitivity: 1.0
    };
  }, [visualizationData, state.showSpectrum, state.isPlaying]);
  
  // Analytics
  const getAnalytics = useCallback((): AudioPlayerAnalytics => {
    return audioPlayerService.getAnalytics();
  }, []);
  
  const clearAnalytics = useCallback((): void => {
    // This would reset analytics
    setAnalytics(audioPlayerService.getAnalytics());
  }, []);
  
  // Error handling
  const clearError = useCallback((): void => {
    setError(null);
  }, []);
  
  // Export actions
  const actions: AudioPlayerActions = {
    // Basic controls
    play,
    pause,
    stop,
    seek,
    skipNext,
    skipPrevious,
    togglePlayPause,
    
    // Volume controls
    setVolume,
    toggleMute,
    
    // Queue management
    addToQueue,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    
    // Playback modes
    toggleShuffle,
    toggleRepeat,
    setRepeatMode,
    
    // Advanced controls
    setPlaybackRate,
    setPitch,
    toggleFullscreen,
    
    // Equalizer
    setEqualizerPreset,
    setEqualizerBand,
    toggleEqualizer,
    
    // Effects
    toggleReverb,
    setReverbLevel,
    toggleEcho,
    setEchoLevel,
    
    // Settings
    toggleCrossfade,
    setCrossfade,
    toggleNormalization,
    
    // Social features
    toggleLike,
    share,
    addToPlaylist,
    
    // Analysis
    toggleWaveform,
    toggleSpectrum,
    toggleLyrics
  };
  
  return {
    // State
    state,
    visualizationData,
    lyrics,
    analytics,
    error,
    isLoading,
    
    // Actions
    actions,
    
    // Utility functions
    formatTime,
    formatDuration,
    getCurrentLyricLine,
    getVisualizationConfig,
    getAnalytics,
    clearAnalytics,
    clearError,
    
    // Direct service access for advanced use cases
    loadTrack,
    loadLyrics
  };
}
