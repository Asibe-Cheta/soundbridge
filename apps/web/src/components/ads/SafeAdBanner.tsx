'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';

interface SafeAdBannerProps {
  placement: 'feed' | 'sidebar' | 'footer';
  className?: string;
}

export function SafeAdBanner({ placement, className = '' }: SafeAdBannerProps) {
  const [showAd, setShowAd] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const adContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only show ads for free users (you can customize this logic)
    const shouldShowAd = true; // For now, show to everyone
    
    if (shouldShowAd && !isDismissed) {
      setShowAd(true);
    }
  }, [placement, isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowAd(false);
  };

  const handleUpgradeClick = () => {
    window.location.href = '/pricing';
  };

  if (!showAd) {
    return null;
  }

  return (
    <div className={`ad-banner ad-banner-${placement} ${className}`}>
      <div className="ad-banner-container">
        {/* Ad Label */}
        <div className="ad-label">
          <span className="text-xs text-gray-400">Advertisement</span>
          <button 
            onClick={handleDismiss}
            className="ml-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Close ad"
          >
            <X size={14} />
          </button>
        </div>

        {/* Ad Content - Safe Static Content */}
        <div 
          className="ad-content cursor-pointer"
          onClick={handleUpgradeClick}
        >
          <div 
            ref={adContainerRef}
            className={`ad-container ad-container-${placement}`}
          >
            <div className={`ad-placeholder ad-placeholder-${placement}`}>
              <div className="flex items-center justify-center h-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-lg border border-pink-500/30">
                <div className="text-center p-4">
                  <p className="text-white font-semibold mb-2">🎵 SoundBridge Pro</p>
                  <p className="text-sm text-gray-300 mb-3">Unlimited uploads, HD audio, no ads</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpgradeClick();
                    }}
                    className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Upgrade Now - $9.99/mo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ad-banner {
          margin: 1rem 0;
        }

        .ad-banner-container {
          background: rgba(17, 24, 39, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          padding: 0.75rem;
          backdrop-filter: blur(10px);
        }

        .ad-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .ad-container {
          min-height: 90px;
        }

        .ad-container-sidebar {
          min-height: 250px;
        }

        .ad-container-footer {
          min-height: 50px;
        }

        .ad-placeholder {
          min-height: 90px;
        }

        .ad-placeholder-sidebar {
          min-height: 250px;
        }

        .ad-placeholder-footer {
          min-height: 50px;
        }

        @media (max-width: 768px) {
          .ad-banner-sidebar {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
