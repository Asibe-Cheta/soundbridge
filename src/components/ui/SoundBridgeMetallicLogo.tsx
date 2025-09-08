'use client';

import { useState, useEffect } from 'react';
import MetallicPaint, { parseLogoImage } from './MetallicPaint';

interface SoundBridgeMetallicLogoProps {
  className?: string;
  params?: {
    patternScale?: number;
    refraction?: number;
    edge?: number;
    patternBlur?: number;
    liquid?: number;
    speed?: number;
  };
}

export default function SoundBridgeMetallicLogo({ 
  className = '', 
  params = {} 
}: SoundBridgeMetallicLogoProps) {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultParams = {
    patternScale: 2,
    refraction: 0.015,
    edge: 2,
    patternBlur: 0.005,
    liquid: 0.07,
    speed: 0.3,
    ...params
  };

  useEffect(() => {
    async function loadLogoImage() {
      try {
        setLoading(true);
        setError(null);

        // Load the SoundBridge logo PNG
        const response = await fetch('/images/logos/soundbridge-logo-main.png');
        if (!response.ok) {
          throw new Error(`Failed to load logo: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const file = new File([blob], "soundbridge-logo-main.png", { type: blob.type });
        
        const parsedData = await parseLogoImage(file);
        setImageData(parsedData.imageData);
      } catch (err) {
        console.error('Error loading SoundBridge logo:', err);
        setError(err instanceof Error ? err.message : 'Failed to load logo');
      } finally {
        setLoading(false);
      }
    }

    loadLogoImage();
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-red-600 text-sm">Failed to load logo</div>
      </div>
    );
  }

  if (!imageData) {
    return null;
  }

  return (
    <div className={`paint-container ${className}`}>
      <MetallicPaint 
        imageData={imageData} 
        params={defaultParams}
      />
    </div>
  );
}