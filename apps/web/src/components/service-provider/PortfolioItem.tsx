'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Briefcase, Play, ExternalLink } from 'lucide-react';

interface PortfolioItemProps {
  item: {
    id: string;
    media_url: string;
    thumbnail_url?: string | null;
    caption?: string | null;
    created_at: string;
  };
  formatRelativeDate: (date: string) => string;
}

// Helper function to detect and convert video URLs to embed URLs
function getVideoEmbedUrl(url: string): { embedUrl: string | null; isVideo: boolean; platform: 'youtube' | 'vimeo' | null } {
  // YouTube patterns
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  
  if (youtubeMatch) {
    return {
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
      isVideo: true,
      platform: 'youtube'
    };
  }
  
  // Vimeo patterns
  const vimeoRegex = /(?:vimeo\.com\/)(?:.*\/)?(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  
  if (vimeoMatch) {
    return {
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      isVideo: true,
      platform: 'vimeo'
    };
  }
  
  return {
    embedUrl: null,
    isVideo: false,
    platform: null
  };
}

export function PortfolioItem({ item, formatRelativeDate }: PortfolioItemProps) {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const videoInfo = getVideoEmbedUrl(item.media_url);
  const isVideo = videoInfo.isVideo;

  if (isVideo && videoInfo.embedUrl) {
    return (
      <>
        <div
          style={{
            borderRadius: '1rem',
            border: '1px solid var(--border-primary)',
            overflow: 'hidden',
            background: 'var(--bg-secondary)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          onClick={() => setIsVideoModalOpen(true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.borderColor = 'var(--primary-red)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = 'var(--border-primary)';
          }}
        >
          {/* Video thumbnail with play button overlay */}
          <div style={{ position: 'relative', height: '220px', background: 'linear-gradient(135deg, rgba(236,72,153,0.4), rgba(220,38,38,0.4))' }}>
            {item.thumbnail_url ? (
              <Image
                src={item.thumbnail_url}
                alt={item.caption ?? 'Video portfolio item'}
                width={400}
                height={280}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                }}
              >
                <Briefcase size={32} />
              </div>
            )}
            {/* Play button overlay */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <Play size={32} style={{ color: 'white', marginLeft: '4px' }} fill="white" />
            </div>
          </div>
          <div style={{ padding: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <p style={{ color: 'white', fontSize: '0.95rem', margin: 0, fontWeight: 600 }}>
                {item.caption || 'Video Portfolio Item'}
              </p>
              <Play size={14} style={{ color: '#9ca3af' }} />
            </div>
            <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>
              Added {formatRelativeDate(item.created_at)}
            </p>
          </div>
        </div>

        {/* Video Modal */}
        {isVideoModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '2rem',
            }}
            onClick={() => setIsVideoModalOpen(false)}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '1200px',
                maxHeight: '90vh',
                background: 'var(--bg-secondary)',
                borderRadius: '1rem',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsVideoModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  zIndex: 10000,
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.7)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                }}
              >
                ×
              </button>
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                <iframe
                  src={videoInfo.embedUrl}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              {item.caption && (
                <div style={{ padding: '1.5rem' }}>
                  <p style={{ color: 'white', fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>
                    {item.caption}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // Regular image/link portfolio item
  return (
    <a
      href={item.media_url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        textDecoration: 'none',
        borderRadius: '1rem',
        border: '1px solid var(--border-primary)',
        overflow: 'hidden',
        background: 'var(--bg-secondary)',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.borderColor = 'var(--primary-red)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.borderColor = 'var(--border-primary)';
      }}
    >
      {item.thumbnail_url ? (
        <Image
          src={item.thumbnail_url}
          alt={item.caption ?? 'Portfolio item'}
          width={400}
          height={280}
          style={{ width: '100%', height: '220px', objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            height: '220px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(236,72,153,0.4), rgba(220,38,38,0.4))',
            color: 'white',
          }}
        >
          <Briefcase size={32} />
        </div>
      )}
      <div style={{ padding: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <p style={{ color: 'white', fontSize: '0.95rem', margin: 0, fontWeight: 600 }}>
            {item.caption || 'Portfolio item'}
          </p>
          <ExternalLink size={14} style={{ color: '#9ca3af' }} />
        </div>
        <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>
          Added {formatRelativeDate(item.created_at)}
        </p>
      </div>
    </a>
  );
}

