'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Type, Globe, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface SimpleLyricsPanelProps {
  lyrics: string;
  currentTime: number;
  onClose: () => void;
}

export function SimpleLyricsPanel({
  lyrics,
  currentTime,
  onClose
}: SimpleLyricsPanelProps) {
  // Split lyrics into lines for display
  const lyricsLines = lyrics ? lyrics.split('\n').filter(line => line.trim()) : [];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-2xl mx-4"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card variant="glass" className="relative">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <Type className="w-5 h-5" />
                Lyrics
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {lyrics ? (
              <div className="space-y-4">
                {/* Current time display */}
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')}</span>
                </div>

                {/* Lyrics content */}
                <div className="max-h-96 overflow-y-auto">
                  <div className="space-y-2 text-white/90 leading-relaxed">
                    {lyricsLines.map((line, index) => (
                      <motion.p
                        key={index}
                        className={cn(
                          "text-center py-2 px-4 rounded-lg transition-colors",
                          "hover:bg-white/5"
                        )}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {line}
                      </motion.p>
                    ))}
                  </div>
                </div>

                {/* Language info */}
                <div className="flex items-center gap-2 text-white/40 text-xs">
                  <Globe className="w-3 h-3" />
                  <span>Language: English</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Type className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">No lyrics available for this track</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
