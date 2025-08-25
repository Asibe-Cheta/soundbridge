export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  artwork: string;
  url: string;
  liked: boolean;
  // Enhanced metadata
  genre?: string;
  bpm?: number;
  key?: string;
  tags?: string[];
  releaseDate?: string;
  isrc?: string;
  // Audio analysis data
  waveform?: number[];
  spectralData?: number[];
  loudness?: number;
  energy?: number;
  danceability?: number;
  valence?: number;
  // Social data
  playCount?: number;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  // Copyright info
  copyrightStatus?: 'clear' | 'pending' | 'flagged' | 'blocked';
  copyrightScore?: number;
}

export interface AudioAnalysis {
  waveform: number[];
  spectralData: number[];
  loudness: number;
  energy: number;
  danceability: number;
  valence: number;
  bpm: number;
  key: string;
  mode: 'major' | 'minor';
  timeSignature: number;
}

export interface EqualizerSettings {
  enabled: boolean;
  presets: {
    [key: string]: number[];
  };
  custom: number[];
  preamp: number;
}

export interface AudioEffects {
  reverb: {
    enabled: boolean;
    level: number;
    decay: number;
    preDelay: number;
  };
  echo: {
    enabled: boolean;
    level: number;
    delay: number;
    feedback: number;
  };
  compression: {
    enabled: boolean;
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
  };
  distortion: {
    enabled: boolean;
    level: number;
    drive: number;
  };
}

export interface PlaybackSettings {
  crossfade: number; // seconds
  gapless: boolean;
  normalization: boolean;
  fadeIn: number; // seconds
  fadeOut: number; // seconds
  speed: number; // 0.5 to 2.0
  pitch: number; // -12 to +12 semitones
}

export interface QueueItem {
  track: AudioTrack;
  addedAt: Date;
  addedBy?: string;
  source?: 'playlist' | 'album' | 'search' | 'recommendation';
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  artwork?: string;
  tracks: AudioTrack[];
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  totalDuration: number;
  trackCount: number;
}

export interface AudioPlayerState {
  currentTrack: AudioTrack | null;
  queue: QueueItem[];
  history: AudioTrack[];
  isPlaying: boolean;
  isPaused: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffled: boolean;
  repeatMode: 'none' | 'one' | 'all';
  playbackRate: number;
  pitch: number;
  equalizer: EqualizerSettings;
  effects: AudioEffects;
  settings: PlaybackSettings;
  // Advanced features
  isFullscreen: boolean;
  showWaveform: boolean;
  showSpectrum: boolean;
  showLyrics: boolean;
  crossfadeEnabled: boolean;
  normalizationEnabled: boolean;
}

export interface AudioPlayerActions {
  // Basic controls
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  skipNext: () => void;
  skipPrevious: () => void;
  togglePlayPause: () => void;
  
  // Volume controls
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  
  // Queue management
  addToQueue: (track: AudioTrack, position?: number) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  
  // Playback modes
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setRepeatMode: (mode: 'none' | 'one' | 'all') => void;
  
  // Advanced controls
  setPlaybackRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  toggleFullscreen: () => void;
  
  // Equalizer
  setEqualizerPreset: (preset: string) => void;
  setEqualizerBand: (band: number, value: number) => void;
  toggleEqualizer: () => void;
  
  // Effects
  toggleReverb: () => void;
  setReverbLevel: (level: number) => void;
  toggleEcho: () => void;
  setEchoLevel: (level: number) => void;
  
  // Settings
  toggleCrossfade: () => void;
  setCrossfade: (seconds: number) => void;
  toggleNormalization: () => void;
  
  // Social features
  toggleLike: () => void;
  share: () => void;
  addToPlaylist: (playlistId: string) => void;
  
  // Analysis
  toggleWaveform: () => void;
  toggleSpectrum: () => void;
  toggleLyrics: () => void;
}

export interface AudioVisualization {
  type: 'waveform' | 'spectrum' | 'bars' | 'circles';
  data: number[];
  colors: string[];
  animation: boolean;
  sensitivity: number;
}

export interface LyricsLine {
  time: number;
  text: string;
  translation?: string;
}

export interface Lyrics {
  trackId: string;
  language: string;
  lines: LyricsLine[];
  hasTranslation: boolean;
  translationLanguage?: string;
}

export interface AudioPlayerConfig {
  // UI Configuration
  showMiniPlayer: boolean;
  showFullscreenButton: boolean;
  showEqualizer: boolean;
  showEffects: boolean;
  showLyrics: boolean;
  showWaveform: boolean;
  showSpectrum: boolean;
  
  // Behavior Configuration
  autoPlay: boolean;
  rememberVolume: boolean;
  rememberPosition: boolean;
  crossfadeEnabled: boolean;
  normalizationEnabled: boolean;
  
  // Performance Configuration
  preloadAmount: number;
  bufferSize: number;
  maxQueueSize: number;
  
  // Social Configuration
  enableSharing: boolean;
  enableLikes: boolean;
  enableComments: boolean;
  
  // Analytics Configuration
  trackPlayCount: boolean;
  trackSkipCount: boolean;
  trackCompletionRate: boolean;
}

export interface AudioPlayerEvent {
  type: 'play' | 'pause' | 'stop' | 'seek' | 'volume' | 'trackChange' | 'queueChange' | 'error';
  timestamp: Date;
  data?: any;
}

export interface AudioPlayerAnalytics {
  totalPlayTime: number;
  tracksPlayed: number;
  playlistsCreated: number;
  favoritesAdded: number;
  sharesMade: number;
  averageSessionLength: number;
  mostPlayedGenres: string[];
  mostPlayedArtists: string[];
  listeningHistory: AudioPlayerEvent[];
}
