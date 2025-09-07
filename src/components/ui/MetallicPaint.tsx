'use client';

import React, { useRef, useEffect, useState } from 'react';

interface MetallicPaintProps {
  imageData: ImageData;
  params?: {
    edge?: number;
    patternBlur?: number;
    patternScale?: number;
    refraction?: number;
    speed?: number;
    liquid?: number;
  };
}

export const parseLogoImage = async (file: File): Promise<{ imageData: ImageData } | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      resolve(null);
      return;
    }

    img.onload = () => {
      // Set a reasonable size for the canvas
      const maxSize = 512;
      let { width, height } = img;
      
      // Scale down if too large
      if (width > maxSize || height > maxSize) {
        const scale = maxSize / Math.max(width, height);
        width *= scale;
        height *= scale;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Clear canvas with transparent background
      ctx.clearRect(0, 0, width, height);
      
      // Draw the image
      ctx.drawImage(img, 0, 0, width, height);
      
      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        console.log('✅ Successfully parsed logo image:', { width, height });
        resolve({ imageData });
      } catch (error) {
        console.error('Error parsing image:', error);
        resolve(null);
      }
    };

    img.onerror = (error) => {
      console.error('Error loading image:', error);
      resolve(null);
    };

    // Handle both File objects and URL strings
    if (file instanceof File) {
      img.src = URL.createObjectURL(file);
    } else {
      img.src = file;
    }
  });
};

export default function MetallicPaint({ 
  imageData, 
  params = {
    edge: 2,
    patternBlur: 0.005,
    patternScale: 2,
    refraction: 0.015,
    speed: 0.3,
    liquid: 0.07
  }
}: MetallicPaintProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Metallic paint shader effect
    const animate = () => {
      timeRef.current += params.speed;
      
      const { width, height } = canvas;
      const image = ctx.createImageData(width, height);
      const data = image.data;
      
      // Create metallic pattern
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          
          // Sample from original image data
          const imgX = Math.floor((x / width) * imageData.width);
          const imgY = Math.floor((y / height) * imageData.height);
          const imgI = (imgY * imageData.width + imgX) * 4;
          
          const alpha = imageData.data[imgI + 3];
          
          if (alpha > 0) {
            // Create metallic effect
            const noise = Math.sin(x * params.patternScale + timeRef.current) * 
                         Math.cos(y * params.patternScale + timeRef.current * 0.7);
            
            const refraction = Math.sin(x * params.refraction + timeRef.current * 0.5) * 
                              Math.cos(y * params.refraction + timeRef.current * 0.3);
            
            const liquid = Math.sin(x * params.liquid + timeRef.current * 1.2) * 
                          Math.cos(y * params.liquid + timeRef.current * 0.8);
            
            const metallic = (noise + refraction + liquid) * 0.5 + 0.5;
            
            // Create iridescent colors
            const hue = (metallic * 360 + timeRef.current * 10) % 360;
            const saturation = 0.8;
            const lightness = 0.6 + metallic * 0.3;
            
            // Convert HSL to RGB
            const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
            const x_val = c * (1 - Math.abs((hue / 60) % 2 - 1));
            const m = lightness - c / 2;
            
            let r, g, b;
            if (hue < 60) {
              r = c; g = x_val; b = 0;
            } else if (hue < 120) {
              r = x_val; g = c; b = 0;
            } else if (hue < 180) {
              r = 0; g = c; b = x_val;
            } else if (hue < 240) {
              r = 0; g = x_val; b = c;
            } else if (hue < 300) {
              r = x_val; g = 0; b = c;
            } else {
              r = c; g = 0; b = x_val;
            }
            
            data[i] = (r + m) * 255;     // R
            data[i + 1] = (g + m) * 255; // G
            data[i + 2] = (b + m) * 255; // B
            data[i + 3] = alpha;         // A
          } else {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
            data[i + 3] = 0;
          }
        }
      }
      
      ctx.putImageData(image, 0, 0);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [imageData, params]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block'
      }}
    />
  );
}
