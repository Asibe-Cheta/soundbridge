'use client';

import React, { useState } from 'react';
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
        style={{
          ...getPositionStyles(),
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          padding: '0.5rem 1rem',
          color: 'white',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          transition: 'all 0.3s ease',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(45deg, #DC2626, #EC4899)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
        }}
      >
        <ChevronUp size={14} color="white" />
        {title}
      </button>
    );
  }

  // Full card when visible
  return (
    <div
                    style={{
        ...getPositionStyles(),
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '12px',
        padding: '1rem',
        width: '280px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        transformOrigin: 'top',
        animation: isVisible ? 'slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : undefined,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: '600', margin: 0 }}>
          {title}
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div>
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