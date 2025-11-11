'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Play, Heart, Share2, MoreHorizontal, Pause } from 'lucide-react';
import { Card, CardContent, CardFooter } from './Card';
import { Button } from './Button';
import { cn, formatDuration, formatPlayCount } from '../../lib/utils';

interface MusicCardProps {
  id: string;
  title: string;
  artist: string;
  coverArt?: string;
  duration: number;
  playCount: number;
  isLiked?: boolean;
  isPlaying?: boolean;
  onPlay?: (id: string) => void;
  onLike?: (id: string) => void;
  onShare?: (id: string) => void;
  onMore?: (id: string) => void;
  className?: string;
}

export function MusicCard({
  id,
  title,
  artist,
  coverArt,
  duration,
  playCount,
  isLiked = false,
  isPlaying = false,
  onPlay,
  onLike,
  onShare,
  onMore,
  className
}: MusicCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { theme } = useTheme();

  const handlePlay = () => {
    onPlay?.(id);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike?.(id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.(id);
  };

  const handleMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMore?.(id);
  };

  return (
    <motion.div
      className={cn("group relative", className)}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ 
        y: -12,
        scale: 1.02,
        transition: { duration: 0.3, ease: "easeOut" }
      }}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card variant="music" className="overflow-hidden">
        <CardContent className="p-0">
          {/* Cover Art Container */}
          <div className="relative aspect-square overflow-hidden rounded-t-lg">
            {coverArt ? (
              <motion.img
                src={coverArt}
                alt={title}
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary-red/20 via-accent-pink/20 to-coral/20 flex items-center justify-center">
                <div className="text-4xl">🎵</div>
              </div>
            )}
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Play Button Overlay */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="glassmorphism"
                size="icon"
                onClick={handlePlay}
                className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30"
              >
                {isPlaying ? (
                  <Pause className={`w-6 h-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
                ) : (
                  <Play className={`w-6 h-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'} ml-1`} />
                )}
              </Button>
            </motion.div>

            {/* Action Buttons */}
            <div className="absolute top-3 right-3 flex gap-2">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : 20 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <Button
                  variant="glassmorphism"
                  size="icon"
                  onClick={handleLike}
                  className={cn(
                    "w-8 h-8 rounded-full",
                    isLiked && "text-primary-red"
                  )}
                >
                  <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                </Button>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : 20 }}
                transition={{ duration: 0.2, delay: 0.2 }}
              >
                <Button
                  variant="glassmorphism"
                  size="icon"
                  onClick={handleShare}
                  className="w-8 h-8 rounded-full"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Track Info */}
          <div className="p-4">
            <div className="space-y-2">
              <h3 className={`font-semibold text-lg line-clamp-1 group-hover:text-primary-red transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {title}
              </h3>
              <p className={`text-sm line-clamp-1 ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>
                {artist}
              </p>
            </div>

            {/* Waveform Visualization */}
            <div className="mt-3 h-8 bg-gradient-to-r from-primary-red/20 to-accent-pink/20 rounded-md overflow-hidden">
              <div className="flex items-end justify-between h-full px-2 py-1 gap-0.5">
                {Array.from({ length: 20 }, (_, i) => (
                  <motion.div
                    key={i}
                    className="bg-white/60 rounded-sm"
                    style={{
                      width: '2px',
                      height: `${Math.random() * 60 + 20}%`
                    }}
                    animate={{
                      height: isPlaying ? [`${Math.random() * 60 + 20}%`, `${Math.random() * 80 + 40}%`, `${Math.random() * 60 + 20}%`] : `${Math.random() * 60 + 20}%`
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: isPlaying ? Infinity : 0,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className={`flex items-center justify-between mt-3 text-xs ${
              theme === 'dark' ? 'text-white/40' : 'text-gray-500'
            }`}>
              <span>{formatDuration(duration)}</span>
              <span>{formatPlayCount(playCount)} plays</span>
            </div>
          </div>
        </CardContent>

        {/* Footer with More Options */}
        <CardFooter className="p-4 pt-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMore}
            className="ml-auto w-8 h-8 rounded-full hover:bg-white/10"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
