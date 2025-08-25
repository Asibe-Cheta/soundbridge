'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AudioVisualization } from '../../lib/types/audio';

interface AudioVisualizerProps {
  config: AudioVisualization;
  data: number[];
  height?: number;
  className?: string;
}

export function AudioVisualizer({ 
  config, 
  data, 
  height = 60, 
  className = '' 
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const processedData = useMemo(() => {
    if (!data.length) return [];
    
    // Normalize data to 0-1 range
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;
    
    return data.map(value => 
      range > 0 ? (value - min) / range : 0.5
    );
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const { width, height: canvasHeight } = canvas;
      ctx.clearRect(0, 0, width, canvasHeight);

      if (!processedData.length) return;

      const barWidth = width / processedData.length;
      const centerY = canvasHeight / 2;

      switch (config.type) {
        case 'waveform':
          drawWaveform(ctx, width, canvasHeight, processedData);
          break;
        case 'spectrum':
          drawSpectrum(ctx, width, canvasHeight, processedData);
          break;
        case 'bars':
          drawBars(ctx, width, canvasHeight, processedData, barWidth);
          break;
        case 'circles':
          drawCircles(ctx, width, canvasHeight, processedData);
          break;
      }
    };

    const animate = () => {
      draw();
      if (config.animation) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (config.animation) {
      animate();
    } else {
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [config, processedData, height]);

  const drawWaveform = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    data: number[]
  ) => {
    ctx.strokeStyle = config.colors[0] || '#DC2626';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const step = width / data.length;
    data.forEach((value, index) => {
      const x = index * step;
      const y = (value * height * 0.8) + (height * 0.1);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  };

  const drawSpectrum = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    data: number[]
  ) => {
    const barWidth = width / data.length;
    const maxBarHeight = height * 0.8;

    data.forEach((value, index) => {
      const barHeight = value * maxBarHeight;
      const x = index * barWidth;
      const y = height - barHeight;

      // Create gradient
      const gradient = ctx.createLinearGradient(x, y, x, height);
      gradient.addColorStop(0, config.colors[0] || '#DC2626');
      gradient.addColorStop(1, config.colors[1] || '#EC4899');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
  };

  const drawBars = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    data: number[], 
    barWidth: number
  ) => {
    const maxBarHeight = height * 0.8;
    const centerY = height / 2;

    data.forEach((value, index) => {
      const barHeight = value * maxBarHeight;
      const x = index * barWidth;
      const y = centerY - barHeight / 2;

      // Create gradient
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, config.colors[0] || '#DC2626');
      gradient.addColorStop(0.5, config.colors[1] || '#EC4899');
      gradient.addColorStop(1, config.colors[2] || '#8B5CF6');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
  };

  const drawCircles = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    data: number[]
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.4;

    data.forEach((value, index) => {
      const angle = (index / data.length) * 2 * Math.PI;
      const radius = value * maxRadius;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      // Create radial gradient
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 4);
      gradient.addColorStop(0, config.colors[0] || '#DC2626');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  return (
    <div className={`audio-visualizer ${className}`}>
      <canvas
        ref={canvasRef}
        width={300}
        height={height}
        className="w-full h-full rounded-lg"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)'
        }}
      />
      
      <style jsx>{`
        .audio-visualizer {
          position: relative;
          overflow: hidden;
        }
        
        .audio-visualizer canvas {
          display: block;
        }
      `}</style>
    </div>
  );
}
