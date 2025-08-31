'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Save, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { EqualizerSettings } from '../../lib/types/audio';

interface EqualizerPanelProps {
  equalizer: EqualizerSettings;
  onPresetChange: (preset: string) => void;
  onBandChange: (band: number, value: number) => void;
  onToggle: () => void;
  onClose: () => void;
}

const EQUALIZER_BANDS = [
  { freq: '60', label: '60Hz' },
  { freq: '170', label: '170Hz' },
  { freq: '310', label: '310Hz' },
  { freq: '600', label: '600Hz' },
  { freq: '1k', label: '1kHz' },
  { freq: '3k', label: '3kHz' },
  { freq: '6k', label: '6kHz' },
  { freq: '12k', label: '12kHz' },
  { freq: '14k', label: '14kHz' },
  { freq: '16k', label: '16kHz' }
];

export function EqualizerPanel({
  equalizer,
  onPresetChange,
  onBandChange,
  onToggle,
  onClose
}: EqualizerPanelProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('Flat');

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    onPresetChange(preset);
  };

  const resetToFlat = () => {
    handlePresetChange('Flat');
  };

  const saveCustomPreset = () => {
    const presetName = prompt('Enter preset name:');
    if (presetName) {
      // This would save the custom preset
      console.log('Saving custom preset:', presetName, equalizer.custom);
    }
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
                <Settings size={20} />
                Equalizer
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
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">Equalizer</span>
              <Button
                variant={equalizer.enabled ? "primary" : "outline"}
                size="sm"
                onClick={onToggle}
              >
                {equalizer.enabled ? "Enabled" : "Disabled"}
              </Button>
            </div>

            {/* Presets */}
            <div>
              <h4 className="text-white text-sm font-medium mb-3">Presets</h4>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(equalizer.presets).map((preset) => (
                  <Button
                    key={preset}
                    variant={selectedPreset === preset ? "primary" : "outline"}
                    size="sm"
                    onClick={() => handlePresetChange(preset)}
                    className="text-xs"
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            </div>

            {/* Equalizer Bands */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-white text-sm font-medium">Frequency Bands</h4>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetToFlat}
                    className="text-xs"
                  >
                    <RotateCcw size={12} className="mr-1" />
                    Reset
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={saveCustomPreset}
                    className="text-xs"
                  >
                    <Save size={12} className="mr-1" />
                    Save
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-10 gap-2">
                {EQUALIZER_BANDS.map((band, index) => (
                  <div key={band.freq} className="flex flex-col items-center space-y-2">
                    {/* Frequency Label */}
                    <span className="text-xs text-white/60">{band.label}</span>
                    
                    {/* Vertical Slider */}
                    <div className="relative h-32 w-8">
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        step="1"
                        value={equalizer.custom[index]}
                        onChange={(e) => onBandChange(index, parseInt(e.target.value))}
                        className="slider-vertical"
                        disabled={!equalizer.enabled}
                      />
                      
                      {/* Value Display */}
                      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                        <span className={cn(
                          "text-xs font-mono",
                          equalizer.custom[index] > 0 ? "text-green-400" : 
                          equalizer.custom[index] < 0 ? "text-red-400" : "text-white/60"
                        )}>
                          {equalizer.custom[index] > 0 ? '+' : ''}{equalizer.custom[index]}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preamp Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm">Preamp</span>
                <span className="text-xs text-white/60">
                  {equalizer.preamp > 0 ? '+' : ''}{equalizer.preamp}dB
                </span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={equalizer.preamp}
                onChange={(e) => {
                  // This would update preamp
                  console.log('Preamp changed:', e.target.value);
                }}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                disabled={!equalizer.enabled}
              />
            </div>

            {/* Frequency Response Visualization */}
            <div className="space-y-2">
              <h4 className="text-white text-sm font-medium">Frequency Response</h4>
              <div className="h-20 bg-white/5 rounded-lg p-2">
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 300 60"
                  className="w-full h-full"
                >
                  {/* Grid Lines */}
                  <defs>
                    <pattern id="grid" width="30" height="15" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  {/* Frequency Response Curve */}
                  <path
                    d={generateFrequencyResponsePath(equalizer.custom)}
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Gradient Definition */}
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#DC2626" />
                      <stop offset="50%" stopColor="#EC4899" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        .slider-vertical {
          writing-mode: bt-lr;
          -webkit-appearance: slider-vertical;
          width: 8px;
          height: 100%;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          outline: none;
        }
        
        .slider-vertical::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(45deg, #DC2626, #EC4899);
          cursor: pointer;
        }
        
        .slider-vertical::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(45deg, #DC2626, #EC4899);
          cursor: pointer;
          border: none;
        }
        
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
    </motion.div>
  );
}

function generateFrequencyResponsePath(values: number[]): string {
  const width = 300;
  const height = 60;
  const centerY = height / 2;
  
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = centerY - (value / 12) * (height / 2);
    return `${x},${y}`;
  });
  
  return `M ${points.join(' L ')}`;
}
