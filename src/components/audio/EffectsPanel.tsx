'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Zap, Volume2, Clock, Gauge, Waves } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { AudioEffects } from '../../lib/types/audio';

interface EffectsPanelProps {
  effects: AudioEffects;
  onReverbToggle: () => void;
  onReverbLevelChange: (level: number) => void;
  onEchoToggle: () => void;
  onEchoLevelChange: (level: number) => void;
  onClose: () => void;
}

export function EffectsPanel({
  effects,
  onReverbToggle,
  onReverbLevelChange,
  onEchoToggle,
  onEchoLevelChange,
  onClose
}: EffectsPanelProps) {
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
                <Zap size={20} />
                Audio Effects
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
            {/* Reverb Effect */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Waves size={16} className="text-blue-400" />
                  <span className="text-white text-sm font-medium">Reverb</span>
                </div>
                <Button
                  variant={effects.reverb.enabled ? "primary" : "outline"}
                  size="sm"
                  onClick={onReverbToggle}
                >
                  {effects.reverb.enabled ? "Enabled" : "Disabled"}
                </Button>
              </div>

              {effects.reverb.enabled && (
                <div className="space-y-3 pl-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/80 text-xs">Level</span>
                      <span className="text-white/60 text-xs">
                        {Math.round(effects.reverb.level * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={effects.reverb.level}
                      onChange={(e) => onReverbLevelChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/80 text-xs">Decay</span>
                      <span className="text-white/60 text-xs">
                        {effects.reverb.decay}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="5"
                      step="0.1"
                      value={effects.reverb.decay}
                      onChange={(e) => {
                        // This would update reverb decay
                        console.log('Reverb decay changed:', e.target.value);
                      }}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/80 text-xs">Pre-delay</span>
                      <span className="text-white/60 text-xs">
                        {effects.reverb.preDelay}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.01"
                      value={effects.reverb.preDelay}
                      onChange={(e) => {
                        // This would update reverb pre-delay
                        console.log('Reverb pre-delay changed:', e.target.value);
                      }}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Echo Effect */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-green-400" />
                  <span className="text-white text-sm font-medium">Echo</span>
                </div>
                <Button
                  variant={effects.echo.enabled ? "primary" : "outline"}
                  size="sm"
                  onClick={onEchoToggle}
                >
                  {effects.echo.enabled ? "Enabled" : "Disabled"}
                </Button>
              </div>

              {effects.echo.enabled && (
                <div className="space-y-3 pl-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/80 text-xs">Level</span>
                      <span className="text-white/60 text-xs">
                        {Math.round(effects.echo.level * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={effects.echo.level}
                      onChange={(e) => onEchoLevelChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/80 text-xs">Delay</span>
                      <span className="text-white/60 text-xs">
                        {effects.echo.delay}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={effects.echo.delay}
                      onChange={(e) => {
                        // This would update echo delay
                        console.log('Echo delay changed:', e.target.value);
                      }}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/80 text-xs">Feedback</span>
                      <span className="text-white/60 text-xs">
                        {Math.round(effects.echo.feedback * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.9"
                      step="0.1"
                      value={effects.echo.feedback}
                      onChange={(e) => {
                        // This would update echo feedback
                        console.log('Echo feedback changed:', e.target.value);
                      }}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Compression Effect */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge size={16} className="text-yellow-400" />
                  <span className="text-white text-sm font-medium">Compression</span>
                </div>
                <Button
                  variant={effects.compression.enabled ? "primary" : "outline"}
                  size="sm"
                  onClick={() => {
                    // This would toggle compression
                    console.log('Compression toggle');
                  }}
                >
                  {effects.compression.enabled ? "Enabled" : "Disabled"}
                </Button>
              </div>

              {effects.compression.enabled && (
                <div className="space-y-3 pl-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/80 text-xs">Threshold</span>
                      <span className="text-white/60 text-xs">
                        {effects.compression.threshold}dB
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-60"
                      max="0"
                      step="1"
                      value={effects.compression.threshold}
                      onChange={(e) => {
                        // This would update compression threshold
                        console.log('Compression threshold changed:', e.target.value);
                      }}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/80 text-xs">Ratio</span>
                      <span className="text-white/60 text-xs">
                        {effects.compression.ratio}:1
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={effects.compression.ratio}
                      onChange={(e) => {
                        // This would update compression ratio
                        console.log('Compression ratio changed:', e.target.value);
                      }}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/80 text-xs">Attack</span>
                        <span className="text-white/60 text-xs">
                          {effects.compression.attack}s
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.001"
                        max="0.1"
                        step="0.001"
                        value={effects.compression.attack}
                        onChange={(e) => {
                          // This would update compression attack
                          console.log('Compression attack changed:', e.target.value);
                        }}
                        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/80 text-xs">Release</span>
                        <span className="text-white/60 text-xs">
                          {effects.compression.release}s
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.01"
                        max="1"
                        step="0.01"
                        value={effects.compression.release}
                        onChange={(e) => {
                          // This would update compression release
                          console.log('Compression release changed:', e.target.value);
                        }}
                        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Distortion Effect */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 size={16} className="text-red-400" />
                  <span className="text-white text-sm font-medium">Distortion</span>
                </div>
                <Button
                  variant={effects.distortion.enabled ? "primary" : "outline"}
                  size="sm"
                  onClick={() => {
                    // This would toggle distortion
                    console.log('Distortion toggle');
                  }}
                >
                  {effects.distortion.enabled ? "Enabled" : "Disabled"}
                </Button>
              </div>

              {effects.distortion.enabled && (
                <div className="space-y-3 pl-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/80 text-xs">Level</span>
                      <span className="text-white/60 text-xs">
                        {Math.round(effects.distortion.level * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={effects.distortion.level}
                      onChange={(e) => {
                        // This would update distortion level
                        console.log('Distortion level changed:', e.target.value);
                      }}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/80 text-xs">Drive</span>
                      <span className="text-white/60 text-xs">
                        {Math.round(effects.distortion.drive * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={effects.distortion.drive}
                      onChange={(e) => {
                        // This would update distortion drive
                        console.log('Distortion drive changed:', e.target.value);
                      }}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Effects Chain Visualization */}
            <div className="space-y-2">
              <h4 className="text-white text-sm font-medium">Effects Chain</h4>
              <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg">
                <div className={cn(
                  "px-2 py-1 rounded text-xs",
                  effects.reverb.enabled 
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" 
                    : "bg-white/10 text-white/40"
                )}>
                  Reverb
                </div>
                <div className="text-white/20">→</div>
                <div className={cn(
                  "px-2 py-1 rounded text-xs",
                  effects.echo.enabled 
                    ? "bg-green-500/20 text-green-300 border border-green-500/30" 
                    : "bg-white/10 text-white/40"
                )}>
                  Echo
                </div>
                <div className="text-white/20">→</div>
                <div className={cn(
                  "px-2 py-1 rounded text-xs",
                  effects.compression.enabled 
                    ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30" 
                    : "bg-white/10 text-white/40"
                )}>
                  Compression
                </div>
                <div className="text-white/20">→</div>
                <div className={cn(
                  "px-2 py-1 rounded text-xs",
                  effects.distortion.enabled 
                    ? "bg-red-500/20 text-red-300 border border-red-500/30" 
                    : "bg-white/10 text-white/40"
                )}>
                  Distortion
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <style jsx>{`
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
      `}</style>
    </motion.div>
  );
}
