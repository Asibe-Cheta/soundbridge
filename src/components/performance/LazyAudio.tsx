'use client';

import React, { useState, useEffect, useRef } from 'react';

interface LazyAudioProps {
  src: string;
  className?: string;
  controls?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  onLoad?: () => void;
  onError?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export function LazyAudio({
  src,
  className = '',
  controls = true,
  preload = 'metadata',
  onLoad,
  onError,
  onPlay,
  onPause,
  onEnded,
}: LazyAudioProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px 0px',
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div className={`bg-gray-300 flex items-center justify-center p-4 rounded ${className}`}>
        <span className="text-gray-500 text-sm">Failed to load audio</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Placeholder */}
      {!isLoaded && (
        <div className="bg-gray-200 rounded p-4 animate-pulse">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
            <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
            <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
          </div>
          <div className="mt-2 h-2 bg-gray-400 rounded"></div>
        </div>
      )}

      {/* Actual Audio */}
      {isInView && (
        <audio
          ref={audioRef}
          src={src}
          controls={controls}
          preload={preload}
          className={`transition-opacity duration-300 w-full ${isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          onLoadedMetadata={handleLoad}
          onError={handleError}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
        />
      )}
    </div>
  );
} 