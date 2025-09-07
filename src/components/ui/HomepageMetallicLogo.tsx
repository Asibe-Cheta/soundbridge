'use client';

import React, { useState, useEffect } from 'react';
import MetallicPaint, { parseLogoImage } from '../../../components/MetallicPaint';


interface HomepageMetallicLogoProps {
  className?: string;
  style?: React.CSSProperties;
}

const HomepageMetallicLogo: React.FC<HomepageMetallicLogoProps> = ({ 
  className = '', 
  style = {}
}) => {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadLogoImage() {
      try {
        setIsLoading(true);
        console.log('🔄 Loading SoundBridge logo from:', '/images/logos/soundbridge-logo-main.svg');
        
        // Follow React Bits pattern exactly - fetch the imported logo
        const response = await fetch('/images/logos/soundbridge-logo-main.svg');
        const blob = await response.blob();
        const file = new File([blob], "soundbridge-logo.svg", { type: blob.type });
        
        console.log('📁 Logo blob loaded:', { size: blob.size, type: blob.type });
        
        const parsedData = await parseLogoImage(file);
        console.log('✅ Logo parsed successfully:', parsedData);
        
        setImageData(parsedData?.imageData ?? null);
      } catch (err) {
        console.error("❌ Error loading SoundBridge logo:", err);
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
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          ...style
        }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div 
      className={className}
      style={{
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.6) 0%, rgba(26, 26, 26, 0.8) 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        position: 'relative',
        ...style
      }}
    >
      <MetallicPaint 
        imageData={imageData ?? new ImageData(1, 1)} 
        params={{
          edge: 1.5,
          patternBlur: 0.003,
          patternScale: 1.5,
          refraction: 0.01,
          speed: 0.2,
          liquid: 0.05
        }}
      />
    </div>
  );
};

export default HomepageMetallicLogo;
