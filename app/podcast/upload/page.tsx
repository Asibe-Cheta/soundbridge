'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Footer } from '../../../src/components/layout/Footer';
import { FloatingCard } from '../../../src/components/ui/FloatingCard';
import { ImageUpload } from '../../../src/components/ui/ImageUpload';
import Image from 'next/image';
import { useAudioUpload } from '../../../src/hooks/useAudioUpload';
import { useAuth } from '../../../src/contexts/AuthContext';
import {
  Upload,
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
  Radio,
  ArrowLeft
} from 'lucide-react';

export default function PodcastUploadPage() {
  const { user, loading } = useAuth();
  const [uploadState, uploadActions] = useAudioUpload();
  const [dragActive, setDragActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Form states
  const [title, setTitle] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [description, setDescription] = useState('');
  const [podcastCategory, setPodcastCategory] = useState('');
  const [tags, setTags] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'followers' | 'private'>('public');
  const [publishOption, setPublishOption] = useState<'now' | 'schedule' | 'draft'>('now');
  const [scheduleDate, setScheduleDate] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const podcastCategories = [
    'Music Industry', 'Artist Interviews', 'Music Production', 'Gospel & Worship',
    'Afrobeats', 'UK Drill', 'Hip Hop', 'R&B', 'Jazz', 'Classical', 'Rock',
    'Pop', 'Electronic', 'Folk', 'Country', 'Business', 'Education',
    'Entertainment', 'Culture', 'Lifestyle', 'Technology', 'Other'
  ];

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

    try {
      // Check if user has a profile, create one if not
      const profileResponse = await fetch('/api/profile/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.email?.split('@')[0] || 'user',
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          bio: 'Podcast creator on SoundBridge',
          role: 'creator'
        })
      });

      if (profileResponse.ok) {
        console.log('Profile created successfully');
      } else {
        console.log('Profile already exists');
      }

      // Now proceed with upload
      const podcastData = {
        title: title.trim(),
        artistName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Podcast Creator',
        description: description.trim(),
        genre: 'podcast', // This identifies it as a podcast
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        privacy,
        publishOption,
        scheduleDate: publishOption === 'schedule' ? scheduleDate : undefined,
        episodeNumber: episodeNumber.trim(),
        category: podcastCategory
      };

      console.log('Uploading podcast with data:', podcastData);
      const success = await uploadActions.uploadTrack(podcastData);

      if (success) {
        // Reset form
        setTitle('');
        setEpisodeNumber('');
        setDescription('');
        setPodcastCategory('');
        setTags('');
        setPrivacy('public');
        setPublishOption('now');
        setScheduleDate('');
        uploadActions.resetUpload();
        
        // Redirect to success page with podcast details
        console.log('Redirecting to success page...');
        const successUrl = `/podcast/upload/success?title=${encodeURIComponent(title.trim())}`;
        window.location.href = successUrl;
      } else {
        console.error('Failed to upload podcast. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleCancelUpload = () => {
    uploadActions.cancelUpload();
  };

  // Debug authentication state
  console.log('PodcastUploadPage Auth State:', { 
    user: user?.email, 
    loading, 
    hasUser: !!user,
    userId: user?.id 
  });

  // Force refresh authentication state
  React.useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} className="animate-spin" style={{ marginBottom: '1rem', color: 'white' }} />
          <p style={{ color: 'white' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
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
          <a href="#">Creators</a>
        </nav>
        <div className="auth-buttons">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'white', fontSize: '0.9rem' }}>
                Welcome, {user.email}
              </span>
              <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}>
                  Dashboard
                </button>
              </Link>
            </div>
          ) : (
            <>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'transparent',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem'
                }}>
                  Sign in
                </button>
              </Link>
              <Link href="/signup" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem'
                }}>
                  Sign up
                </button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="main-container">
        {/* Back to Home */}
        <div style={{ padding: '2rem 2rem 0' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem'
            }}>
              <ArrowLeft size={16} />
              Back to Home
            </button>
          </Link>
        </div>

        {/* Upload Your Podcast Form */}
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '1rem'
            }}>
              Upload Your Podcast
            </h1>
            <p style={{ color: '#ccc', fontSize: '1.1rem' }}>
              Share your podcast episodes with the SoundBridge community
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Left Column - Upload Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Podcast Audio Upload */}
              <div className="card">
                <h3 style={{ color: '#EC4899', marginBottom: '1.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Headphones size={20} />
                  Podcast Audio
                </h3>
                
                <div
                  style={{
                    border: dragActive ? '2px dashed #EC4899' : uploadState.audioFile ? '2px dashed #10B981' : '2px dashed rgba(255, 255, 255, 0.3)',
                    borderRadius: '12px',
                    padding: '2rem',
                    textAlign: 'center',
                    background: dragActive ? 'rgba(236, 72, 153, 0.1)' : uploadState.audioFile ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadState.audioFile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileAudio size={48} style={{ color: '#10B981' }} />
                      </div>
                      <div>
                        <p style={{ color: 'white', fontWeight: '600' }}>{uploadState.audioFile.name}</p>
                        <p style={{ color: '#ccc', fontSize: '0.9rem' }}>
                          {(uploadState.audioFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      
                      {/* Audio Preview */}
                      <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', padding: '1rem' }}>
                        <audio
                          ref={audioRef}
                          src={URL.createObjectURL(uploadState.audioFile)}
                          onTimeUpdate={handleTimeUpdate}
                          onLoadedMetadata={handleTimeUpdate}
                          style={{ width: '100%' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayPause();
                            }}
                            style={{
                              background: '#EC4899',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                          </button>
                          <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </div>
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
                          color: '#F87171',
                          fontSize: '0.9rem',
                          cursor: 'pointer'
                        }}
                      >
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <Upload size={48} style={{ color: '#ccc', margin: '0 auto' }} />
                      <div>
                        <p style={{ color: 'white', fontWeight: '600' }}>Drop your podcast audio here</p>
                        <p style={{ color: '#ccc', fontSize: '0.9rem' }}>or click to browse</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                      <button
                        style={{
                          background: '#EC4899',
                          color: 'white',
                          border: 'none',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        Choose File
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Cover Art Upload */}
              <div className="card">
                <h3 style={{ color: '#EC4899', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
                  Podcast Cover Art
                </h3>
                <ImageUpload
                  onImageSelect={handleCoverArtSelect}
                  onImageRemove={handleCoverArtRemove}
                  selectedFile={uploadState.coverArtFile}
                  previewUrl={uploadState.coverArtUrl}
                  isUploading={uploadState.isUploading}
                  uploadProgress={uploadState.uploadProgress}
                  uploadStatus={uploadState.uploadStatus}
                  error={uploadState.error}
                  title="Upload Cover Art"
                  subtitle="Drag & drop or click to browse"
                  accept="image/*"
                  maxSize={5 * 1024 * 1024} // 5MB
                />
                <div style={{ color: '#ccc', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Supports: JPG, PNG, WebP, AVIF (Max 5MB)
                </div>
              </div>
            </div>

            {/* Right Column - Form Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Podcast Details */}
              <div className="card">
                <h3 style={{ color: '#EC4899', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
                  Podcast Details
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                      Episode Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter episode title"
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        padding: '1rem',
                        color: 'white',
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                      Episode Number
                    </label>
                    <input
                      type="text"
                      value={episodeNumber}
                      onChange={(e) => setEpisodeNumber(e.target.value)}
                      placeholder="e.g., Episode 1, Season 2 Episode 5"
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        padding: '1rem',
                        color: 'white',
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your podcast episode..."
                      rows={4}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        padding: '1rem',
                        color: 'white',
                        fontSize: '1rem',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                      Category
                    </label>
                    <select
                      value={podcastCategory}
                      onChange={(e) => setPodcastCategory(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        padding: '1rem',
                        color: 'white',
                        fontSize: '1rem'
                      }}
                    >
                      <option value="">Select a category</option>
                      {podcastCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                      Tags
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="music, interview, afrobeats (comma separated)"
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        padding: '1rem',
                        color: 'white',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Privacy & Publishing */}
              <div className="card">
                <h3 style={{ color: '#EC4899', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
                  Privacy & Publishing
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                      Privacy Setting
                    </label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      {[
                        { value: 'public', label: 'Public', icon: Globe, desc: 'Anyone can listen' },
                        { value: 'followers', label: 'Followers Only', icon: Users, desc: 'Only your followers can listen' },
                        { value: 'private', label: 'Private', icon: Lock, desc: 'Only you can listen' }
                      ].map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.value}
                            onClick={() => setPrivacy(option.value as any)}
                            style={{
                              flex: 1,
                              background: privacy === option.value ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              border: privacy === option.value ? '2px solid #EC4899' : '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '12px',
                              padding: '1rem',
                              color: 'white',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <Icon size={20} />
                            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{option.label}</span>
                            <span style={{ fontSize: '0.8rem', color: '#ccc' }}>{option.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                      Publishing Option
                    </label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      {[
                        { value: 'now', label: 'Publish Now', icon: Upload, desc: 'Make it available immediately' },
                        { value: 'schedule', label: 'Schedule', icon: Calendar, desc: 'Publish at a specific date/time' },
                        { value: 'draft', label: 'Save Draft', icon: Save, desc: 'Save for later editing' }
                      ].map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.value}
                            onClick={() => setPublishOption(option.value as any)}
                            style={{
                              flex: 1,
                              background: publishOption === option.value ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              border: publishOption === option.value ? '2px solid #EC4899' : '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '12px',
                              padding: '1rem',
                              color: 'white',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <Icon size={20} />
                            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{option.label}</span>
                            <span style={{ fontSize: '0.8rem', color: '#ccc' }}>{option.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {publishOption === 'schedule' && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>
                        Schedule Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        style={{
                          width: '100%',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '12px',
                          padding: '1rem',
                          color: 'white',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Progress */}
              {uploadState.isUploading && (
                <div className="card">
                  <h3 style={{ color: '#EC4899', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
                    Upload Progress
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#ccc', marginBottom: '0.5rem' }}>
                        <span>Audio File</span>
                        <span>{uploadState.uploadProgress.audio}%</span>
                      </div>
                      <div style={{ width: '100%', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '8px', height: '8px' }}>
                        <div
                          style={{
                            background: '#EC4899',
                            height: '8px',
                            borderRadius: '8px',
                            width: `${uploadState.uploadProgress.audio}%`,
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                    </div>
                    
                    {uploadState.coverArtFile && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#ccc', marginBottom: '0.5rem' }}>
                          <span>Cover Art</span>
                          <span>{uploadState.uploadProgress.cover}%</span>
                        </div>
                        <div style={{ width: '100%', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '8px', height: '8px' }}>
                          <div
                            style={{
                              background: '#EC4899',
                              height: '8px',
                              borderRadius: '8px',
                              width: `${uploadState.uploadProgress.cover}%`,
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={handleCancelUpload}
                      style={{
                        width: '100%',
                        background: '#DC2626',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Cancel Upload
                    </button>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {uploadState.error && (
                <div style={{
                  background: 'rgba(220, 38, 38, 0.1)',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  borderRadius: '12px',
                  padding: '1rem',
                  color: '#FCA5A5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <AlertTriangle size={20} />
                  <span style={{ fontWeight: '600' }}>Upload Error:</span> {uploadState.error}
                </div>
              )}

              {/* Success Message */}
              {uploadState.successMessage && (
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '12px',
                  padding: '1rem',
                  color: '#86EFAC',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <CheckCircle size={20} />
                  <span style={{ fontWeight: '600' }}>Success!</span> {uploadState.successMessage}
                </div>
              )}

              {/* Publish Button */}
              <button
                onClick={handlePublish}
                disabled={!uploadState.audioFile || uploadState.isUploading}
                style={{
                  width: '100%',
                  background: !uploadState.audioFile || uploadState.isUploading 
                    ? '#6B7280' 
                    : 'linear-gradient(45deg, #DC2626, #EC4899)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  cursor: !uploadState.audioFile || uploadState.isUploading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: !uploadState.audioFile || uploadState.isUploading ? 0.6 : 1
                }}
              >
                {uploadState.isUploading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Mic size={20} />
                    Publish Podcast
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </main>
    </>
  );
}
