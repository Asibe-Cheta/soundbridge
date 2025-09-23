'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Repeat, Shuffle, 
  Heart, Share2, List, Settings, Maximize2, Minimize2, Music, BarChart3,
  Type, Sliders, Zap, Activity, Radio, Clock, User, Album
} from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn, formatDuration } from '../../lib/utils';
import { useAdvancedAudioPlayer } from '../../hooks/useAdvancedAudioPlayer';
import { AudioTrack } from '../../lib/types/audio';
import { AudioVisualizer } from './AudioVisualizer';
import { EqualizerPanel } from './EqualizerPanel';
import { EffectsPanel } from './EffectsPanel';
import { QueuePanel } from './QueuePanel';
import { LyricsPanel } from './LyricsPanel';
import { AnalyticsPanel } from './AnalyticsPanel';

interface AdvancedAudioPlayerProps {
  className?: string;
  showMiniPlayer?: boolean;
  showFullscreenButton?: boolean;
  showEqualizer?: boolean;
  showEffects?: boolean;
  showLyrics?: boolean;
  showWaveform?: boolean;
  showSpectrum?: boolean;
}

export function AdvancedAudioPlayer({
  className = '',
  showMiniPlayer = true,
  showFullscreenButton = true,
  showEqualizer = true,
  showEffects = true,
  showLyrics = true,
  showWaveform = true,
  showSpectrum = true
}: AdvancedAudioPlayerProps) {
  const {
    state,
    visualizationData,
    lyrics,
    analytics,
    error,
    isLoading,
    actions,
    formatTime,
    formatDuration,
    getCurrentLyricLine,
    getVisualizationConfig,
    clearError
  } = useAdvancedAudioPlayer();

  const [showQueue, setShowQueue] = useState(false);
  const [showEqualizerPanel, setShowEqualizerPanel] = useState(false);
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const [showLyricsPanel, setShowLyricsPanel] = useState(false);
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Auto-load lyrics when track changes
  useEffect(() => {
    if (state.currentTrack && state.showLyrics) {
      // This would load lyrics for the current track
      console.log('Loading lyrics for:', state.currentTrack.title);
    }
  }, [state.currentTrack, state.showLyrics]);

  if (error) {
    return (
      <Card variant="glass" className={cn("audio-player error", className)}>
        <CardContent className="text-center p-6">
          <div className="text-red-400 mb-2">⚠️ Audio Error</div>
          <div className="text-sm text-white/60 mb-4">{error}</div>
          <Button onClick={clearError} variant="outline" size="sm">
            Dismiss
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!state.currentTrack) {
    return (
      <Card variant="glass" className={cn("audio-player", className)}>
        <CardContent className="text-center p-6 text-white/60">
          <Music size={48} className="mx-auto mb-4 opacity-50" />
          <p>No track selected</p>
          <p className="text-sm opacity-75">Select a track to start playing</p>
        </CardContent>
      </Card>
    );
  }

  const currentTrack = state.currentTrack;
  const visualizationConfig = getVisualizationConfig();

  return (
    <>
      {/* Main Audio Player */}
      <Card variant="glass" className={cn("audio-player", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Cover Art with Animation */}
            <motion.div 
              className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              {currentTrack.artwork ? (
                <img
                  src={currentTrack.artwork}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary-red to-accent-pink flex items-center justify-center text-2xl">
                  🎵
                </div>
              )}
              
              {/* Play/Pause Overlay */}
              <AnimatePresence>
                {state.isPlaying && (
                  <motion.div
                    className="absolute inset-0 bg-black/30 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-sm truncate">
                {currentTrack.title}
              </h3>
              <p className="text-white/60 text-xs truncate">
                {currentTrack.artist}
              </p>
              {currentTrack.album && (
                <p className="text-white/40 text-xs truncate">
                  {currentTrack.album}
                </p>
              )}
              {/* Audio Analysis Info */}
              {currentTrack.bpm && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-white/50">BPM: {currentTrack.bpm}</span>
                  {currentTrack.key && (
                    <span className="text-xs text-white/50">Key: {currentTrack.key}</span>
                  )}
                </div>
              )}
            </div>

            {/* Main Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={actions.toggleShuffle}
                className={cn(
                  "w-8 h-8",
                  state.isShuffled && "text-primary-red"
                )}
              >
                <Shuffle size={16} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={actions.skipPrevious}
                className="w-8 h-8"
              >
                <SkipBack size={16} />
              </Button>

              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="default"
                  size="icon"
                  onClick={actions.togglePlayPause}
                  disabled={isLoading}
                  className="w-12 h-12 rounded-full"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : state.isPlaying ? (
                    <Pause size={20} />
                  ) : (
                    <Play size={20} className="ml-0.5" />
                  )}
                </Button>
              </motion.div>

              <Button
                variant="ghost"
                size="icon"
                onClick={actions.skipNext}
                className="w-8 h-8"
              >
                <SkipForward size={16} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={actions.toggleRepeat}
                className={cn(
                  "w-8 h-8",
                  state.repeatMode !== 'none' && "text-primary-red"
                )}
              >
                <Repeat size={16} />
              </Button>
            </div>

            {/* Secondary Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={actions.toggleLike}
                className={cn(
                  "w-8 h-8",
                  currentTrack.liked && "text-primary-red"
                )}
              >
                <Heart size={16} className={cn(currentTrack.liked && "fill-current")} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={actions.share}
                className="w-8 h-8"
              >
                <Share2 size={16} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowQueue(!showQueue)}
                className="w-8 h-8"
              >
                <List size={16} />
              </Button>
            </div>

            {/* Advanced Controls */}
            <div className="flex items-center gap-2">
              {showEqualizer && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEqualizerPanel(!showEqualizerPanel)}
                  className={cn(
                    "w-8 h-8",
                    state.equalizer.enabled && "text-primary-red"
                  )}
                >
                  <Sliders size={16} />
                </Button>
              )}

              {showEffects && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEffectsPanel(!showEffectsPanel)}
                  className={cn(
                    "w-8 h-8",
                    (state.effects.reverb.enabled || state.effects.echo.enabled) && "text-primary-red"
                  )}
                >
                  <Zap size={16} />
                </Button>
              )}

              {showLyrics && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLyricsPanel(!showLyricsPanel)}
                  className={cn(
                    "w-8 h-8",
                    state.showLyrics && "text-primary-red"
                  )}
                >
                  <Type size={16} />
                </Button>
              )}

              {showWaveform && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={actions.toggleWaveform}
                  className={cn(
                    "w-8 h-8",
                    state.showWaveform && "text-primary-red"
                  )}
                >
                  <Activity size={16} />
                </Button>
              )}

              {showSpectrum && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={actions.toggleSpectrum}
                  className={cn(
                    "w-8 h-8",
                    state.showSpectrum && "text-primary-red"
                  )}
                >
                  <BarChart3 size={16} />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAnalyticsPanel(!showAnalyticsPanel)}
                className="w-8 h-8"
              >
                <Radio size={16} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                className="w-8 h-8"
              >
                <Settings size={16} />
              </Button>

              {showFullscreenButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={actions.toggleFullscreen}
                  className="w-8 h-8"
                >
                  {state.isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </Button>
              )}
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={actions.toggleMute}
                className="w-8 h-8"
              >
                {state.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </Button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={state.isMuted ? 0 : state.volume}
                onChange={(e) => actions.setVolume(parseFloat(e.target.value))}
                className="w-16 h-1 bg-white/10 rounded-full appearance-none cursor-pointer slider"
              />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/40 mb-2">
              <span>{formatTime(state.currentTime)}</span>
              <span>{formatDuration(state.duration)}</span>
            </div>
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const progressWidth = rect.width;
                const clickPercent = clickX / progressWidth;
                const newTime = clickPercent * state.duration;
                actions.seek(newTime);
              }}
              className="w-full bg-white/10 rounded-full h-2 cursor-pointer overflow-hidden"
            >
              <motion.div
                className="h-full bg-gradient-to-r from-primary-red to-accent-pink"
                initial={{ width: 0 }}
                animate={{ width: `${state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>

          {/* Audio Visualization */}
          {(state.showWaveform || state.showSpectrum) && (
            <div className="mt-4">
              <AudioVisualizer
                config={visualizationConfig}
                data={visualizationData}
                height={40}
              />
            </div>
          )}

          {/* Current Lyric Line */}
          {state.showLyrics && lyrics && (
            <div className="mt-3 p-2 bg-white/5 rounded-lg">
              <p className="text-sm text-white/80 text-center">
                {getCurrentLyricLine() || "No lyrics available"}
              </p>
            </div>
          )}

          {/* Advanced Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                className="mt-4 pt-4 border-t border-white/10"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-2 gap-4">
                  {/* Playback Rate */}
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Speed</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={state.playbackRate}
                      onChange={(e) => actions.setPlaybackRate(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                    />
                    <span className="text-xs text-white/40">{state.playbackRate}x</span>
                  </div>

                  {/* Pitch */}
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Pitch</label>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={state.pitch}
                      onChange={(e) => actions.setPitch(parseInt(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                    />
                    <span className="text-xs text-white/40">{state.pitch > 0 ? '+' : ''}{state.pitch} semitones</span>
                  </div>

                  {/* Crossfade */}
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Crossfade</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={state.settings.crossfade}
                      onChange={(e) => actions.setCrossfade(parseInt(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                    />
                    <span className="text-xs text-white/40">{state.settings.crossfade}s</span>
                  </div>

                  {/* Normalization */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-white/60">Normalization</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={actions.toggleNormalization}
                      className={cn(
                        "text-xs",
                        state.normalizationEnabled && "text-primary-red"
                      )}
                    >
                      {state.normalizationEnabled ? "On" : "Off"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

                 <style dangerouslySetInnerHTML={{ __html: `
           .slider::-webkit-slider-thumb {
             appearance: none;
             width: 12px;
             height: 12px;
             border-radius: 50%;
             background: linear-gradient(45deg, #DC2626, #EC4899);
             cursor: pointer;
           }
           
           .slider::-moz-range-thumb {
             width: 12px;
             height: 12px;
             border-radius: 50%;
             background: linear-gradient(45deg, #DC2626, #EC4899);
             cursor: pointer;
             border: none;
           }
         `}} />
      </Card>

      {/* Panels */}
      <AnimatePresence>
        {showEqualizerPanel && (
          <EqualizerPanel
            equalizer={state.equalizer}
            onPresetChange={actions.setEqualizerPreset}
            onBandChange={actions.setEqualizerBand}
            onToggle={actions.toggleEqualizer}
            onClose={() => setShowEqualizerPanel(false)}
          />
        )}

        {showEffectsPanel && (
          <EffectsPanel
            effects={state.effects}
            onReverbToggle={actions.toggleReverb}
            onReverbLevelChange={actions.setReverbLevel}
            onEchoToggle={actions.toggleEcho}
            onEchoLevelChange={actions.setEchoLevel}
            onClose={() => setShowEffectsPanel(false)}
          />
        )}

        {showQueue && (
          <QueuePanel
            queue={state.queue}
            onReorder={actions.reorderQueue}
            onRemove={actions.removeFromQueue}
            onClose={() => setShowQueue(false)}
          />
        )}

        {showLyricsPanel && lyrics && (
          <LyricsPanel
            lyrics={lyrics}
            currentTime={state.currentTime}
            onClose={() => setShowLyricsPanel(false)}
          />
        )}

        {showAnalyticsPanel && (
          <AnalyticsPanel
            analytics={analytics}
            currentTrack={currentTrack}
            onClose={() => setShowAnalyticsPanel(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
