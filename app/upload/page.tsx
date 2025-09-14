'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Footer } from '../../src/components/layout/Footer';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import { ImageUpload } from '../../src/components/ui/ImageUpload';
import Image from 'next/image';
import { useAudioUpload } from '../../src/hooks/useAudioUpload';
import { useAuth } from '../../src/contexts/AuthContext';
import { UploadValidator } from '../../src/components/upload/UploadValidator';
import type { UploadValidationResult } from '../../src/lib/types/upload-validation';
import {
  Upload,
  Music,
  Mic,
  FileAudio,
  Globe,
  Users,
  Lock,
  Calendar,
  Save,
  Play,
  Pause,
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  User,
  Headphones,
  ArrowLeft,
  Menu,
  Home,
  Bell,
  Settings,
  LogOut,
  Search
} from 'lucide-react';

type ContentType = 'music' | 'podcast';

export default function UnifiedUploadPage() {
  const { user, loading, signOut } = useAuth();
  const [uploadState, uploadActions] = useAudioUpload();
  const [dragActive, setDragActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Content type selection
  const [contentType, setContentType] = useState<ContentType>('music');

  // Form states - shared
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'followers' | 'private'>('public');
  const [publishOption, setPublishOption] = useState<'now' | 'schedule' | 'draft'>('now');
  const [scheduleDate, setScheduleDate] = useState('');

  // Music-specific states
  const [artistName, setArtistName] = useState('');
  const [genre, setGenre] = useState('');

  // Podcast-specific states
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [podcastCategory, setPodcastCategory] = useState('');

  // Validation states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<UploadValidationResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Validation handlers
  const handleValidationComplete = (result: UploadValidationResult) => {
    setValidationResult(result);
    setValidationError(null);
  };

  const handleValidationError = (error: string) => {
    setValidationError(error);
    setValidationResult(null);
  };

  // Content type options
  const contentTypes = [
    {
      id: 'music' as ContentType,
      label: 'Music Track',
      icon: Music,
      description: 'Upload your music, beats, or audio tracks',
      color: 'linear-gradient(135deg, #dc2626 0%, #ec4899 100%)'
    },
    {
      id: 'podcast' as ContentType,
      label: 'Podcast Episode',
      icon: Mic,
      description: 'Share your podcast episodes and audio content',
      color: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
    }
  ];

  // Music genres
  const musicGenres = [
    'Afrobeats', 'Gospel', 'UK Drill', 'Highlife', 'Jazz', 'Hip Hop',
    'R&B', 'Pop', 'Rock', 'Electronic', 'Classical', 'Folk', 'Country'
  ];

  // Podcast categories
  const podcastCategories = [
    'Music Industry', 'Artist Interviews', 'Music Production', 'Gospel & Worship',
    'Afrobeats', 'UK Drill', 'Hip Hop', 'R&B', 'Jazz', 'Classical', 'Rock',
    'Pop', 'Electronic', 'Folk', 'Country', 'Business', 'Education',
    'Entertainment', 'Culture', 'Lifestyle', 'Technology', 'Other'
  ];

  // Handle mobile responsiveness
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      handleFileUpload(file);
    }
  }, []);

  const handleFileUpload = (file: File) => {
    uploadActions.setAudioFile(file);
    setSelectedFile(file); // Set for validation

    // Auto-fill title from filename
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    setTitle(fileName);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleCoverArtSelect = (file: File) => {
    uploadActions.setCoverArtFile(file);
  };

  const handleCoverArtRemove = () => {
    uploadActions.setCoverArtFile(null);
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
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePublish = async () => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    if (!uploadState.audioFile) {
      console.error('No audio file selected');
      return;
    }

    if (!title.trim()) {
      console.error('No title provided');
      return;
    }

    // Validate content-specific required fields
    if (contentType === 'music' && !artistName.trim()) {
      console.error('No artist name provided');
      return;
    }

    if (contentType === 'podcast' && !episodeNumber.trim()) {
      console.error('No episode number provided');
      return;
    }

    try {
      console.log('Starting upload process...');
      
      // First, ensure profile exists
      console.log('Ensuring profile exists...');
      const profileCheckResponse = await fetch('/api/profile/create', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const profileCheckResult = await profileCheckResponse.json();
      console.log('Profile check result:', profileCheckResult);
      
      if (!profileCheckResult.exists) {
        console.log('Profile does not exist, creating...');
        const profileCreateResponse = await fetch('/api/profile/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User',
            role: 'creator' // Default to creator for upload functionality
          }),
        });
        
        const profileCreateResult = await profileCreateResponse.json();
        console.log('Profile creation result:', profileCreateResult);
        
        if (!profileCreateResult.success) {
          throw new Error('Failed to create profile: ' + profileCreateResult.error);
        }
        
        console.log('Profile created successfully');
      } else {
        console.log('Profile already exists');
      }

      // Prepare track data based on content type
      const trackData = {
        title: title.trim(),
        description: description.trim(),
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        privacy,
        publishOption,
        scheduleDate: publishOption === 'schedule' ? scheduleDate : undefined,
        contentType,
        // Content-specific data
        ...(contentType === 'music' ? {
          artistName: artistName.trim(),
          genre
        } : {
          episodeNumber: episodeNumber.trim(),
          podcastCategory
        })
      };

      console.log('Uploading track with data:', trackData);
      const success = await uploadActions.uploadTrack(trackData);

      if (success) {
        // Reset form
        setTitle('');
        setDescription('');
        setTags('');
        setPrivacy('public');
        setPublishOption('now');
        setScheduleDate('');
        setArtistName('');
        setGenre('');
        setEpisodeNumber('');
        setPodcastCategory('');
        uploadActions.resetUpload();
        
        // Redirect to success page with track details
        console.log('Redirecting to success page...');
        const successUrl = `/upload/success?title=${encodeURIComponent(title.trim())}&type=${contentType}`;
        window.location.href = successUrl;
      } else {
        console.error('Failed to upload track. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleCancelUpload = () => {
    uploadActions.cancelUpload();
  };

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Ensure profile exists before upload
  React.useEffect(() => {
    const ensureProfile = async () => {
      if (!user) return;
      
      try {
        console.log('Ensuring profile exists for user:', user.email);
        
        // Check if profile exists
        const response = await fetch('/api/profile/create', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const result = await response.json();
        console.log('Profile check result:', result);
        
        if (!result.exists) {
          // Create profile
          const createResponse = await fetch('/api/profile/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User',
              role: 'creator' // Default to creator for upload functionality
            }),
          });
          
          const createResult = await createResponse.json();
          console.log('Profile creation result:', createResult);
          
          if (createResult.success) {
            console.log('Profile created successfully');
          } else {
            console.error('Failed to create profile:', createResult.error);
          }
        } else {
          console.log('Profile already exists');
        }
      } catch (error) {
        console.error('Error ensuring profile:', error);
      }
    };
    
    if (user && !loading) {
      ensureProfile();
    }
  }, [user, loading]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="main-container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <Loader2 size={48} style={{ color: '#EC4899', marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
          <h2 style={{ marginBottom: '1rem' }}>Loading...</h2>
          <p style={{ color: '#999', marginBottom: '2rem' }}>
            Checking your authentication status...
          </p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="main-container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <AlertTriangle size={48} style={{ color: '#EC4899', marginBottom: '1rem' }} />
          <h2 style={{ marginBottom: '1rem' }}>Authentication Required</h2>
          <p style={{ color: '#999', marginBottom: '2rem' }}>
            You need to be logged in to upload content to SoundBridge.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button className="btn-primary">Login</button>
            </Link>
            <Link href="/signup" style={{ textDecoration: 'none' }}>
              <button className="btn-secondary">Sign Up</button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="logo">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Image
              src="/images/logos/logo-trans-lockup.png"
              alt="SoundBridge"
              width={120}
              height={32}
              priority
              style={{ height: 'auto' }}
            />
          </Link>
        </div>
        <nav className="nav">
          <Link href="/" style={{ textDecoration: 'none', color: 'white' }}>For You</Link>
          <Link href="/discover" style={{ textDecoration: 'none', color: 'white' }}>Discover</Link>
          <Link href="/events" style={{ textDecoration: 'none', color: 'white' }}>Events</Link>
          <Link href="/creators" style={{ textDecoration: 'none', color: 'white' }}>Creators</Link>
        </nav>
        <div className="search-bar">
          <input type="search" placeholder="Search creators, events, podcasts..." />
        </div>
        <div className="auth-buttons">
          {user ? (
            <div style={{ position: 'relative' }}>
              <Link href="/profile" style={{ textDecoration: 'none' }}>
                <button
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                >
                  <User size={20} color="white" />
                </button>
              </Link>
            </div>
          ) : (
            <>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button className="btn-secondary">Login</button>
              </Link>
              <Link href="/signup" style={{ textDecoration: 'none' }}>
                <button className="btn-primary">Sign Up</button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="main-container">
        <div className="section-header">
          <h1 className="section-title">Upload Content</h1>
          <p style={{ color: '#ccc', marginTop: '0.5rem' }}>
            Share your music, podcasts, or audio content with the SoundBridge community
          </p>
        </div>

        {/* Content Type Selection */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '1.5rem', color: '#EC4899' }}>
            <Upload size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
            Choose Content Type
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {contentTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = contentType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setContentType(type.id)}
                  style={{
                    background: isSelected ? type.color : 'rgba(255, 255, 255, 0.05)',
                    border: `2px solid ${isSelected ? 'transparent' : 'rgba(255, 255, 255, 0.2)'}`,
                    borderRadius: '12px',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    textAlign: 'left',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isSelected ? '0 8px 25px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <Icon size={24} />
                    <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{type.label}</span>
                  </div>
                  <p style={{ color: isSelected ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', margin: 0 }}>
                    {type.description}
                  </p>
                  {isSelected && (
                    <div style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <CheckCircle size={16} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error/Success Messages */}
        {uploadState.error && (
          <div className="card" style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#EF4444' }}>
              <AlertCircle size={20} />
              <span>{uploadState.error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-2" style={{ gap: '2rem' }}>
          {/* Upload Area */}
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>
              <FileAudio size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
              Upload Audio File
            </h3>

            {/* Drag & Drop Area */}
            <div
              className={`upload-area ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              {!uploadState.audioFile ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <FileAudio size={48} style={{ color: '#EC4899', marginBottom: '1rem' }} />
                  <h4 style={{ marginBottom: '0.5rem' }}>Drag & Drop Audio File</h4>
                  <p style={{ color: '#999', marginBottom: '1rem' }}>
                    or click to browse files
                  </p>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    Supports: MP3, WAV, M4A, FLAC, AAC (Max 50MB)
                  </div>
                </div>
              ) : (
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <FileAudio size={24} style={{ color: '#EC4899' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600' }}>{uploadState.audioFile.name}</div>
                      <div style={{ color: '#999', fontSize: '0.9rem' }}>
                        {(uploadState.audioFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        uploadActions.setAudioFile(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#999',
                        cursor: 'pointer',
                        padding: '0.5rem'
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Audio Preview */}
                  <div style={{ marginBottom: '1rem' }}>
                    <audio
                      ref={audioRef}
                      src={uploadState.audioFile ? URL.createObjectURL(uploadState.audioFile.file) : ''}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleTimeUpdate}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayPause();
                        }}
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
                          cursor: 'pointer'
                        }}
                      >
                        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#999', marginBottom: '0.25rem' }}>
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                        <div className="waveform" style={{ height: '20px' }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Upload Progress */}
                  {uploadState.isUploading && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Loader2 size={16} style={{ color: '#EC4899', animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: '0.9rem' }}>Uploading audio...</span>
                        <span style={{ fontSize: '0.8rem', color: '#999' }}>
                          {Math.round(uploadState.uploadProgress.audio)}%
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
                          width: `${uploadState.uploadProgress.audio}%`,
                          transition: 'width 0.3s ease'
                        }}></div>
                      </div>
                    </div>
                  )}

                  {/* Upload Status */}
                  {uploadState.uploadStatus === 'success' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981' }}>
                      <CheckCircle size={16} />
                      <span>Upload complete!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Upload Validation */}
          {selectedFile && (
            <div className="card">
              <UploadValidator
                file={selectedFile}
                metadata={{
                  title,
                  description,
                  genre: contentType === 'music' ? genre : podcastCategory,
                  tags: tags ? tags.split(',').map(t => t.trim()) : [],
                  privacy,
                  publishOption,
                  scheduleDate
                }}
                onValidationComplete={handleValidationComplete}
                onValidationError={handleValidationError}
                className="mb-6"
              />
            </div>
          )}

          {/* Metadata Form */}
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>
              {contentType === 'music' ? (
                <Music size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
              ) : (
                <Mic size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
              )}
              {contentType === 'music' ? 'Track Details' : 'Episode Details'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Title */}
              <div style={{ 
                transition: 'all 0.3s ease',
                opacity: 1,
                transform: 'translateY(0)'
              }}>
                <label className="form-label">
                  {contentType === 'music' ? 'Track Title' : 'Episode Title'} *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={contentType === 'music' ? 'Enter track title' : 'Enter episode title'}
                  className="form-input"
                />
              </div>

              {/* Content-specific fields with smooth transitions */}
              <div style={{ 
                transition: 'all 0.4s ease',
                opacity: 1,
                transform: 'translateY(0)',
                overflow: 'hidden'
              }}>
                {contentType === 'music' ? (
                  <div style={{ 
                    animation: 'slideInFromLeft 0.4s ease-out'
                  }}>
                    {/* Artist Name */}
                    <div style={{ marginBottom: '1rem' }}>
                      <label className="form-label">Artist Name *</label>
                      <input
                        type="text"
                        value={artistName}
                        onChange={(e) => setArtistName(e.target.value)}
                        placeholder="Enter artist name"
                        className="form-input"
                      />
                    </div>

                    {/* Genre */}
                    <div>
                      <label className="form-label">Genre</label>
                      <select
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        className="form-input"
                      >
                        <option value="">Select genre</option>
                        {musicGenres.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    animation: 'slideInFromRight 0.4s ease-out'
                  }}>
                    {/* Episode Number */}
                    <div style={{ marginBottom: '1rem' }}>
                      <label className="form-label">Episode Number *</label>
                      <input
                        type="text"
                        value={episodeNumber}
                        onChange={(e) => setEpisodeNumber(e.target.value)}
                        placeholder="e.g., Episode 1, S01E01"
                        className="form-input"
                      />
                    </div>

                    {/* Podcast Category */}
                    <div>
                      <label className="form-label">Category</label>
                      <select
                        value={podcastCategory}
                        onChange={(e) => setPodcastCategory(e.target.value)}
                        className="form-input"
                      >
                        <option value="">Select category</option>
                        {podcastCategories.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="form-label">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={contentType === 'music' ? 'Tell us about your track...' : 'Tell us about this episode...'}
                  rows={4}
                  className="form-textarea"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="form-label">Tags</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Enter tags separated by commas"
                  className="form-input"
                />
              </div>

              {/* Cover Art */}
              <div>
                <label className="form-label">Cover Art</label>
                <ImageUpload
                  onImageSelect={handleCoverArtSelect}
                  onImageRemove={handleCoverArtRemove}
                  selectedFile={uploadState.coverArtFile}
                  isUploading={uploadState.isUploading && !!uploadState.coverArtFile}
                  uploadProgress={uploadState.uploadProgress.cover}
                  uploadStatus={uploadState.uploadStatus}
                  error={uploadState.error}
                  title="Upload Cover Art"
                  subtitle="Square image recommended (1200x1200px)"
                  aspectRatio={1}
                  disabled={uploadState.isUploading}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & Publishing Settings */}
        <div className="grid grid-2" style={{ gap: '2rem', marginTop: '2rem' }}>
          {/* Privacy Settings */}
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>
              <Lock size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
              Privacy Settings
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="privacy"
                  value="public"
                  checked={privacy === 'public'}
                  onChange={(e) => setPrivacy(e.target.value as 'public' | 'followers' | 'private')}
                />
                <Globe size={16} />
                <span>Public - Anyone can view</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="privacy"
                  value="followers"
                  checked={privacy === 'followers'}
                  onChange={(e) => setPrivacy(e.target.value as 'public' | 'followers' | 'private')}
                />
                <Users size={16} />
                <span>Followers Only</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="privacy"
                  value="private"
                  checked={privacy === 'private'}
                  onChange={(e) => setPrivacy(e.target.value as 'public' | 'followers' | 'private')}
                />
                <Lock size={16} />
                <span>Private - Only you can view</span>
              </label>
            </div>
          </div>

          {/* Publishing Options */}
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>
              <Calendar size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
              Publishing Options
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="publish"
                  value="now"
                  checked={publishOption === 'now'}
                  onChange={(e) => setPublishOption(e.target.value as 'now' | 'schedule' | 'draft')}
                />
                <span>Publish Now</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="publish"
                  value="schedule"
                  checked={publishOption === 'schedule'}
                  onChange={(e) => setPublishOption(e.target.value as 'now' | 'schedule' | 'draft')}
                />
                <span>Schedule for Later</span>
              </label>
              {publishOption === 'schedule' && (
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="form-input"
                  style={{ marginLeft: '1.5rem' }}
                />
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="publish"
                  value="draft"
                  checked={publishOption === 'draft'}
                  onChange={(e) => setPublishOption(e.target.value as 'now' | 'schedule' | 'draft')}
                />
                <Save size={16} />
                <span>Save as Draft</span>
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
          {uploadState.isUploading && (
            <button
              className="btn-secondary"
              style={{ padding: '1rem 2rem' }}
              onClick={handleCancelUpload}
            >
              Cancel Upload
            </button>
          )}
          <button
            className="btn-primary"
            style={{ padding: '1rem 2rem' }}
            onClick={handlePublish}
            disabled={!uploadState.audioFile || uploadState.isUploading}
          >
            {uploadState.isUploading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Uploading...
              </div>
            ) : (
              `Publish ${contentType === 'music' ? 'Track' : 'Episode'}`
            )}
          </button>
        </div>

        {/* Footer */}
        <Footer />
      </main>

      {/* Floating Upload Tips Card */}
      <FloatingCard title="Upload Tips">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div>Use high-quality audio files for best results</div>
          <div>Add detailed descriptions to help discovery</div>
          <div>Use relevant tags to reach your audience</div>
          <div>Upload cover art to make your content stand out</div>
          {contentType === 'music' && (
            <div>Choose the right genre to help listeners find your music</div>
          )}
          {contentType === 'podcast' && (
            <div>Number your episodes consistently for better organization</div>
          )}
        </div>

        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Recent Uploads</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div>Lagos Nights - Kwame Asante</div>
          <div>Gospel Fusion - Sarah Johnson</div>
          <div>UK Drill Mix - Tommy B</div>
        </div>
      </FloatingCard>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .content-type-transition {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `
      }} />
    </>
  );
}