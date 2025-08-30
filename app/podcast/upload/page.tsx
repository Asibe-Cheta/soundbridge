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
  Radio
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">SoundBridge</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <input
                type="search"
                placeholder="Search creators, events, podcasts..."
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-white" />
                <span className="text-white">{user.email}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Upload Your Podcast
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Share your podcast episodes with the SoundBridge community
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            {/* Audio File Upload */}
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Headphones className="w-5 h-5 mr-2 text-pink-500" />
                Podcast Audio
              </h3>
              
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-pink-500 bg-pink-500/10'
                    : uploadState.audioFile
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-white/20 hover:border-white/40'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {uploadState.audioFile ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <FileAudio className="w-12 h-12 text-green-500" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{uploadState.audioFile.name}</p>
                      <p className="text-white/60 text-sm">
                        {(uploadState.audioFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    
                    {/* Audio Preview */}
                    <div className="bg-black/20 rounded-lg p-4">
                      <audio
                        ref={audioRef}
                        src={URL.createObjectURL(uploadState.audioFile)}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleTimeUpdate}
                        className="w-full"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <button
                          onClick={handlePlayPause}
                          className="bg-pink-500 hover:bg-pink-600 text-white rounded-full p-2 transition-colors"
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <div className="text-white/60 text-sm">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => uploadActions.setAudioFile(null)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove File
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 mx-auto text-white/60" />
                    <div>
                      <p className="text-white font-medium">Drop your podcast audio here</p>
                      <p className="text-white/60 text-sm">or click to browse</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                      Choose File
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Cover Art Upload */}
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">Podcast Cover Art</h3>
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
            </div>
          </div>

          {/* Form Section */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">Podcast Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Episode Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter episode title"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Episode Number
                  </label>
                  <input
                    type="text"
                    value={episodeNumber}
                    onChange={(e) => setEpisodeNumber(e.target.value)}
                    placeholder="e.g., Episode 1, Season 2 Episode 5"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your podcast episode..."
                    rows={4}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Category
                  </label>
                  <select
                    value={podcastCategory}
                    onChange={(e) => setPodcastCategory(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
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
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="music, interview, afrobeats (comma separated)"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>
            </div>

            {/* Privacy & Publishing */}
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">Privacy & Publishing</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Privacy Setting
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'public', icon: Globe, label: 'Public', desc: 'Anyone can listen' },
                      { value: 'followers', icon: Users, label: 'Followers Only', desc: 'Only your followers can listen' },
                      { value: 'private', icon: Lock, label: 'Private', desc: 'Only you can listen' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="privacy"
                          value={option.value}
                          checked={privacy === option.value}
                          onChange={(e) => setPrivacy(e.target.value as any)}
                          className="text-pink-500 focus:ring-pink-500"
                        />
                        <div className="flex items-center space-x-2">
                          <option.icon className="w-4 h-4 text-white/60" />
                          <div>
                            <div className="text-white font-medium">{option.label}</div>
                            <div className="text-white/60 text-sm">{option.desc}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Publish Option
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'now', icon: Upload, label: 'Publish Now', desc: 'Make it available immediately' },
                      { value: 'schedule', icon: Calendar, label: 'Schedule', desc: 'Publish at a specific date/time' },
                      { value: 'draft', icon: Save, label: 'Save as Draft', desc: 'Save for later editing' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="publishOption"
                          value={option.value}
                          checked={publishOption === option.value}
                          onChange={(e) => setPublishOption(e.target.value as any)}
                          className="text-pink-500 focus:ring-pink-500"
                        />
                        <div className="flex items-center space-x-2">
                          <option.icon className="w-4 h-4 text-white/60" />
                          <div>
                            <div className="text-white font-medium">{option.label}</div>
                            <div className="text-white/60 text-sm">{option.desc}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {publishOption === 'schedule' && (
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Schedule Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Upload Progress */}
            {uploadState.isUploading && (
              <div className="card">
                <h3 className="text-xl font-semibold text-white mb-4">Upload Progress</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-white/80 mb-1">
                      <span>Audio File</span>
                      <span>{uploadState.uploadProgress.audio}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div
                        className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadState.uploadProgress.audio}%` }}
                      />
                    </div>
                  </div>
                  
                  {uploadState.coverArtFile && (
                    <div>
                      <div className="flex justify-between text-sm text-white/80 mb-1">
                        <span>Cover Art</span>
                        <span>{uploadState.uploadProgress.cover}%</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div
                          className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadState.uploadProgress.cover}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={handleCancelUpload}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition-colors"
                  >
                    Cancel Upload
                  </button>
                </div>
              </div>
            )}

            {/* Error Display */}
            {uploadState.error && (
              <div className="card bg-red-500/10 border-red-500/20">
                <div className="flex items-center space-x-2 text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Upload Error</span>
                </div>
                <p className="text-red-300 mt-2">{uploadState.error}</p>
              </div>
            )}

            {/* Success Message */}
            {uploadState.successMessage && (
              <div className="card bg-green-500/10 border-green-500/20">
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Success!</span>
                </div>
                <p className="text-green-300 mt-2">{uploadState.successMessage}</p>
              </div>
            )}

            {/* Publish Button */}
            <button
              onClick={handlePublish}
              disabled={!uploadState.audioFile || uploadState.isUploading}
              className={`w-full py-4 rounded-lg font-semibold transition-all ${
                !uploadState.audioFile || uploadState.isUploading
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white transform hover:scale-105'
              }`}
            >
              {uploadState.isUploading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Uploading...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Mic className="w-5 h-5" />
                  <span>Publish Podcast</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
