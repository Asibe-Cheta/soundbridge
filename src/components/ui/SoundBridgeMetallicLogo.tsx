'use client';

import React, { useState, useEffect } from 'react';
import MetallicPaint, { parseLogoImage } from '../../../components/MetallicPaint';

interface SoundBridgeMetallicLogoProps {
  className?: string;
  style?: React.CSSProperties;
  params?: {
    edge?: number;
    patternBlur?: number;
    patternScale?: number;
    refraction?: number;
    speed?: number;
    liquid?: number;
  };
}

const SoundBridgeMetallicLogo: React.FC<SoundBridgeMetallicLogoProps> = ({ 
  className = '', 
  style = {},
  params = {
    edge: 2,
    patternBlur: 0.005,
    patternScale: 2,
    refraction: 0.015,
    speed: 0.3,
    liquid: 0.07
  }
}) => {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLogoImage() {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('🔄 Loading SoundBridge logo from:', '/images/logo-trans-lockup.svg');
        
        // Load the SoundBridge logo SVG
        const response = await fetch('/images/logo-trans-lockup.svg');
        if (!response.ok) {
          throw new Error(`Failed to load logo: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        console.log('📁 Logo blob loaded:', { size: blob.size, type: blob.type });
        
        const file = new File([blob], "soundbridge-logo.svg", { type: blob.type });
        const parsedData = await parseLogoImage(file);
        
        if (parsedData?.imageData) {
          console.log('✅ Logo image data parsed successfully');
          setImageData(parsedData.imageData);
        } else {
          throw new Error('Failed to parse logo image - no image data returned');
        }
      } catch (err) {
        console.error("❌ Error loading SoundBridge logo:", err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    loadLogoImage();
  }, []);

  if (isLoading) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{
          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          ...style
        }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{
          background: 'rgba(220, 38, 38, 0.1)',
          borderRadius: '20px',
          border: '1px solid rgba(220, 38, 38, 0.3)',
          color: '#DC2626',
          ...style
        }}
      >
        <div className="text-center">
          <p className="text-sm">Failed to load metallic logo</p>
          <p className="text-xs opacity-75">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={className}
      style={{
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(26, 26, 26, 0.9) 100%)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        position: 'relative',
        ...style
      }}
    >
      <MetallicPaint 
        imageData={imageData ?? new ImageData(1, 1)} 
        params={params}
      />
    </div>
  );
};

export default SoundBridgeMetallicLogo;
