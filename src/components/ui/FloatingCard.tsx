'use client';

import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface FloatingCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  defaultVisible?: boolean;
}

export function FloatingCard({ title, children, className = '', defaultVisible = true }: FloatingCardProps) {
  const [isVisible, setIsVisible] = useState(defaultVisible);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isVisible) {
    return (
      <div 
        className={`floating-card-toggle ${className}`}
        style={{
          position: 'fixed',
          top: '400px',
          right: '20px',
          zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '0.75rem',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#EC4899',
          fontSize: '0.9rem',
          fontWeight: '500'
        }}
        onClick={() => setIsVisible(true)}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)'}
      >
        <ChevronUp size={16} />
        Show {title}
      </div>
    );
  }

  return (
    <aside 
      className="sidebar" 
      style={{ 
        position: 'fixed',
        top: '400px',
        right: '20px',
        zIndex: 1000,
        width: '280px',
        maxWidth: '320px'
      }}
    >
      {/* Header with controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1rem' 
      }}>
        <h3 style={{ margin: 0, color: '#EC4899' }}>{title}</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#EC4899'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && children}
    </aside>
  );
} 