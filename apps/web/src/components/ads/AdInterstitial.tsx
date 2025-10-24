'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { adService } from '../../services/AdService';

interface AdInterstitialProps {
  onClose: () => void;
  skipDelay?: number;
}

export function AdInterstitial({ onClose, skipDelay = 5 }: AdInterstitialProps) {
  const [countdown, setCountdown] = useState(skipDelay);
  const [canSkip, setCanSkip] = useState(true); // Allow immediate skipping
  const [adId] = useState(adService.generateAdId('interstitial'));

  useEffect(() => {
    // Track ad impression
    adService.trackImpression(adId, 'interstitial', 'full_screen');

    // Optional countdown timer for display purposes only
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [adId]);

  const handleSkip = () => {
    onClose();
  };

  const handleAdClick = () => {
    adService.trackClick(adId);
  };

  const handleUpgradeClick = () => {
    adService.trackClick(`${adId}_upgrade`);
    window.location.href = '/pricing';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Ad Interstitial Container */}
      <div className="relative w-full max-w-4xl mx-4 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-pink-500/30">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-800/50 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400 font-medium">ADVERTISEMENT</span>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSkip}
              className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
            >
              <span className="text-white text-sm font-medium">Close</span>
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Ad Content */}
        <div 
          className="p-8 cursor-pointer"
          onClick={handleAdClick}
        >
          {/* Placeholder for Google Ad Manager ad unit */}
          <div className="aspect-video bg-gradient-to-br from-pink-600/30 via-purple-600/30 to-blue-600/30 rounded-xl border-2 border-pink-500/40 flex items-center justify-center">
            <div className="text-center max-w-2xl px-8">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-4xl">🎵</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Upgrade to SoundBridge Pro
                </h2>
                <p className="text-lg text-gray-300 mb-6">
                  Enjoy SoundBridge's economical model for unlimited audio uploads, HD audio quality and ad-free experience
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-2xl font-bold text-pink-400 mb-1">∞</p>
                  <p className="text-sm text-gray-300">Unlimited Uploads</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-2xl font-bold text-purple-400 mb-1">HD</p>
                  <p className="text-sm text-gray-300">Lossless Audio</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-2xl font-bold text-blue-400 mb-1">0</p>
                  <p className="text-sm text-gray-300">No Ads</p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpgradeClick();
                }}
                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all transform hover:scale-105 shadow-lg"
              >
                Upgrade Now - Only $9.99/month
              </button>

              <p className="text-xs text-gray-400 mt-4">
                Cancel anytime • No hidden fees • 7-day money-back guarantee
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-800/30 border-t border-gray-700 text-center">
          <p className="text-xs text-gray-500">
            Supporting free creators • Ads help keep SoundBridge free for everyone
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .fixed {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

