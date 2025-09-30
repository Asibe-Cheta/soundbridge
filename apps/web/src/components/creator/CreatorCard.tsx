'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Users, Music, Calendar } from 'lucide-react';

interface CreatorCardProps {
  creator: {
    id: string;
    username: string;
    display_name: string;
    bio?: string;
    avatar_url?: string;
    location?: string;
    country?: string;
    followers_count?: number;
    tracks_count?: number;
    events_count?: number;
    total_plays?: number;
    hot_score?: number;
  };
  variant?: 'home' | 'creators' | 'discover';
  isMobile?: boolean;
  onClick?: () => void;
}

export const CreatorCard: React.FC<CreatorCardProps> = ({ 
  creator, 
  variant = 'home', 
  isMobile = false,
  onClick 
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Use username if available, otherwise fall back to ID
      const creatorIdentifier = creator.username || creator.id;
      console.log('🔥 Navigating to creator:', creatorIdentifier, 'username:', creator.username, 'id:', creator.id);
      window.location.href = `/creator/${creatorIdentifier}`;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatNumber = (num: number | undefined) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (variant === 'home') {
    return (
      <div 
        className="creator-card-home"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '16px',
          width: isMobile ? '200px' : 'auto',
          minWidth: isMobile ? '200px' : 'auto',
          flexShrink: isMobile ? '0' : '1',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={handleClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
          e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }}
      >
        {/* Hot Score Badge */}
        {creator.hot_score && creator.hot_score > 0 && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'linear-gradient(45deg, #DC2626, #EC4899)',
            color: 'white',
            padding: '0.25rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.7rem',
            fontWeight: '600',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            zIndex: 2
          }}>
            {Math.round(creator.hot_score)} hot
          </div>
        )}

        {/* Avatar */}
        <div style={{ 
          position: 'relative', 
          marginBottom: '12px',
          width: '100%',
          height: isMobile ? '120px' : '160px',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          {creator.avatar_url ? (
            <Image
              src={creator.avatar_url}
              alt={creator.display_name}
              width={200}
              height={200}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover' 
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: isMobile ? '1.5rem' : '2rem',
              fontWeight: '600'
            }}>
              {getInitials(creator.display_name)}
            </div>
          )}
          
          {/* Play Button Overlay */}
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '32px',
            height: '32px',
            background: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(10px)'
          }}>
            <Play size={16} color="white" />
          </div>
        </div>

        {/* Creator Info */}
        <div>
          <h3 style={{
            color: 'var(--text-primary)',
            fontSize: isMobile ? '0.9rem' : '1rem',
            fontWeight: '600',
            margin: '0 0 4px 0',
            lineHeight: '1.2',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {creator.display_name}
          </h3>
          
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: isMobile ? '0.8rem' : '0.9rem',
            margin: '0 0 8px 0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {creator.location || 'Location not set'}
          </p>

          {/* Stats */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: isMobile ? '0.75rem' : '0.8rem',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users size={12} />
              <span>{formatNumber(creator.followers_count)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Music size={12} />
              <span>{formatNumber(creator.tracks_count)}</span>
            </div>
            {creator.events_count && creator.events_count > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} />
                <span>{formatNumber(creator.events_count)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'creators') {
    return (
      <div 
        className="creator-card-creators"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={handleClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
          e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }}
      >
        {/* Avatar */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '12px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            {creator.avatar_url ? (
              <Image
                src={creator.avatar_url}
                alt={creator.display_name}
                width={48}
                height={48}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover' 
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: '600'
              }}>
                {getInitials(creator.display_name)}
              </div>
            )}
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontWeight: '600',
              margin: '0 0 4px 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {creator.display_name}
            </h3>
            
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              margin: '0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {creator.location || 'Location not set'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={12} />
            <span>{formatNumber(creator.followers_count)} followers</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Music size={12} />
            <span>{formatNumber(creator.tracks_count)} tracks</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <button 
            style={{
              flex: 1,
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Follow
          </button>
          
          <Link href={`/creator/${creator.username}`} style={{ textDecoration: 'none', flex: 1 }}>
            <button 
              style={{
                width: '100%',
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                border: 'none',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              View
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // Default variant (discover)
  return (
    <Link href={`/creator/${creator.username}`} style={{ textDecoration: 'none' }}>
      <div 
        className="creator-card-discover"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
          e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }}
      >
        {/* Avatar */}
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          {creator.avatar_url ? (
            <Image
              src={creator.avatar_url}
              alt={creator.display_name}
              width={60}
              height={60}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover' 
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: '600'
            }}>
              {getInitials(creator.display_name)}
            </div>
          )}
        </div>

        {/* Creator Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            color: 'var(--text-primary)',
            fontSize: '1rem',
            fontWeight: '600',
            margin: '0 0 4px 0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {creator.display_name}
          </h3>
          
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            margin: '0 0 8px 0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {creator.location || 'Location not set'}
          </p>

          {/* Stats */}
          <div style={{
            display: 'flex',
            gap: '12px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)'
          }}>
            <span>{formatNumber(creator.followers_count)} followers</span>
            <span>{formatNumber(creator.tracks_count)} tracks</span>
          </div>
        </div>

        {/* Play Button */}
        <div style={{
          width: '32px',
          height: '32px',
          background: 'rgba(236, 72, 153, 0.2)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}>
          <Play size={16} color="#EC4899" />
        </div>
      </div>
    </Link>
  );
};
