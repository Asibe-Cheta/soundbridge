'use client';

import React from 'react';
import { Play, Users, MessageCircle } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="hero-section mb-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[400px]">
        {/* Featured Creator */}
        <div className="lg:col-span-2 relative rounded-2xl overflow-hidden">
          <div 
            className="absolute inset-0 bg-gradient-to-br from-primary-red/80 to-accent-pink/60"
            style={{
              backgroundImage: `url('https://picsum.photos/800/400?random=hero')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          
          <div className="relative z-10 h-full flex flex-col justify-end p-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
              Featured Creator: Kwame Asante
            </h2>
            <p className="text-lg text-white/80 mb-4">
              Afrobeats sensation taking UK by storm
            </p>
            
            {/* Waveform Animation */}
            <div className="waveform mb-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="waveform-bar" />
              ))}
            </div>
            
            <div className="flex flex-wrap gap-4">
              <button className="btn-primary flex items-center gap-2">
                <Play className="w-4 h-4" />
                Play Latest
              </button>
              <button className="btn-secondary flex items-center gap-2">
                <Users className="w-4 h-4" />
                Follow
              </button>
              <button className="btn-secondary flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Message
              </button>
            </div>
          </div>
        </div>

        {/* Trending Panel */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-xl font-bold text-accent-pink mb-6">Trending Now</h3>
          
          <div className="space-y-4">
            {/* Trending Item 1 */}
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-white/60 text-xs">🎵</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm line-clamp-1">Gospel Fusion</div>
                <div className="text-white/60 text-xs">Ada Grace</div>
              </div>
              <button className="text-primary-red hover:text-accent-pink transition-colors">
                <Play className="w-5 h-5" />
              </button>
            </div>

            {/* Trending Item 2 */}
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-white/60 text-xs">🎵</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm line-clamp-1">Lagos Nights</div>
                <div className="text-white/60 text-xs">DJ Emeka</div>
              </div>
              <button className="text-primary-red hover:text-accent-pink transition-colors">
                <Play className="w-5 h-5" />
              </button>
            </div>

            {/* Trending Item 3 */}
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-white/60 text-xs">🎵</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm line-clamp-1">UK Drill Mix</div>
                <div className="text-white/60 text-xs">Tommy B</div>
              </div>
              <button className="text-primary-red hover:text-accent-pink transition-colors">
                <Play className="w-5 h-5" />
              </button>
            </div>

            {/* Trending Item 4 */}
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-white/60 text-xs">🎵</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm line-clamp-1">Praise Medley</div>
                <div className="text-white/60 text-xs">Grace Community</div>
              </div>
              <button className="text-primary-red hover:text-accent-pink transition-colors">
                <Play className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 