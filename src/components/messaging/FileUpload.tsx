'use client';

import React, { useState, useRef, useCallback } from 'react';
import type { FileUploadProps } from '../../lib/types/messaging';
import {
  Upload,
  FileAudio,
  Image as ImageIcon,
  FileText,
  X,
  AlertCircle,
  CheckCircle,
  Music,
  Play,
  Pause,
  Volume2
} from 'lucide-react';

export function FileUpload({
  onFileSelect,
  acceptedTypes = ['audio/*', 'image/*', 'application/pdf'],
  maxSize = 10 * 1024 * 1024, // 10MB default
  isLoading
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size must be less than ${(maxSize / 1024 / 1024).toFixed(1)}MB`;
    }

    // Check file type
    const isValidType = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        const baseType = type.replace('/*', '');
        return file.type.startsWith(baseType);
      }
      return file.type === type;
    });

    if (!isValidType) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  const handleFile = useCallback((file: File) => {
    setError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);

    // If it's an audio file, get duration
    if (file.type.startsWith('audio/')) {
      const audio = new Audio(URL.createObjectURL(file));
      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(audio.duration);
      });
    }
  }, [maxSize, acceptedTypes, onFileSelect]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    setIsPlaying(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
  };

  const handleAudioPlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setAudioCurrentTime(0);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('audio/')) return Music;
    if (file.type.startsWith('image/')) return ImageIcon;
    return FileText;
  };

  const getFileTypeLabel = (file: File) => {
    if (file.type.startsWith('audio/')) return 'Audio File';
    if (file.type.startsWith('image/')) return 'Image File';
    if (file.type === 'application/pdf') return 'PDF Document';
    return 'File';
  };

  if (selectedFile) {
    const FileIcon = getFileIcon(selectedFile);
    const isAudio = selectedFile.type.startsWith('audio/');

    return (
      <div className="file-upload-preview bg-white/5 rounded-lg p-4 border border-white/20">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Selected File</h3>
          <button
            onClick={handleRemoveFile}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-accent-pink/20 rounded-lg flex items-center justify-center">
            <FileIcon size={24} className="text-accent-pink" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
            <p className="text-xs text-gray-400">
              {getFileTypeLabel(selectedFile)} • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>

          {isAudio && (
            <button
              onClick={handleAudioPlayPause}
              className="w-8 h-8 rounded-full bg-accent-pink flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
          )}
        </div>

        {isAudio && audioDuration > 0 && (
          <div className="mt-3">
            <div className="bg-white/5 rounded-full h-2 mb-2">
              <div
                className="bg-accent-pink h-2 rounded-full transition-all duration-300"
                style={{ width: `${(audioCurrentTime / audioDuration) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{formatTime(audioCurrentTime)}</span>
              <span>{formatTime(audioDuration)}</span>
            </div>
          </div>
        )}

        {isAudio && (
          <audio
            ref={audioRef}
            src={URL.createObjectURL(selectedFile)}
            onTimeUpdate={handleAudioTimeUpdate}
            onEnded={handleAudioEnded}
            className="hidden"
          />
        )}

        {error && (
          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={14} />
              {error}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="file-upload-container">
      <div
        className={`upload-area rounded-lg border-2 border-dashed transition-all duration-200 ${dragActive
            ? 'border-accent-pink bg-accent-pink/10'
            : 'border-white/20 hover:border-accent-pink/50'
          }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="text-center p-6">
          <Upload size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-white mb-2">Upload File</h3>
          <p className="text-sm text-gray-400 mb-4">
            Drag and drop a file here, or click to browse
          </p>

          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Music size={12} />
              Audio
            </div>
            <div className="flex items-center gap-1">
              <ImageIcon size={12} />
              Images
            </div>
            <div className="flex items-center gap-1">
              <FileText size={12} />
              Documents
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Max size: {(maxSize / 1024 / 1024).toFixed(1)}MB
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileInput}
        className="hidden"
      />

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        </div>
      )}
    </div>
  );
} 