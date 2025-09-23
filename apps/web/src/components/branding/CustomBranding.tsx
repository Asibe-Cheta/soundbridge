'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { brandingService } from '../../lib/branding-service';
import type { CustomBranding } from '../../lib/types/branding';

interface CustomBrandingProps {
  userId: string;
  children: React.ReactNode;
  className?: string;
}

export function CustomBranding({ userId, children, className = '' }: CustomBrandingProps) {
  const [branding, setBranding] = useState<CustomBranding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBranding();
  }, [userId]);

  const loadBranding = async () => {
    try {
      const brandingData = await brandingService.getUserBranding(userId);
      setBranding(brandingData);
    } catch (error) {
      console.error('Error loading branding:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={className}>{children}</div>;
  }

  if (!branding) {
    return <div className={className}>{children}</div>;
  }

  // Apply custom styling based on branding
  const customStyles: React.CSSProperties = {
    '--brand-primary': branding.primary_color,
    '--brand-secondary': branding.secondary_color,
    '--brand-accent': branding.accent_color,
  } as React.CSSProperties;

  const backgroundClass = branding.background_gradient 
    ? `bg-gradient-to-br ${branding.background_gradient}` 
    : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900';

  return (
    <div 
      className={`${backgroundClass} ${className}`}
      style={customStyles}
    >
      {/* Custom Logo */}
      {branding.custom_logo_url && (
        <div 
          className={`absolute z-10 ${getLogoPositionClass(branding.custom_logo_position)}`}
          style={{
            width: branding.custom_logo_width,
            height: branding.custom_logo_height,
          }}
        >
          <Image
            src={branding.custom_logo_url}
            alt="Custom Logo"
            width={branding.custom_logo_width}
            height={branding.custom_logo_height}
            className="object-contain"
          />
        </div>
      )}

      {/* Watermark */}
      {branding.watermark_enabled && (
        <div 
          className={`absolute z-0 pointer-events-none ${getWatermarkPositionClass(branding.watermark_position)}`}
          style={{ opacity: branding.watermark_opacity }}
        >
          <Image
            src="/images/logos/logo-white-lockup.png"
            alt="SoundBridge"
            width={120}
            height={32}
            className="object-contain"
          />
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-20">
        {children}
      </div>

      {/* Powered by SoundBridge Footer */}
      {branding.show_powered_by && (
        <div className="relative z-10 mt-8 pt-4 border-t border-gray-700">
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Powered by{' '}
              <a 
                href="https://soundbridge.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white hover:text-gray-300 transition-colors"
              >
                SoundBridge
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function getLogoPositionClass(position: string): string {
  switch (position) {
    case 'top-left':
      return 'top-4 left-4';
    case 'top-right':
      return 'top-4 right-4';
    case 'bottom-left':
      return 'bottom-4 left-4';
    case 'bottom-right':
      return 'bottom-4 right-4';
    case 'center':
      return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
    default:
      return 'top-4 left-4';
  }
}

function getWatermarkPositionClass(position: string): string {
  switch (position) {
    case 'top-left':
      return 'top-4 left-4';
    case 'top-right':
      return 'top-4 right-4';
    case 'bottom-left':
      return 'bottom-4 left-4';
    case 'bottom-right':
      return 'bottom-4 right-4';
    case 'center':
      return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
    default:
      return 'bottom-4 right-4';
  }
}
