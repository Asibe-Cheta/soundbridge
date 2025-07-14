'use client';

import React from 'react';
import { Play, Users, Calendar, MapPin } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CardProps } from '../../lib/types';

export function Card({ 
  title, 
  subtitle, 
  image, 
  type, 
  onClick,
  data 
}: CardProps) {
  const getIcon = () => {
    switch (type) {
      case 'music':
        return <Play className="w-4 h-4" />;
      case 'creator':
        return <Users className="w-4 h-4" />;
      case 'event':
        return <Calendar className="w-4 h-4" />;
      case 'podcast':
        return <Play className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getSubtitle = () => {
    if (subtitle) return subtitle;
    
    if (type === 'event' && data && 'event_date' in data) {
      return new Date(data.event_date).toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    
    if (type === 'music' && data && 'play_count' in data) {
      return `${data.play_count.toLocaleString()} plays`;
    }
    
    return '';
  };

  return (
    <div 
      className={cn(
        "group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6",
        "hover:bg-white/10 hover:border-white/20 hover:-translate-y-2",
        "transition-all duration-300 cursor-pointer",
        "overflow-hidden"
      )}
      onClick={onClick}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-red/10 to-accent-pink/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Image */}
        {image && (
          <div className="relative mb-4 aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
            <img 
              src={image} 
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // Fallback to a placeholder if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            {/* Fallback placeholder */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 hidden">
              <div className="text-white/50 text-4xl">
                {type === 'music' || type === 'podcast' ? '🎵' : type === 'creator' ? '👤' : '🎪'}
              </div>
            </div>
            {/* Play button overlay for music/podcast */}
            {(type === 'music' || type === 'podcast') && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                  {getIcon()}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Text content */}
        <div className="space-y-2">
          <h3 className="font-semibold text-white text-lg line-clamp-2 group-hover:text-white/90 transition-colors">
            {title}
          </h3>
          
          {getSubtitle() && (
            <p className="text-white/60 text-sm line-clamp-1">
              {getSubtitle()}
            </p>
          )}
          
          {/* Type indicator */}
          <div className="flex items-center gap-2 text-xs text-white/40">
            {getIcon()}
            <span className="capitalize">{type}</span>
          </div>
        </div>
      </div>
    </div>
  );
} 