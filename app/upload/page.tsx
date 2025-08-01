'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Footer } from '../../src/components/layout/Footer';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import { ImageUpload } from '../../src/components/ui/ImageUpload';
import { useAudioUpload } from '../../src/hooks/useAudioUpload';
import { useAuth } from '../../src/contexts/AuthContext';
import {
  Upload,
  Music,
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
  Loader2
} from 'lucide-react';

export default function UploadPage() {
  const { user } = useAuth();
  const [uploadState, uploadActions] = useAudioUpload();
  const [dragActive, setDragActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [tags, setTags] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'followers' | 'private'>('public');
  const [publishOption, setPublishOption] = useState<'now' | 'schedule' | 'draft'>('now');
  const [scheduleDate, setScheduleDate] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const genres = [
    'Afrobeats', 'Gospel', 'UK Drill', 'Highlife', 'Jazz', 'Hip Hop',
    'R&B', 'Pop', 'Rock', 'Electronic', 'Classical', 'Folk', 'Country'
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
  }, [handleFileUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    uploadActions.setAudioFile(file);

    // Auto-fill title from filename
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    setTitle(fileName);
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
    // Validate form
    const validation = uploadActions.validateFiles();
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return;
    }

    if (!title.trim()) {
      alert('Please add a title for your track');
      return;
    }

    if (publishOption === 'schedule' && !scheduleDate) {
      alert('Please select a schedule date');
      return;
    }

    // Prepare track data
    const trackData = {
      title: title.trim(),
      description: description.trim(),
      genre: genre || undefined,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined,
      privacy,
      publishOption,
      scheduleDate: publishOption === 'schedule' ? scheduleDate : undefined
    };

    // Upload track
    const success = await uploadActions.uploadTrack(trackData);

    if (success) {
      // Reset form on success
      setTitle('');
      setDescription('');
      setGenre('');
      setTags('');
      setPrivacy('public');
      setPublishOption('now');
      setScheduleDate('');
      uploadActions.resetUpload();
    }
  };

  const handleCancelUpload = () => {
    uploadActions.cancelUpload();
  };

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="main-container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <AlertTriangle size={48} style={{ color: '#EC4899', marginBottom: '1rem' }} />
          <h2 style={{ marginBottom: '1rem' }}>Authentication Required</h2>
          <p style={{ color: '#999', marginBottom: '2rem' }}>
            You need to be logged in to upload tracks to SoundBridge.
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
          🌉 SoundBridge
        </div>
        <nav className="nav">
          <Link href="/" style={{ textDecoration: 'none', color: 'white' }}>
            For You
          </Link>
          <a href="#">Discover</a>
          <a href="#">Events</a>
          <a href="#">Creators</a>
        </nav>
        <input type="search" className="search-bar" placeholder="Search creators, events, podcasts..." />
        <div className="auth-buttons">
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button className="btn-secondary">Login</button>
          </Link>
          <Link href="/signup" style={{ textDecoration: 'none' }}>
            <button className="btn-primary">Sign Up</button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-container">
        <div className="section-header">
          <h1 className="section-title">Upload Audio</h1>
          <p style={{ color: '#ccc', marginTop: '0.5rem' }}>
            Share your music, podcasts, or audio content with the SoundBridge community
          </p>
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

        {uploadState.successMessage && (
          <div className="card" style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22C55E' }}>
              <CheckCircle size={20} />
              <span>{uploadState.successMessage}</span>
            </div>
          </div>
        )}

        <div className="grid grid-2" style={{ gap: '2rem' }}>
          {/* Upload Area */}
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>
              <Upload size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
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

          {/* Metadata Form */}
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>
              <Music size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
              Track Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Title */}
              <div>
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter track title"
                  className="form-input"
                />
              </div>

              {/* Description */}
              <div>
                <label className="form-label">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about your track..."
                  rows={4}
                  className="form-textarea"
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
                  {genres.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
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
              'Publish Track'
            )}
          </button>
        </div>

        {/* Footer */}
        <Footer />
      </main>

      {/* Floating Upload Tips Card */}
      <FloatingCard title="Upload Tips">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div>🎵 Use high-quality audio files for best results</div>
          <div>📝 Add detailed descriptions to help discovery</div>
          <div>🏷️ Use relevant tags to reach your audience</div>
          <div>🖼️ Upload cover art to make your track stand out</div>
        </div>

        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Recent Uploads</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div>Lagos Nights - Kwame Asante</div>
          <div>Gospel Fusion - Sarah Johnson</div>
          <div>UK Drill Mix - Tommy B</div>
        </div>
      </FloatingCard>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
} 