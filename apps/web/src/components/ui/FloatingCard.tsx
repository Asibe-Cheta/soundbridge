'use client';

import React, { useState } from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';
import { ChevronUp, ChevronDown, X } from 'lucide-react';

interface FloatingCardProps {
  title: string;
  children: React.ReactNode;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  defaultVisible?: boolean;
}

export function FloatingCard({ 
  title, 
  children, 
  position = 'top-right',
  defaultVisible = false 
}: FloatingCardProps) {
  const [isVisible, setIsVisible] = useState(defaultVisible);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme } = useTheme();

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 1000,
    };

    switch (position) {
      case 'top-right':
        return { ...baseStyles, top: '140px', right: '20px' };
      case 'bottom-right':
        return { ...baseStyles, bottom: '20px', right: '20px' };
      case 'top-left':
        return { ...baseStyles, top: '140px', left: '20px' };
      case 'bottom-left':
        return { ...baseStyles, bottom: '20px', left: '20px' };
      default:
        return { ...baseStyles, top: '140px', right: '20px' };
    }
  };

  // Toggle button when card is not visible
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className={`fixed z-[1000] rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-semibold transition-all shadow-lg ${
          theme === 'dark'
            ? 'bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-gradient-to-r hover:from-red-600 hover:to-pink-500'
            : 'bg-gray-800/90 backdrop-blur-lg border border-gray-300 text-white hover:bg-gray-900'
        }`}
        style={getPositionStyles()}
      >
        <ChevronUp size={14} color="white" />
        {title}
      </button>
    );
  }

  // Full card when visible
  return (
    <div
      className={`fixed z-[1000] rounded-xl p-4 w-[280px] max-h-[500px] shadow-lg transition-all ${
        theme === 'dark'
          ? 'bg-white/10 backdrop-blur-lg border border-white/20'
          : 'bg-white/95 backdrop-blur-lg border border-gray-200 shadow-xl'
      }`}
      style={getPositionStyles()}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-base font-semibold m-0 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          {title}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1 rounded border-none cursor-pointer flex items-center justify-center transition-colors ${
              theme === 'dark'
                ? 'text-white hover:bg-white/10'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className={`p-1 rounded border-none cursor-pointer flex items-center justify-center transition-colors ${
              theme === 'dark'
                ? 'text-white hover:bg-white/10'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div style={{ overflow: 'hidden' }}>
          {children}
        </div>
      )}
      
      {/* CSS Animation */}
      <style jsx>{`
        @keyframes slideDown {
          0% {
            opacity: 0;
            transform: translateY(-10px) scale(0.98);
          }
          50% {
            opacity: 0.7;
            transform: translateY(2px) scale(0.99);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}