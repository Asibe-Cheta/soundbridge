import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style = {} }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-700 rounded ${className}`}
      style={{
        background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        ...style
      }}
    />
  );
}

export function CreatorProfileSkeleton() {
  return (
    <div className="main-container">
      {/* Hero Section Skeleton */}
      <section className="hero-section" style={{ height: 'auto', minHeight: '400px' }}>
        <div className="featured-creator" style={{ position: 'relative' }}>
          <div className="featured-creator-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
              {/* Profile Photo Skeleton */}
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Skeleton style={{ width: '60px', height: '60px', borderRadius: '50%' }} />
              </div>
              
              <div style={{ flex: 1 }}>
                {/* Name Skeleton */}
                <Skeleton style={{ width: '200px', height: '32px', marginBottom: '8px' }} />
                {/* Genre/Location Skeleton */}
                <Skeleton style={{ width: '150px', height: '20px', marginBottom: '16px' }} />
                {/* Stats Skeleton */}
                <div style={{ display: 'flex', gap: '2rem' }}>
                  <Skeleton style={{ width: '100px', height: '20px' }} />
                  <Skeleton style={{ width: '80px', height: '20px' }} />
                </div>
              </div>
            </div>
            
            {/* Action Buttons Skeleton */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Skeleton style={{ width: '100px', height: '40px', borderRadius: '25px' }} />
              <Skeleton style={{ width: '120px', height: '40px', borderRadius: '25px' }} />
              <Skeleton style={{ width: '100px', height: '40px', borderRadius: '25px' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Tab Navigation Skeleton */}
      <section className="section">
        <div className="tab-navigation">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} style={{ width: '100px', height: '40px', borderRadius: '10px' }} />
          ))}
        </div>

        {/* Tab Content Skeleton */}
        <div className="grid grid-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card">
              {/* Track Image Skeleton */}
              <div className="card-image" style={{ position: 'relative' }}>
                <Skeleton style={{ width: '100%', height: '150px', borderRadius: '12px' }} />
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(220, 38, 38, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1.2rem'
                }}>
                  ▶
                </div>
              </div>
              
              {/* Track Info Skeleton */}
              <Skeleton style={{ width: '80%', height: '16px', marginBottom: '4px' }} />
              <Skeleton style={{ width: '60%', height: '14px', marginBottom: '8px' }} />
              
              {/* Waveform Skeleton */}
              <div className="waveform" style={{ background: 'rgba(255, 255, 255, 0.1)' }} />
              
              {/* Track Stats Skeleton */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <Skeleton style={{ width: '40px', height: '12px' }} />
                <Skeleton style={{ width: '60px', height: '12px' }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="event-card">
      <div className="event-card-content">
        <Skeleton style={{ width: '80px', height: '14px', marginBottom: '8px' }} />
        <Skeleton style={{ width: '100%', height: '18px', marginBottom: '8px' }} />
        <Skeleton style={{ width: '70%', height: '14px', marginBottom: '8px' }} />
        <Skeleton style={{ width: '60px', height: '20px', borderRadius: '15px' }} />
      </div>
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
          <div style={{
            maxWidth: '70%',
            padding: '12px 16px',
            borderRadius: '18px',
            background: i % 2 === 0 ? 'rgba(220, 38, 38, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <Skeleton style={{ width: '200px', height: '16px', marginBottom: '4px' }} />
            <Skeleton style={{ width: '80px', height: '12px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Add shimmer animation to global styles
const shimmerStyles = `
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined') {
  const styleId = 'skeleton-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = shimmerStyles;
    document.head.appendChild(style);
  }
} 