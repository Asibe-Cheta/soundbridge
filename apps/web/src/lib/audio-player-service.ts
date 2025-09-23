import { 
  AudioTrack, 
  AudioPlayerState, 
  AudioPlayerActions, 
  AudioAnalysis, 
  EqualizerSettings, 
  AudioEffects, 
  PlaybackSettings,
  QueueItem,
  AudioPlayerEvent,
  AudioPlayerAnalytics,
  AudioVisualization
} from './types/audio';

class AudioPlayerService {
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private equalizerNodes: BiquadFilterNode[] = [];
  private reverbNode: ConvolverNode | null = null;
  private delayNode: DelayNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private distortionNode: WaveShaperNode | null = null;
  
  private state: AudioPlayerState;
  private listeners: Map<string, Function[]> = new Map();
  private analytics: AudioPlayerAnalytics;
  private events: AudioPlayerEvent[] = [];
  
  // Audio analysis
  private analyserNode: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrame: number | null = null;
  
  // Equalizer bands (Hz)
  private readonly equalizerBands = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
  
  constructor() {
    this.state = this.getInitialState();
    this.analytics = this.getInitialAnalytics();
    this.initializeAudioContext();
  }
  
  private getInitialState(): AudioPlayerState {
    return {
      currentTrack: null,
      queue: [],
      history: [],
      isPlaying: false,
      isPaused: false,
      isBuffering: false,
      currentTime: 0,
      duration: 0,
      volume: 0.7,
      isMuted: false,
      isShuffled: false,
      repeatMode: 'none',
      playbackRate: 1.0,
      pitch: 0,
      equalizer: {
        enabled: false,
        presets: {
          'Flat': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          'Bass Boost': [6, 4, 2, 0, 0, 0, 0, 0, 0, 0],
          'Treble Boost': [0, 0, 0, 0, 0, 0, 2, 4, 6, 8],
          'Vocal Boost': [0, 0, 0, 2, 4, 6, 4, 2, 0, 0],
          'Rock': [4, 2, 0, -2, -1, 2, 4, 4, 2, 0],
          'Jazz': [2, 0, 0, 0, 2, 4, 4, 2, 0, 0],
          'Classical': [0, 0, 0, 0, 0, 0, -2, -2, -2, -2],
          'Pop': [2, 0, 0, 0, 0, 0, 0, 0, 2, 4],
          'Electronic': [4, 2, 0, 0, 0, 0, 0, 2, 4, 6]
        },
        custom: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        preamp: 0
      },
      effects: {
        reverb: { enabled: false, level: 0.3, decay: 2.0, preDelay: 0.1 },
        echo: { enabled: false, level: 0.3, delay: 0.3, feedback: 0.5 },
        compression: { enabled: false, threshold: -24, ratio: 4, attack: 0.003, release: 0.25 },
        distortion: { enabled: false, level: 0.3, drive: 0.5 }
      },
      settings: {
        crossfade: 3,
        gapless: true,
        normalization: false,
        fadeIn: 0.5,
        fadeOut: 0.5,
        speed: 1.0,
        pitch: 0
      },
      isFullscreen: false,
      showWaveform: false,
      showSpectrum: false,
      showLyrics: false,
      crossfadeEnabled: false,
      normalizationEnabled: false
    };
  }
  
  private getInitialAnalytics(): AudioPlayerAnalytics {
    return {
      totalPlayTime: 0,
      tracksPlayed: 0,
      playlistsCreated: 0,
      favoritesAdded: 0,
      sharesMade: 0,
      averageSessionLength: 0,
      mostPlayedGenres: [],
      mostPlayedArtists: [],
      listeningHistory: []
    };
  }
  
  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.setupAudioNodes();
      this.emit('audioContextReady');
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      this.emit('error', { type: 'audioContext', message: 'Failed to initialize audio context' });
    }
  }
  
  private setupAudioNodes(): void {
    if (!this.audioContext) return;
    
    // Create gain node for volume control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    
    // Create analyser for visualization
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.connect(this.gainNode);
    this.dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    
    // Create equalizer nodes
    this.equalizerNodes = this.equalizerBands.map(frequency => {
      const filter = this.audioContext!.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = frequency;
      filter.Q.value = 1;
      filter.gain.value = 0;
      return filter;
    });
    
    // Create effects nodes
    this.reverbNode = this.audioContext.createConvolver();
    this.delayNode = this.audioContext.createDelay(5.0);
    this.compressorNode = this.audioContext.createDynamicsCompressor();
    this.distortionNode = this.audioContext.createWaveShaper();
    
    // Connect equalizer chain
    this.connectEqualizerChain();
  }
  
  private connectEqualizerChain(): void {
    if (!this.analyserNode || !this.gainNode) return;
    
    let currentNode: AudioNode = this.analyserNode;
    
    // Connect through equalizer bands
    this.equalizerNodes.forEach(filter => {
      currentNode.connect(filter);
      currentNode = filter;
    });
    
    // Connect effects
    if (this.reverbNode) {
      currentNode.connect(this.reverbNode);
      currentNode = this.reverbNode;
    }
    
    if (this.delayNode) {
      currentNode.connect(this.delayNode);
      currentNode = this.delayNode;
    }
    
    if (this.compressorNode) {
      currentNode.connect(this.compressorNode);
      currentNode = this.compressorNode;
    }
    
    if (this.distortionNode) {
      currentNode.connect(this.distortionNode);
      currentNode = this.distortionNode;
    }
    
    // Final connection to gain node
    currentNode.connect(this.gainNode);
  }
  
  // Event system
  private emit(event: string, data?: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }
  
  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
  
  public off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  // Audio loading and playback
  public async loadTrack(track: AudioTrack): Promise<void> {
    try {
      this.state.isBuffering = true;
      this.emit('loading', track);
      
      // Create audio element
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';
      this.audioElement.preload = 'metadata';
      
      // Set up event listeners
      this.setupAudioElementListeners();
      
      // Load audio
      await this.loadAudioSource(track.url);
      
      // Update state
      this.state.currentTrack = track;
      this.state.duration = this.audioElement.duration || 0;
      this.state.currentTime = 0;
      this.state.isBuffering = false;
      
      // Add to history
      this.addToHistory(track);
      
      // Analyze audio if needed
      if (track.waveform || track.spectralData) {
        await this.analyzeAudio(track);
      }
      
      this.emit('trackLoaded', track);
      this.logEvent('trackChange', { trackId: track.id });
      
    } catch (error) {
      console.error('Failed to load track:', error);
      this.state.isBuffering = false;
      this.emit('error', { type: 'loadTrack', message: 'Failed to load track', error });
    }
  }
  
  private async loadAudioSource(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.audioElement) {
        reject(new Error('Audio element not initialized'));
        return;
      }
      
      this.audioElement.src = url;
      this.audioElement.load();
      
      const handleCanPlay = () => {
        this.audioElement!.removeEventListener('canplay', handleCanPlay);
        this.audioElement!.removeEventListener('error', handleError);
        resolve();
      };
      
      const handleError = (error: Event) => {
        this.audioElement!.removeEventListener('canplay', handleCanPlay);
        this.audioElement!.removeEventListener('error', handleError);
        reject(error);
      };
      
      this.audioElement.addEventListener('canplay', handleCanPlay);
      this.audioElement.addEventListener('error', handleError);
    });
  }
  
  private setupAudioElementListeners(): void {
    if (!this.audioElement) return;
    
    this.audioElement.addEventListener('timeupdate', () => {
      this.state.currentTime = this.audioElement!.currentTime;
      this.emit('timeUpdate', this.state.currentTime);
    });
    
    this.audioElement.addEventListener('ended', () => {
      this.handleTrackEnd();
    });
    
    this.audioElement.addEventListener('waiting', () => {
      this.state.isBuffering = true;
      this.emit('buffering');
    });
    
    this.audioElement.addEventListener('canplay', () => {
      this.state.isBuffering = false;
      this.emit('canPlay');
    });
    
    this.audioElement.addEventListener('play', () => {
      this.state.isPlaying = true;
      this.state.isPaused = false;
      this.emit('play');
      this.logEvent('play');
    });
    
    this.audioElement.addEventListener('pause', () => {
      this.state.isPlaying = false;
      this.state.isPaused = true;
      this.emit('pause');
      this.logEvent('pause');
    });
  }
  
  // Playback controls
  public play(): void {
    if (this.audioElement && this.state.currentTrack) {
      this.audioElement.play();
      this.startVisualization();
    }
  }
  
  public pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.stopVisualization();
    }
  }
  
  public stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.stopVisualization();
      this.emit('stop');
    }
  }
  
  public seek(time: number): void {
    if (this.audioElement) {
      this.audioElement.currentTime = Math.max(0, Math.min(time, this.state.duration));
      this.logEvent('seek', { time });
    }
  }
  
  public setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.state.isMuted ? 0 : this.state.volume;
    }
    this.emit('volumeChange', this.state.volume);
    this.logEvent('volume', { volume: this.state.volume });
  }
  
  public toggleMute(): void {
    this.state.isMuted = !this.state.isMuted;
    if (this.gainNode) {
      this.gainNode.gain.value = this.state.isMuted ? 0 : this.state.volume;
    }
    this.emit('muteToggle', this.state.isMuted);
  }
  
  // Queue management
  public addToQueue(track: AudioTrack, position?: number): void {
    const queueItem: QueueItem = {
      track,
      addedAt: new Date(),
      source: 'manual'
    };
    
    if (position !== undefined) {
      this.state.queue.splice(position, 0, queueItem);
    } else {
      this.state.queue.push(queueItem);
    }
    
    this.emit('queueChange', this.state.queue);
    this.logEvent('queueChange', { action: 'add', trackId: track.id });
  }
  
  public removeFromQueue(index: number): void {
    if (index >= 0 && index < this.state.queue.length) {
      const removed = this.state.queue.splice(index, 1)[0];
      this.emit('queueChange', this.state.queue);
      this.logEvent('queueChange', { action: 'remove', trackId: removed.track.id });
    }
  }
  
  public clearQueue(): void {
    this.state.queue = [];
    this.emit('queueChange', this.state.queue);
    this.logEvent('queueChange', { action: 'clear' });
  }
  
  public reorderQueue(fromIndex: number, toIndex: number): void {
    if (fromIndex >= 0 && fromIndex < this.state.queue.length &&
        toIndex >= 0 && toIndex < this.state.queue.length) {
      const [movedItem] = this.state.queue.splice(fromIndex, 1);
      this.state.queue.splice(toIndex, 0, movedItem);
      this.emit('queueChange', this.state.queue);
      this.logEvent('queueChange', { action: 'reorder', fromIndex, toIndex });
    }
  }
  
  // Playback modes
  public toggleShuffle(): void {
    this.state.isShuffled = !this.state.isShuffled;
    if (this.state.isShuffled) {
      this.shuffleQueue();
    }
    this.emit('shuffleToggle', this.state.isShuffled);
  }
  
  private shuffleQueue(): void {
    for (let i = this.state.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.state.queue[i], this.state.queue[j]] = [this.state.queue[j], this.state.queue[i]];
    }
  }
  
  public setRepeatMode(mode: 'none' | 'one' | 'all'): void {
    this.state.repeatMode = mode;
    this.emit('repeatModeChange', mode);
  }
  
  // Advanced controls
  public setPlaybackRate(rate: number): void {
    this.state.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    if (this.audioElement) {
      this.audioElement.playbackRate = this.state.playbackRate;
    }
    this.emit('playbackRateChange', this.state.playbackRate);
  }
  
  public setPitch(pitch: number): void {
    this.state.pitch = Math.max(-12, Math.min(12, pitch));
    // Implement pitch shifting using Web Audio API
    this.emit('pitchChange', this.state.pitch);
  }
  
  // Equalizer
  public setEqualizerPreset(preset: string): void {
    const presetValues = this.state.equalizer.presets[preset];
    if (presetValues) {
      this.state.equalizer.custom = [...presetValues];
      this.applyEqualizerSettings();
      this.emit('equalizerPresetChange', preset);
    }
  }
  
  public setEqualizerBand(band: number, value: number): void {
    if (band >= 0 && band < this.state.equalizer.custom.length) {
      this.state.equalizer.custom[band] = Math.max(-12, Math.min(12, value));
      this.applyEqualizerSettings();
      this.emit('equalizerBandChange', { band, value });
    }
  }
  
  public toggleEqualizer(): void {
    this.state.equalizer.enabled = !this.state.equalizer.enabled;
    this.applyEqualizerSettings();
    this.emit('equalizerToggle', this.state.equalizer.enabled);
  }
  
  private applyEqualizerSettings(): void {
    if (!this.state.equalizer.enabled) {
      this.equalizerNodes.forEach(node => {
        node.gain.value = 0;
      });
      return;
    }
    
    this.equalizerNodes.forEach((node, index) => {
      if (index < this.state.equalizer.custom.length) {
        node.gain.value = this.state.equalizer.custom[index];
      }
    });
  }
  
  // Effects
  public toggleReverb(): void {
    this.state.effects.reverb.enabled = !this.state.effects.reverb.enabled;
    this.applyReverbEffect();
    this.emit('reverbToggle', this.state.effects.reverb.enabled);
  }
  
  public setReverbLevel(level: number): void {
    this.state.effects.reverb.level = Math.max(0, Math.min(1, level));
    this.applyReverbEffect();
    this.emit('reverbLevelChange', this.state.effects.reverb.level);
  }
  
  private applyReverbEffect(): void {
    if (!this.reverbNode) return;
    
    if (this.state.effects.reverb.enabled) {
      // Create impulse response for reverb
      this.createReverbImpulseResponse();
    }
  }
  
  private createReverbImpulseResponse(): void {
    if (!this.audioContext || !this.reverbNode) return;
    
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * this.state.effects.reverb.decay;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    
    this.reverbNode.buffer = impulse;
  }
  
  // Audio analysis
  private async analyzeAudio(track: AudioTrack): Promise<void> {
    try {
      const analysis: AudioAnalysis = {
        waveform: [],
        spectralData: [],
        loudness: 0,
        energy: 0,
        danceability: 0,
        valence: 0,
        bpm: 120,
        key: 'C',
        mode: 'major',
        timeSignature: 4
      };
      
      // Generate waveform data
      analysis.waveform = await this.generateWaveform(track.url);
      
      // Analyze spectral data
      if (this.analyserNode && this.dataArray) {
        this.analyserNode.getByteFrequencyData(this.dataArray);
        analysis.spectralData = Array.from(this.dataArray);
      }
      
      // Calculate audio features
      analysis.loudness = this.calculateLoudness(analysis.spectralData);
      analysis.energy = this.calculateEnergy(analysis.spectralData);
      analysis.danceability = this.calculateDanceability(analysis.spectralData);
      analysis.valence = this.calculateValence(analysis.spectralData);
      
      // Update track with analysis
      track.waveform = analysis.waveform;
      track.spectralData = analysis.spectralData;
      track.loudness = analysis.loudness;
      track.energy = analysis.energy;
      track.danceability = analysis.danceability;
      track.valence = analysis.valence;
      
      this.emit('audioAnalysisComplete', analysis);
      
    } catch (error) {
      console.error('Failed to analyze audio:', error);
    }
  }
  
  private async generateWaveform(url: string): Promise<number[]> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.src = url;
      
      audio.addEventListener('canplay', () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve([]);
          return;
        }
        
        canvas.width = 1000;
        canvas.height = 100;
        
        // Create audio context for analysis
        const audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(audio);
        const analyser = audioContext.createAnalyser();
        
        source.connect(analyser);
        analyser.fftSize = 2048;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const waveform: number[] = [];
        const samples = 100; // Number of waveform points
        
        const draw = () => {
          analyser.getByteTimeDomainData(dataArray);
          
          for (let i = 0; i < samples; i++) {
            const index = Math.floor((i / samples) * bufferLength);
            const value = (dataArray[index] - 128) / 128;
            waveform.push(value);
          }
          
          if (waveform.length >= samples) {
            resolve(waveform);
          } else {
            requestAnimationFrame(draw);
          }
        };
        
        audio.play();
        draw();
        
        // Stop after a short time to get sample
        setTimeout(() => {
          audio.pause();
          audioContext.close();
        }, 1000);
      });
    });
  }
  
  private calculateLoudness(spectralData: number[]): number {
    if (!spectralData.length) return 0;
    const sum = spectralData.reduce((acc, val) => acc + val, 0);
    return sum / spectralData.length;
  }
  
  private calculateEnergy(spectralData: number[]): number {
    if (!spectralData.length) return 0;
    const sum = spectralData.reduce((acc, val) => acc + val * val, 0);
    return Math.sqrt(sum / spectralData.length);
  }
  
  private calculateDanceability(spectralData: number[]): number {
    // Simplified danceability calculation based on spectral centroid
    if (!spectralData.length) return 0;
    const centroid = spectralData.reduce((acc, val, index) => acc + val * index, 0) / spectralData.reduce((acc, val) => acc + val, 0);
    return Math.min(1, centroid / 100);
  }
  
  private calculateValence(spectralData: number[]): number {
    // Simplified valence calculation based on brightness
    if (!spectralData.length) return 0;
    const highFreq = spectralData.slice(Math.floor(spectralData.length * 0.7));
    const lowFreq = spectralData.slice(0, Math.floor(spectralData.length * 0.3));
    const highSum = highFreq.reduce((acc, val) => acc + val, 0);
    const lowSum = lowFreq.reduce((acc, val) => acc + val, 0);
    return Math.min(1, highSum / (lowSum + 1));
  }
  
  // Visualization
  private startVisualization(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    const visualize = () => {
      if (this.analyserNode && this.dataArray) {
        this.analyserNode.getByteFrequencyData(this.dataArray);
        this.emit('visualizationData', Array.from(this.dataArray));
      }
      this.animationFrame = requestAnimationFrame(visualize);
    };
    
    visualize();
  }
  
  private stopVisualization(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
  
  // Analytics
  private logEvent(type: string, data?: any): void {
    const event: AudioPlayerEvent = {
      type: type as any,
      timestamp: new Date(),
      data
    };
    
    this.events.push(event);
    this.updateAnalytics(event);
  }
  
  private updateAnalytics(event: AudioPlayerEvent): void {
    switch (event.type) {
      case 'play':
        this.analytics.totalPlayTime += 1;
        break;
      case 'trackChange':
        this.analytics.tracksPlayed++;
        if (event.data?.trackId) {
          // Update genre and artist stats
          const track = this.state.currentTrack;
          if (track?.genre) {
            this.updateMostPlayedGenres(track.genre);
          }
          if (track?.artist) {
            this.updateMostPlayedArtists(track.artist);
          }
        }
        break;
    }
  }
  
  private updateMostPlayedGenres(genre: string): void {
    // Simplified genre tracking
    if (!this.analytics.mostPlayedGenres.includes(genre)) {
      this.analytics.mostPlayedGenres.push(genre);
    }
  }
  
  private updateMostPlayedArtists(artist: string): void {
    // Simplified artist tracking
    if (!this.analytics.mostPlayedArtists.includes(artist)) {
      this.analytics.mostPlayedArtists.push(artist);
    }
  }
  
  private addToHistory(track: AudioTrack): void {
    // Remove if already exists
    this.state.history = this.state.history.filter(t => t.id !== track.id);
    // Add to beginning
    this.state.history.unshift(track);
    // Keep only last 50 tracks
    if (this.state.history.length > 50) {
      this.state.history = this.state.history.slice(0, 50);
    }
  }
  
  private handleTrackEnd(): void {
    if (this.state.repeatMode === 'one') {
      this.seek(0);
      this.play();
    } else if (this.state.repeatMode === 'all' || this.state.queue.length > 0) {
      this.skipNext();
    } else {
      this.stop();
    }
  }
  
  public skipNext(): void {
    if (this.state.queue.length > 0) {
      const nextTrack = this.state.queue.shift()!.track;
      this.loadTrack(nextTrack);
      this.play();
    } else if (this.state.repeatMode === 'all' && this.state.history.length > 0) {
      const randomTrack = this.state.history[Math.floor(Math.random() * this.state.history.length)];
      this.loadTrack(randomTrack);
      this.play();
    }
  }
  
  public skipPrevious(): void {
    if (this.state.currentTime > 3) {
      this.seek(0);
    } else if (this.state.history.length > 0) {
      const previousTrack = this.state.history[0];
      this.loadTrack(previousTrack);
      this.play();
    }
  }
  
  // Public API
  public getState(): AudioPlayerState {
    return { ...this.state };
  }
  
  public getAnalytics(): AudioPlayerAnalytics {
    return { ...this.analytics };
  }
  
  public getEvents(): AudioPlayerEvent[] {
    return [...this.events];
  }
  
  public destroy(): void {
    this.stop();
    this.stopVisualization();
    
    if (this.audioElement) {
      this.audioElement.src = '';
      this.audioElement = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.listeners.clear();
  }
}

// Create singleton instance
const audioPlayerService = new AudioPlayerService();

export default audioPlayerService;
