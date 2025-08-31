'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Image as ImageIcon,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Camera,
  Crop
} from 'lucide-react';

import type { UploadFile } from '../../lib/types/upload';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  onImageRemove: () => void;
  selectedFile: UploadFile | null;
  previewUrl?: string | null;
  isUploading?: boolean;
  uploadProgress?: number;
  uploadStatus?: 'idle' | 'uploading' | 'success' | 'error';
  error?: string | null;
  title?: string;
  subtitle?: string;
  accept?: string;
  maxSize?: number;
  aspectRatio?: number;
  className?: string;
  disabled?: boolean;
}

export function ImageUpload({
  onImageSelect,
  onImageRemove,
  selectedFile,
  previewUrl,
  isUploading = false,
  uploadProgress = 0,
  uploadStatus = 'idle',
  error = null,
  title = 'Upload Image',
  subtitle = 'Drag & drop or click to browse',
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB
  aspectRatio,
  className = '',
  disabled = false
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file');
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      alert(`File size must be less than ${maxSize / 1024 / 1024}MB`);
      return;
    }

    onImageSelect(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`image-upload ${className}`}>
      {/* Drag & Drop Area */}
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        style={{
          position: 'relative',
          border: '2px dashed rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          background: dragActive ? 'rgba(236, 72, 153, 0.1)' : 'transparent',
          borderColor: dragActive ? '#EC4899' : 'rgba(255, 255, 255, 0.2)',
          opacity: disabled ? 0.6 : 1
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInput}
          style={{ display: 'none' }}
          disabled={disabled}
        />

        {!selectedFile ? (
          <div>
            <ImageIcon size={48} style={{ color: '#EC4899', marginBottom: '1rem' }} />
            <h4 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>{title}</h4>
            <p style={{ color: '#999', marginBottom: '1rem' }}>{subtitle}</p>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              Supports: JPG, PNG, WebP, AVIF (Max {maxSize / 1024 / 1024}MB)
            </div>
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            {/* Image Preview */}
            <div style={{
              position: 'relative',
              marginBottom: '1rem',
              borderRadius: '8px',
              overflow: 'hidden',
              aspectRatio: aspectRatio ? aspectRatio.toString() : 'auto'
            }}>
              <img
                src={previewUrl || URL.createObjectURL(selectedFile.file)}
                alt="Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '8px'
                }}
              />

              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onImageRemove();
                }}
                style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.7)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'}
              >
                <X size={16} />
              </button>
            </div>

            {/* File Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <ImageIcon size={24} style={{ color: '#EC4899' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600' }}>{selectedFile.name}</div>
                <div style={{ color: '#999', fontSize: '0.9rem' }}>
                  {formatFileSize(selectedFile.size)}
                </div>
              </div>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Loader2 size={16} style={{ color: '#EC4899', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.9rem' }}>Uploading...</span>
                  <span style={{ fontSize: '0.8rem', color: '#999' }}>
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  height: '8px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                    height: '100%',
                    width: `${uploadProgress}%`,
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              </div>
            )}

            {/* Upload Status */}
            {uploadStatus === 'success' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981' }}>
                <CheckCircle size={16} />
                <span>Upload complete!</span>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#EF4444' }}>
                <AlertCircle size={16} />
                <span>{error || 'Upload failed'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && !selectedFile && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.5rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: '#EF4444',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 