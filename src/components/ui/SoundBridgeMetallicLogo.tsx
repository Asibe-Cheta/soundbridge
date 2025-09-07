'use client';

import React, { useState, useEffect } from 'react';
import MetallicPaint, { parseLogoImage } from '../../../components/MetallicPaint';
// Import the SVG file directly


// Default shader parameters
const defaultParams = {
  patternScale: 2,
  refraction: 0.015,
  edge: 1,
  patternBlur: 0.005,
  liquid: 0.07,
  speed: 0.3
};

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
        
        console.log('🔄 Loading SoundBridge logo from public path');
        
        // Follow React Bits pattern exactly - fetch the imported logo
        const response = await fetch('/images/logos/soundbridge-logo-main.svg');
        if (!response.ok) {
          throw new Error(`Failed to load logo: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        console.log('📁 Logo blob loaded:', { size: blob.size, type: blob.type });
        
        const file = new File([blob], "soundbridge-logo.svg", { type: blob.type });
        
        try {
          const parsedData = await parseLogoImage(file);
          
          if (parsedData?.imageData) {
            console.log('✅ Logo image data parsed successfully');
            setImageData(parsedData.imageData);
          } else {
            throw new Error('Failed to parse logo image - no image data returned');
          }
        } catch (parseError) {
          console.error('❌ SVG parsing failed, creating fallback image data:', parseError);
          
          // Create a simple fallback image data for testing
          const canvas = document.createElement('canvas');
          canvas.width = 1000;
          canvas.height = 1000;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            // Create a simple gradient background
            const gradient = ctx.createLinearGradient(0, 0, 1000, 1000);
            gradient.addColorStop(0, '#DC2626');
            gradient.addColorStop(1, '#EC4899');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 1000, 1000);
            
            // Add some text
            ctx.fillStyle = 'white';
            ctx.font = 'bold 120px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('SB', 500, 500);
            
            const fallbackImageData = ctx.getImageData(0, 0, 1000, 1000);
            console.log('✅ Fallback image data created');
            setImageData(fallbackImageData);
          } else {
            throw new Error('Failed to create fallback image data');
          }
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

  // Only render MetallicPaint when we have valid imageData
  if (!imageData) {
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
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-sm opacity-75">Loading metallic effect...</div>
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
        imageData={imageData} 
        params={{ ...defaultParams, ...params }}
      />
    </div>
  );
};

export default SoundBridgeMetallicLogo;
