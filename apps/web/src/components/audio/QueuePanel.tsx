'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, List, Clock, User, Album, Play, Trash2, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn, formatDuration } from '../../lib/utils';
import { QueueItem } from '../../lib/types/audio';

interface QueuePanelProps {
  queue: QueueItem[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (index: number) => void;
  onClose: () => void;
}

export function QueuePanel({
  queue,
  onReorder,
  onRemove,
  onClose
}: QueuePanelProps) {
  const totalDuration = queue.reduce((total, item) => total + item.track.duration, 0);

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
                <List size={20} />
                Queue ({queue.length} tracks)
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
            {queue.length > 0 && (
              <div className="flex items-center gap-4 text-sm text-white/60">
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>Total: {formatDuration(totalDuration)}</span>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {queue.length === 0 ? (
              <div className="text-center py-8 text-white/60">
                <List size={48} className="mx-auto mb-4 opacity-50" />
                <p>Queue is empty</p>
                <p className="text-sm opacity-75">Add tracks to start building your queue</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {queue.map((item, index) => (
                  <motion.div
                    key={`${item.track.id}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group"
                  >
                    {/* Drag Handle */}
                    <div className="flex-shrink-0">
                      <GripVertical size={16} className="text-white/40 cursor-move" />
                    </div>

                    {/* Track Number */}
                    <div className="flex-shrink-0 w-8 h-8 rounded bg-gradient-to-br from-primary-red/20 to-accent-pink/20 flex items-center justify-center text-xs font-medium text-white">
                      {index + 1}
                    </div>

                    {/* Track Artwork */}
                    <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden">
                      {item.track.artwork ? (
                        <img
                          src={item.track.artwork}
                          alt={item.track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary-red to-accent-pink flex items-center justify-center text-lg">
                          🎵
                        </div>
                      )}
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-sm font-medium truncate">
                        {item.track.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-white/60">
                        <div className="flex items-center gap-1">
                          <User size={12} />
                          <span className="truncate">{item.track.artist}</span>
                        </div>
                        {item.track.album && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Album size={12} />
                              <span className="truncate">{item.track.album}</span>
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Audio Analysis Info */}
                      {(item.track.bpm || item.track.key) && (
                        <div className="flex items-center gap-2 mt-1">
                          {item.track.bpm && (
                            <span className="text-xs text-white/50">BPM: {item.track.bpm}</span>
                          )}
                          {item.track.key && (
                            <span className="text-xs text-white/50">Key: {item.track.key}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="flex-shrink-0 text-xs text-white/60">
                      {formatDuration(item.track.duration)}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 text-white/60 hover:text-white"
                        onClick={() => {
                          // This would play the track
                          console.log('Play track:', item.track.title);
                        }}
                      >
                        <Play size={12} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 text-white/60 hover:text-red-400"
                        onClick={() => onRemove(index)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Queue Actions */}
            {queue.length > 0 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10">
                <div className="text-sm text-white/60">
                  {queue.length} track{queue.length !== 1 ? 's' : ''} in queue
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // This would clear the queue
                      console.log('Clear queue');
                    }}
                    className="text-xs"
                  >
                    Clear Queue
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // This would shuffle the queue
                      console.log('Shuffle queue');
                    }}
                    className="text-xs"
                  >
                    Shuffle
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
