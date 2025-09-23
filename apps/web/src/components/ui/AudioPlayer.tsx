'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Repeat, Shuffle, Heart, Share2, List } from 'lucide-react';
import { Card, CardContent } from './Card';
import { Button } from './Button';
import { cn, formatDuration } from '../../lib/utils';

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  artwork: string;
  url: string;
  liked: boolean;
}

interface AudioPlayerProps {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffled: boolean;
  repeatMode: 'none' | 'one' | 'all';
  onPlayPause: () => void;
  onSkipNext: () => void;
  onSkipPrevious: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: () => void;
  onAddToPlaylist: () => void;
  onShare: () => void;
  onQueueReorder: (fromIndex: number, toIndex: number) => void;
  onRemoveFromQueue: (index: number) => void;
  className?: string;
}

export function AudioPlayer({
  currentTrack,
  queue,
  isPlaying,
  currentTime,
  duration,
  volume,
  isShuffled,
  repeatMode,
  onPlayPause,
  onSkipNext,
  onSkipPrevious,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onAddToPlaylist,
  onShare,
  onQueueReorder,
  onRemoveFromQueue,
  className = ''
}: AudioPlayerProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQueue, setShowQueue] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    const handleLoadedMetadata = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setError('Failed to load audio file');
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
    };
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const togglePlayPause = () => {
    onPlayPause();
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progress = progressRef.current;
    if (!progress) return;

    const rect = progress.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressWidth = rect.width;
    const clickPercent = clickX / progressWidth;
    const newTime = clickPercent * duration;

    onSeek(newTime);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    onVolumeChange(isMuted ? volume : 0);
  };

  if (error) {
    return (
      <Card variant="glass" className={cn("audio-player error", className)}>
        <CardContent className="text-center p-6">
          <div className="text-red-400 mb-2">⚠️ Audio Error</div>
          <div className="text-sm text-white/60">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!currentTrack) {
    return (
      <Card variant="glass" className={cn("audio-player", className)}>
        <CardContent className="text-center p-6 text-white/60">
          No track selected
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className={cn("audio-player", className)}>
      <audio ref={audioRef} src={currentTrack.url} preload="metadata" />
      
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Cover Art */}
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
              {isPlaying && (
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
          </div>

          {/* Main Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleShuffle}
              className={cn(
                "w-8 h-8",
                isShuffled && "text-primary-red"
              )}
            >
              <Shuffle size={16} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onSkipPrevious}
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
                onClick={togglePlayPause}
                disabled={isLoading}
                className="w-12 h-12 rounded-full"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause size={20} />
                ) : (
                  <Play size={20} className="ml-0.5" />
                )}
              </Button>
            </motion.div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onSkipNext}
              className="w-8 h-8"
            >
              <SkipForward size={16} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleRepeat}
              className={cn(
                "w-8 h-8",
                repeatMode !== 'none' && "text-primary-red"
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
              onClick={onToggleLike}
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
              onClick={onShare}
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

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="w-8 h-8"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </Button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1 bg-white/10 rounded-full appearance-none cursor-pointer slider"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-white/40 mb-2">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="w-full bg-white/10 rounded-full h-2 cursor-pointer overflow-hidden"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-primary-red to-accent-pink"
              initial={{ width: 0 }}
              animate={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>

        {/* Queue Panel */}
        <AnimatePresence>
          {showQueue && (
            <motion.div
              className="mt-4 pt-4 border-t border-white/10"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h4 className="text-sm font-semibold text-white mb-2">Queue</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {queue.map((track, index) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-primary-red/20 to-accent-pink/20 flex items-center justify-center text-xs">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{track.title}</p>
                      <p className="text-xs text-white/60 truncate">{track.artist}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveFromQueue(index)}
                      className="w-6 h-6 text-white/40 hover:text-red-400"
                    >
                      ×
                    </Button>
                  </div>
                ))}
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
  );
} 