'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import type { UploadFile, AudioMetadata } from '../../lib/types/upload';

interface AudioPreviewProps {
  uploadFile: UploadFile;
  onMetadataExtracted?: (metadata: AudioMetadata) => void;
}

export function AudioPreview({ uploadFile, onMetadataExtracted }: AudioPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (uploadFile.file) {
      extractMetadata();
      generateWaveform();
    }
  }, [uploadFile.file]);

  const extractMetadata = async () => {
    try {
      const audio = new Audio();
      const url = URL.createObjectURL(uploadFile.file);

      audio.addEventListener('loadedmetadata', () => {
        const audioMetadata: AudioMetadata = {
          duration: audio.duration,
          bitrate: Math.round((uploadFile.file.size * 8) / audio.duration), // rough estimate
          format: uploadFile.file.type,
          size: uploadFile.file.size
        };

        setMetadata(audioMetadata);
        setDuration(audio.duration);

        if (onMetadataExtracted) {
          onMetadataExtracted(audioMetadata);
        }

        URL.revokeObjectURL(url);
      });

      audio.src = url;
    } catch (error) {
      console.error('Error extracting audio metadata:', error);
    }
  };

  const generateWaveform = async () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await uploadFile.file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const channelData = audioBuffer.getChannelData(0);
      const samples = 100; // Number of waveform points
      const blockSize = Math.floor(channelData.length / samples);
      const waveformData: number[] = [];

      for (let i = 0; i < samples; i++) {
        const start = blockSize * i;
        let sum = 0;

        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[start + j]);
        }

        waveformData.push(sum / blockSize);
      }

      setWaveform(waveformData);
      drawWaveform(waveformData);
    } catch (error) {
      console.error('Error generating waveform:', error);
    }
  };

  const drawWaveform = (waveformData: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / waveformData.length;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#EC4899';

    waveformData.forEach((value, index) => {
      const barHeight = (value / Math.max(...waveformData)) * height;
      const x = index * barWidth;
      const y = (height - barHeight) / 2;

      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * duration;

      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);

    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return duration > 0 ? (currentTime / duration) * 100 : 0;
  };

  return (
    <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={URL.createObjectURL(uploadFile.file)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* File Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{
          width: '60px',
          height: '60px',
          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '1.5rem'
        }}>
          🎵
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600' }}>{uploadFile.name}</div>
          <div style={{ color: '#999', fontSize: '0.9rem' }}>
            {metadata && `${formatTime(metadata.duration)} • ${metadata.format.split('/')[1].toUpperCase()}`}
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div style={{ marginBottom: '1rem' }}>
        <canvas
          ref={canvasRef}
          width={400}
          height={60}
          style={{
            width: '100%',
            height: '60px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.05)'
          }}
        />
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '4px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '2px',
          cursor: 'pointer',
          marginBottom: '0.5rem'
        }}
        onClick={handleSeek}
      >
        <div style={{
          width: `${getProgressPercentage()}%`,
          height: '100%',
          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
          borderRadius: '2px',
          transition: 'width 0.1s ease'
        }} />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={handlePlayPause}
          style={{
            background: 'linear-gradient(45deg, #DC2626, #EC4899)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#999', minWidth: '35px' }}>
            {formatTime(currentTime)}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#999' }}>
            {formatTime(duration)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={toggleMute}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            style={{
              width: '60px',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '2px',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
        </div>
      </div>

      {/* Metadata */}
      {metadata && (
        <div style={{
          marginTop: '1rem',
          padding: '0.5rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          fontSize: '0.8rem',
          color: '#999'
        }}>
          <div>Duration: {formatTime(metadata.duration)}</div>
          <div>Bitrate: ~{Math.round(metadata.bitrate / 1000)}kbps</div>
          <div>Format: {metadata.format.split('/')[1].toUpperCase()}</div>
          <div>Size: {((metadata.size || 0) / 1024 / 1024).toFixed(2)} MB</div>
        </div>
      )}
    </div>
  );
} 