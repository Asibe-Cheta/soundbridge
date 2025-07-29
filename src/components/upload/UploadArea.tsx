'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileAudio, Image, AlertCircle, CheckCircle } from 'lucide-react';
import type { UploadFile, UploadConfig } from '../../lib/types/upload';

interface UploadAreaProps {
  config: UploadConfig;
  onFilesSelected: (files: UploadFile[]) => void;
  onFileRemoved: (fileId: string) => void;
  uploadedFiles: UploadFile[];
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  className?: string;
}

export function UploadArea({
  config,
  onFilesSelected,
  onFileRemoved,
  uploadedFiles,
  accept,
  multiple = false,
  maxFiles = 1,
  className = ''
}: UploadAreaProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const validateFile = (file: File): string[] => {
    const errors: string[] = [];

    // Check file size
    if (file.size > config.maxFileSize) {
      errors.push(`File size must be less than ${config.maxFileSize / 1024 / 1024}MB`);
    }

    // Check file type
    if (!config.allowedTypes.includes(file.type)) {
      errors.push(`Invalid file type. Allowed types: ${config.allowedTypes.join(', ')}`);
    }

    // Check if we've reached max files
    if (uploadedFiles.length >= maxFiles) {
      errors.push(`Maximum ${maxFiles} file(s) allowed`);
    }

    return errors;
  };

  const processFiles = (files: FileList) => {
    setError(null);
    const newFiles: UploadFile[] = [];

    Array.from(files).forEach((file) => {
      const errors = validateFile(file);
      
      if (errors.length > 0) {
        setError(errors.join(', '));
        return;
      }

      const uploadFile: UploadFile = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'pending'
      };

      newFiles.push(uploadFile);
    });

    if (newFiles.length > 0) {
      onFilesSelected(newFiles);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [uploadedFiles.length, maxFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const getUploadIcon = () => {
    if (config.allowedTypes.some(type => type.startsWith('audio/'))) {
      return <FileAudio size={48} style={{ color: '#EC4899', marginBottom: '1rem' }} />;
    } else if (config.allowedTypes.some(type => type.startsWith('image/'))) {
      return <Image size={48} style={{ color: '#EC4899', marginBottom: '1rem' }} />;
    }
    return <Upload size={48} style={{ color: '#EC4899', marginBottom: '1rem' }} />;
  };

  const getUploadText = () => {
    if (config.allowedTypes.some(type => type.startsWith('audio/'))) {
      return 'Drag & Drop Audio Files';
    } else if (config.allowedTypes.some(type => type.startsWith('image/'))) {
      return 'Drag & Drop Image Files';
    }
    return 'Drag & Drop Files';
  };

  const getSupportedFormats = () => {
    const formats = config.allowedTypes.map(type => {
      if (type.startsWith('audio/')) {
        return type.split('/')[1].toUpperCase();
      } else if (type.startsWith('image/')) {
        return type.split('/')[1].toUpperCase();
      }
      return type;
    });
    return formats.join(', ');
  };

  return (
    <div className={`upload-area ${dragActive ? 'drag-active' : ''} ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept || config.allowedTypes.join(',')}
        multiple={multiple}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {uploadedFiles.length === 0 ? (
        <div 
          style={{ textAlign: 'center', padding: '2rem', cursor: 'pointer' }}
          onClick={handleClick}
        >
          {getUploadIcon()}
          <h4 style={{ marginBottom: '0.5rem' }}>{getUploadText()}</h4>
          <p style={{ color: '#999', marginBottom: '1rem' }}>
            or click to browse files
          </p>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            Supports: {getSupportedFormats()} (Max {config.maxFileSize / 1024 / 1024}MB)
          </div>
          {error && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.5rem', 
              background: 'rgba(220, 38, 38, 0.1)', 
              border: '1px solid rgba(220, 38, 38, 0.3)',
              borderRadius: '8px',
              color: '#DC2626',
              fontSize: '0.9rem'
            }}>
              <AlertCircle size={16} style={{ marginRight: '0.5rem', display: 'inline' }} />
              {error}
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '1rem' }}>
          {uploadedFiles.map((uploadFile) => (
            <div key={uploadFile.id} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {uploadFile.status === 'success' ? (
                  <CheckCircle size={24} style={{ color: '#22C55E' }} />
                ) : uploadFile.status === 'error' ? (
                  <AlertCircle size={24} style={{ color: '#DC2626' }} />
                ) : (
                  getUploadIcon()
                )}
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600' }}>{uploadFile.name}</div>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>
                    {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                  {uploadFile.status === 'uploading' && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ 
                        width: '100%', 
                        height: '4px', 
                        background: 'rgba(255, 255, 255, 0.1)', 
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${uploadFile.progress}%`,
                          height: '100%',
                          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <div style={{ 
                        fontSize: '0.8rem', 
                        color: '#999', 
                        marginTop: '0.25rem' 
                      }}>
                        {uploadFile.progress.toFixed(1)}%
                      </div>
                    </div>
                  )}
                  {uploadFile.error && (
                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: '#DC2626', 
                      marginTop: '0.25rem' 
                    }}>
                      {uploadFile.error}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileRemoved(uploadFile.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
          
          {uploadedFiles.length < maxFiles && (
            <div 
              style={{ 
                textAlign: 'center', 
                padding: '1rem', 
                border: '2px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                cursor: 'pointer',
                marginTop: '1rem'
              }}
              onClick={handleClick}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload size={24} style={{ color: '#999', marginBottom: '0.5rem' }} />
              <div style={{ color: '#999', fontSize: '0.9rem' }}>
                Add more files
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 