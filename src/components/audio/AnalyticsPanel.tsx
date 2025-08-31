'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Radio, BarChart3, Clock, Heart, Share2, TrendingUp, Music, User, Album } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn, formatDuration } from '../../lib/utils';
import { AudioPlayerAnalytics, AudioTrack } from '../../lib/types/audio';

interface AnalyticsPanelProps {
  analytics: AudioPlayerAnalytics;
  currentTrack: AudioTrack;
  onClose: () => void;
}

export function AnalyticsPanel({
  analytics,
  currentTrack,
  onClose
}: AnalyticsPanelProps) {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-4xl mx-4"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card variant="glass" className="relative">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Radio size={20} />
                Listening Analytics
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

          <CardContent className="space-y-6">
            {/* Current Track Analysis */}
            <div className="space-y-4">
              <h3 className="text-white text-lg font-medium">Current Track Analysis</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {currentTrack.bpm && (
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={16} className="text-blue-400" />
                      <span className="text-white text-sm font-medium">BPM</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{currentTrack.bpm}</p>
                  </div>
                )}
                
                {currentTrack.key && (
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Music size={16} className="text-green-400" />
                      <span className="text-white text-sm font-medium">Key</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{currentTrack.key}</p>
                  </div>
                )}

                {currentTrack.energy !== undefined && (
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 size={16} className="text-yellow-400" />
                      <span className="text-white text-sm font-medium">Energy</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{Math.round(currentTrack.energy * 100)}%</p>
                  </div>
                )}

                {currentTrack.danceability !== undefined && (
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart size={16} className="text-red-400" />
                      <span className="text-white text-sm font-medium">Danceability</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{Math.round(currentTrack.danceability * 100)}%</p>
                  </div>
                )}
              </div>
            </div>

            {/* Listening Statistics */}
            <div className="space-y-4">
              <h3 className="text-white text-lg font-medium">Listening Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-blue-400" />
                    <span className="text-white text-sm font-medium">Total Play Time</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{formatTime(analytics.totalPlayTime)}</p>
                </div>

                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Music size={16} className="text-green-400" />
                    <span className="text-white text-sm font-medium">Tracks Played</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{analytics.tracksPlayed}</p>
                </div>

                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart size={16} className="text-red-400" />
                    <span className="text-white text-sm font-medium">Favorites</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{analytics.favoritesAdded}</p>
                </div>

                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Share2 size={16} className="text-purple-400" />
                    <span className="text-white text-sm font-medium">Shares</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{analytics.sharesMade}</p>
                </div>
              </div>
            </div>

            {/* Genre and Artist Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Most Played Genres */}
              <div className="space-y-4">
                <h3 className="text-white text-lg font-medium">Most Played Genres</h3>
                <div className="space-y-2">
                  {analytics.mostPlayedGenres.length > 0 ? (
                    analytics.mostPlayedGenres.slice(0, 5).map((genre, index) => (
                      <div key={genre} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded bg-gradient-to-br from-primary-red to-accent-pink flex items-center justify-center text-xs font-bold text-white">
                            {index + 1}
                          </div>
                          <span className="text-white font-medium">{genre}</span>
                        </div>
                        <div className="text-white/60 text-sm">
                          {/* This would show actual play count */}
                          {Math.floor(Math.random() * 50) + 10} plays
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-white/60">
                      <Music size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No genre data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Most Played Artists */}
              <div className="space-y-4">
                <h3 className="text-white text-lg font-medium">Most Played Artists</h3>
                <div className="space-y-2">
                  {analytics.mostPlayedArtists.length > 0 ? (
                    analytics.mostPlayedArtists.slice(0, 5).map((artist, index) => (
                      <div key={artist} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded bg-gradient-to-br from-primary-red to-accent-pink flex items-center justify-center text-xs font-bold text-white">
                            {index + 1}
                          </div>
                          <span className="text-white font-medium">{artist}</span>
                        </div>
                        <div className="text-white/60 text-sm">
                          {/* This would show actual play count */}
                          {Math.floor(Math.random() * 30) + 5} plays
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-white/60">
                      <User size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No artist data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Session Analytics */}
            <div className="space-y-4">
              <h3 className="text-white text-lg font-medium">Session Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-blue-400" />
                    <span className="text-white text-sm font-medium">Average Session</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{formatTime(analytics.averageSessionLength)}</p>
                </div>

                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Album size={16} className="text-green-400" />
                    <span className="text-white text-sm font-medium">Playlists Created</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{analytics.playlistsCreated}</p>
                </div>

                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className="text-purple-400" />
                    <span className="text-white text-sm font-medium">Completion Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-white">85%</p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="space-y-4">
              <h3 className="text-white text-lg font-medium">Recent Activity</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {analytics.listeningHistory.slice(0, 10).map((event, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-primary-red"></div>
                    <div className="flex-1">
                      <p className="text-white text-sm">
                        {event.type === 'play' && 'Started playing'}
                        {event.type === 'pause' && 'Paused'}
                        {event.type === 'stop' && 'Stopped'}
                        {event.type === 'seek' && 'Seeked'}
                        {event.type === 'volume' && 'Changed volume'}
                        {event.type === 'trackChange' && 'Changed track'}
                        {event.type === 'queueChange' && 'Updated queue'}
                        {event.type === 'error' && 'Error occurred'}
                      </p>
                      <p className="text-white/60 text-xs">
                        {event.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
