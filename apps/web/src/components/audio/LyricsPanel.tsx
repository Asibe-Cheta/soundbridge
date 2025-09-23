'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Type, Globe, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn, formatTime } from '../../lib/utils';
import { Lyrics } from '../../lib/types/audio';

interface LyricsPanelProps {
  lyrics: Lyrics;
  currentTime: number;
  onClose: () => void;
}

export function LyricsPanel({
  lyrics,
  currentTime,
  onClose
}: LyricsPanelProps) {
  const currentLineIndex = useMemo(() => {
    return lyrics.lines.findIndex(line => line.time > currentTime) - 1;
  }, [lyrics.lines, currentTime]);

  const currentLine = useMemo(() => {
    return currentLineIndex >= 0 ? lyrics.lines[currentLineIndex] : null;
  }, [lyrics.lines, currentLineIndex]);

  const nextLine = useMemo(() => {
    return currentLineIndex + 1 < lyrics.lines.length ? lyrics.lines[currentLineIndex + 1] : null;
  }, [lyrics.lines, currentLineIndex]);

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
              <CardTitle className="text-white flex items-center gap-2">
                <Type size={20} />
                Lyrics
                {lyrics.hasTranslation && (
                  <div className="flex items-center gap-1 text-sm text-white/60">
                    <Globe size={14} />
                    <span>{lyrics.translationLanguage}</span>
                  </div>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8"
              >
                <X size={16} />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-6">
              {/* Current Line Highlight */}
              {currentLine && (
                <div className="text-center py-8">
                  <motion.div
                    key={currentLineIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-2"
                  >
                    <h3 className="text-2xl font-bold text-white leading-relaxed">
                      {currentLine.text}
                    </h3>
                    {currentLine.translation && (
                      <p className="text-lg text-white/70 leading-relaxed">
                        {currentLine.translation}
                      </p>
                    )}
                    <div className="flex items-center justify-center gap-2 text-sm text-white/50">
                      <Clock size={14} />
                      <span>{formatTime(currentLine.time)}</span>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Full Lyrics */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <h4 className="text-white text-sm font-medium mb-3">Full Lyrics</h4>
                {lyrics.lines.map((line, index) => (
                  <motion.div
                    key={index}
                    className={cn(
                      "p-3 rounded-lg transition-all duration-300",
                      index === currentLineIndex
                        ? "bg-primary-red/20 border border-primary-red/30"
                        : "hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className={cn(
                          "text-sm leading-relaxed",
                          index === currentLineIndex
                            ? "text-white font-medium"
                            : "text-white/80"
                        )}>
                          {line.text}
                        </p>
                        {line.translation && (
                          <p className={cn(
                            "text-xs mt-1 leading-relaxed",
                            index === currentLineIndex
                              ? "text-white/70"
                              : "text-white/50"
                          )}>
                            {line.translation}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-xs text-white/40">
                        {formatTime(line.time)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Lyrics Info */}
              <div className="pt-4 border-t border-white/10">
                <div className="grid grid-cols-2 gap-4 text-sm text-white/60">
                  <div>
                    <span className="font-medium">Language:</span> {lyrics.language}
                  </div>
                  <div>
                    <span className="font-medium">Lines:</span> {lyrics.lines.length}
                  </div>
                  {lyrics.hasTranslation && (
                    <div>
                      <span className="font-medium">Translation:</span> {lyrics.translationLanguage}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Duration:</span> {formatTime(lyrics.lines[lyrics.lines.length - 1]?.time || 0)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
