'use client';

import React from 'react';
import { ArrowRight, Heart } from 'lucide-react';

interface MusicLoverPurposeStepProps {
  isOpen: boolean;
  onContinue: () => void;
  onBack: () => void;
}

export function MusicLoverPurposeStep({ isOpen, onContinue, onBack }: MusicLoverPurposeStepProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 50 }}
    >
      <div
        className="relative w-full max-w-2xl bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowRight className="text-white/70 hover:text-white rotate-180" size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 text-center">
          <div className="flex justify-center mb-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #EC4899 0%, #9333EA 100%)' }}
            >
              <Heart className="w-9 h-9 text-white" fill="currentColor" />
            </div>
          </div>

          <h2
            className="text-white mb-4"
            style={{ fontSize: '26px', fontWeight: 800, lineHeight: 1.25 }}
          >
            Discover artists. Support them directly.
          </h2>

          <p
            className="text-white/65 max-w-lg mx-auto mb-4"
            style={{ fontSize: '15px', lineHeight: 1.6 }}
          >
            SoundBridge shows you musicians, podcasters, and DJs near you and matched to what you
            love. When you find someone you want to support, you can tip them directly, keep them
            going, and help them grow — no middleman, no waiting.
          </p>

          <p
            className="text-white/38 max-w-lg mx-auto mb-8"
            style={{ fontSize: '13px', lineHeight: 1.5 }}
          >
            The more you support artists you love, the more you'll unlock as we grow.
          </p>

          <button
            onClick={onContinue}
            className="w-full max-w-sm mx-auto rounded-full py-3.5 font-semibold text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(90deg, #EC4899 0%, #9333EA 100%)' }}
          >
            Let's go
          </button>
        </div>
      </div>
    </div>
  );
}
