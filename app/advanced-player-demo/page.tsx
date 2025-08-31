'use client';

import React, { useState, useEffect } from 'react';
import { AdvancedAudioPlayer } from '../../src/components/audio/AdvancedAudioPlayer';
import { AudioTrack } from '../../src/lib/types/audio';
import { useAdvancedAudioPlayer } from '../../src/hooks/useAdvancedAudioPlayer';
import { 
  Music, 
  Sliders, 
  Zap, 
  BarChart3, 
  TrendingUp, 
  Type, 
  Settings,
  Play,
  Clock,
  User,
  Album
} from 'lucide-react';

export default function AdvancedPlayerDemoPage() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const [selectedTrack, setSelectedTrack] = useState<AudioTrack | null>(null);
  
  // Only initialize the hook when on client side
  const audioPlayerHook = isClient ? useAdvancedAudioPlayer() : null;
  const loadTrack = audioPlayerHook?.loadTrack || (() => Promise.resolve());

  // Enhanced mock data with audio analysis
  const mockTracks: AudioTrack[] = [
    {
      id: '1',
      title: 'Lagos Nights',
      artist: 'Kwame Asante',
      album: 'Afrobeats Vibes',
      duration: 225,
      artwork: '',
      url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
      liked: true,
      genre: 'Afrobeats',
      bpm: 128,
      key: 'C#',
      tags: ['afrobeats', 'african', 'dance'],
      releaseDate: '2024-01-15',
      isrc: 'USRC12345678',
      waveform: Array.from({ length: 100 }, () => Math.random()),
      spectralData: Array.from({ length: 128 }, () => Math.random() * 255),
      loudness: 0.75,
      energy: 0.85,
      danceability: 0.92,
      valence: 0.78,
      playCount: 1250,
      likesCount: 89,
      commentsCount: 23,
      sharesCount: 12,
      copyrightStatus: 'clear',
      copyrightScore: 0.95
    },
    {
      id: '2',
      title: 'Gospel Fusion',
      artist: 'Sarah Johnson',
      album: 'Spiritual Journey',
      duration: 252,
      artwork: '',
      url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
      liked: false,
      genre: 'Gospel',
      bpm: 90,
      key: 'G',
      tags: ['gospel', 'spiritual', 'worship'],
      releaseDate: '2024-02-20',
      isrc: 'USRC87654321',
      waveform: Array.from({ length: 100 }, () => Math.random()),
      spectralData: Array.from({ length: 128 }, () => Math.random() * 255),
      loudness: 0.68,
      energy: 0.72,
      danceability: 0.45,
      valence: 0.85,
      playCount: 890,
      likesCount: 67,
      commentsCount: 15,
      sharesCount: 8,
      copyrightStatus: 'clear',
      copyrightScore: 0.98
    },
    {
      id: '3',
      title: 'UK Drill Mix',
      artist: 'Tommy B',
      album: 'Underground Sounds',
      duration: 208,
      artwork: '',
      url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
      liked: true,
      genre: 'UK Drill',
      bpm: 140,
      key: 'F#',
      tags: ['uk drill', 'underground', 'hip hop'],
      releaseDate: '2024-03-10',
      isrc: 'USRC11223344',
      waveform: Array.from({ length: 100 }, () => Math.random()),
      spectralData: Array.from({ length: 128 }, () => Math.random() * 255),
      loudness: 0.82,
      energy: 0.91,
      danceability: 0.78,
      valence: 0.35,
      playCount: 2100,
      likesCount: 156,
      commentsCount: 42,
      sharesCount: 28,
      copyrightStatus: 'clear',
      copyrightScore: 0.92
    },
    {
      id: '4',
      title: 'Afro Fusion',
      artist: 'Michael Okafor',
      album: 'Modern African',
      duration: 235,
      artwork: '',
      url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
      liked: false,
      genre: 'Afro Fusion',
      bpm: 132,
      key: 'D',
      tags: ['afro fusion', 'modern', 'african'],
      releaseDate: '2024-01-30',
      isrc: 'USRC55667788',
      waveform: Array.from({ length: 100 }, () => Math.random()),
      spectralData: Array.from({ length: 128 }, () => Math.random() * 255),
      loudness: 0.71,
      energy: 0.88,
      danceability: 0.89,
      valence: 0.82,
      playCount: 1670,
      likesCount: 134,
      commentsCount: 31,
      sharesCount: 19,
      copyrightStatus: 'clear',
      copyrightScore: 0.96
    },
    {
      id: '5',
      title: 'Praise & Worship',
      artist: 'Grace Community',
      album: 'Worship Collection',
      duration: 270,
      artwork: '',
      url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
      liked: true,
      genre: 'Worship',
      bpm: 85,
      key: 'A',
      tags: ['worship', 'praise', 'christian'],
      releaseDate: '2024-02-15',
      isrc: 'USRC99887766',
      waveform: Array.from({ length: 100 }, () => Math.random()),
      spectralData: Array.from({ length: 128 }, () => Math.random() * 255),
      loudness: 0.65,
      energy: 0.68,
      danceability: 0.38,
      valence: 0.88,
      playCount: 980,
      likesCount: 78,
      commentsCount: 18,
      sharesCount: 11,
      copyrightStatus: 'clear',
      copyrightScore: 0.99
    },
    {
      id: '6',
      title: 'Lagos Anthem',
      artist: 'Wizkid Jr',
      album: 'Nigerian Vibes',
      duration: 195,
      artwork: '',
      url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
      liked: false,
      genre: 'Afrobeats',
      bpm: 130,
      key: 'E',
      tags: ['afrobeats', 'nigerian', 'anthem'],
      releaseDate: '2024-03-05',
      isrc: 'USRC44332211',
      waveform: Array.from({ length: 100 }, () => Math.random()),
      spectralData: Array.from({ length: 128 }, () => Math.random() * 255),
      loudness: 0.79,
      energy: 0.87,
      danceability: 0.94,
      valence: 0.76,
      playCount: 1850,
      likesCount: 145,
      commentsCount: 38,
      sharesCount: 25,
      copyrightStatus: 'clear',
      copyrightScore: 0.94
    }
  ];

  const handleTrackSelect = async (track: AudioTrack) => {
    try {
      setSelectedTrack(track);
      await loadTrack(track);
    } catch (error) {
      console.warn('Demo track loading failed (expected for demo data):', error);
      // This is expected behavior for demo data
    }
  };

  if (!isClient) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
      paddingBottom: '120px'
    }}>
      {/* Demo Header */}
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: 'white'
      }}>
        <h1 style={{ 
          fontSize: '3rem', 
          margin: '0 0 1rem 0',
          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Advanced Audio Player Demo
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          color: '#999',
          margin: '0 0 1rem 0'
        }}>
          Experience the next-generation audio player with advanced features
        </p>
        <div style={{
          background: 'rgba(255, 193, 7, 0.1)',
          border: '1px solid rgba(255, 193, 7, 0.3)',
          borderRadius: '8px',
          padding: '0.75rem',
          margin: '0 0 2rem 0',
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <p style={{ 
            fontSize: '0.9rem', 
            color: '#FFC107',
            margin: 0,
            textAlign: 'center'
          }}>
            <strong>Demo Note:</strong> This demo uses placeholder audio data. Console errors about failed track loading are expected and normal for demo purposes.
          </p>
        </div>
        
        {/* Feature Highlights */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          maxWidth: '1000px',
          margin: '0 auto 2rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Sliders size={20} color="#EC4899" />
              <h3 style={{ color: '#EC4899', margin: 0, fontSize: '1rem' }}>10-Band Equalizer</h3>
            </div>
            <p style={{ color: '#ccc', margin: 0, fontSize: '0.9rem' }}>
              Professional-grade equalizer with presets and custom settings
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Zap size={20} color="#EC4899" />
              <h3 style={{ color: '#EC4899', margin: 0, fontSize: '1rem' }}>Audio Effects</h3>
            </div>
            <p style={{ color: '#ccc', margin: 0, fontSize: '0.9rem' }}>
              Reverb, echo, compression, and distortion effects
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <BarChart3 size={20} color="#EC4899" />
              <h3 style={{ color: '#EC4899', margin: 0, fontSize: '1rem' }}>Real-time Visualization</h3>
            </div>
            <p style={{ color: '#ccc', margin: 0, fontSize: '0.9rem' }}>
              Waveform, spectrum, bars, and circular visualizations
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <TrendingUp size={20} color="#EC4899" />
              <h3 style={{ color: '#EC4899', margin: 0, fontSize: '1rem' }}>Advanced Analytics</h3>
            </div>
            <p style={{ color: '#ccc', margin: 0, fontSize: '0.9rem' }}>
              Detailed listening statistics and track analysis
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Type size={20} color="#EC4899" />
              <h3 style={{ color: '#EC4899', margin: 0, fontSize: '1rem' }}>Synchronized Lyrics</h3>
            </div>
            <p style={{ color: '#ccc', margin: 0, fontSize: '0.9rem' }}>
              Real-time lyrics display with translations
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Settings size={20} color="#EC4899" />
              <h3 style={{ color: '#EC4899', margin: 0, fontSize: '1rem' }}>Advanced Controls</h3>
            </div>
            <p style={{ color: '#ccc', margin: 0, fontSize: '0.9rem' }}>
              Playback speed, pitch shifting, and crossfade
            </p>
          </div>
        </div>

        {/* Track Selection */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '15px',
          padding: '2rem',
          maxWidth: '800px',
          margin: '0 auto',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ color: 'white', margin: '0 0 1.5rem 0', textAlign: 'center' }}>Select a Track to Test</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem'
          }}>
            {mockTracks.map((track) => (
              <div
                key={track.id}
                style={{
                  background: selectedTrack?.id === track.id 
                    ? 'rgba(220, 38, 38, 0.2)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  padding: '1rem',
                  border: selectedTrack?.id === track.id 
                    ? '1px solid rgba(220, 38, 38, 0.5)' 
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => handleTrackSelect(track)}
                onMouseEnter={(e) => {
                  if (selectedTrack?.id !== track.id) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTrack?.id !== track.id) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.2rem',
                    fontWeight: '600'
                  }}>
                    <Music size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: '600', fontSize: '1rem' }}>
                      {track.title}
                    </div>
                    <div style={{ color: '#999', fontSize: '0.9rem' }}>
                      {track.artist} • {track.album}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      {track.bpm && (
                        <span style={{ color: '#666', fontSize: '0.8rem' }}>BPM: {track.bpm}</span>
                      )}
                      {track.key && (
                        <span style={{ color: '#666', fontSize: '0.8rem' }}>Key: {track.key}</span>
                      )}
                      <span style={{ color: '#666', fontSize: '0.8rem' }}>
                        {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Track Info */}
        {selectedTrack && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '15px',
            padding: '2rem',
            maxWidth: '600px',
            margin: '2rem auto 0',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 1rem 0' }}>Currently Playing</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.5rem',
                fontWeight: '600'
              }}>
                <Music size={32} />
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: '600', fontSize: '1.1rem' }}>
                  {selectedTrack.title}
                </div>
                <div style={{ color: '#999', fontSize: '0.9rem' }}>
                  {selectedTrack.artist} • {selectedTrack.album}
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  {selectedTrack.bpm && (
                    <span style={{ color: '#666', fontSize: '0.8rem' }}>BPM: {selectedTrack.bpm}</span>
                  )}
                  {selectedTrack.key && (
                    <span style={{ color: '#666', fontSize: '0.8rem' }}>Key: {selectedTrack.key}</span>
                  )}
                  {selectedTrack.energy !== undefined && (
                    <span style={{ color: '#666', fontSize: '0.8rem' }}>
                      Energy: {Math.round(selectedTrack.energy * 100)}%
                    </span>
                  )}
                  {selectedTrack.danceability !== undefined && (
                    <span style={{ color: '#666', fontSize: '0.8rem' }}>
                      Dance: {Math.round(selectedTrack.danceability * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Audio Player */}
      <AdvancedAudioPlayer
        showMiniPlayer={true}
        showFullscreenButton={true}
        showEqualizer={true}
        showEffects={true}
        showLyrics={true}
        showWaveform={true}
        showSpectrum={true}
      />
    </div>
  );
}
