'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Footer } from '../../src/components/layout/Footer';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import { ImageUpload } from '../../src/components/ui/ImageUpload';
import Image from 'next/image';
import { useAudioUpload } from '../../src/hooks/useAudioUpload';
import { useAuth } from '../../src/contexts/AuthContext';
import { AudioQualitySelector } from '../../src/components/upload/AudioQualitySelector';
import type { AudioQualitySettings, AudioQualityTier } from '../../src/lib/types/audio-quality';
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

  // Form states
  const [contentType, setContentType] = useState<ContentType>('music');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [publishOption, setPublishOption] = useState('now');
  const [scheduleDate, setScheduleDate] = useState('');

  // Music-specific states
  const [artistName, setArtistName] = useState('');
  const [genre, setGenre] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [lyricsLanguage, setLyricsLanguage] = useState('en');

  // Podcast-specific states
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [podcastCategory, setPodcastCategory] = useState('');

  // Audio quality states
  const [selectedQuality, setSelectedQuality] = useState<AudioQualitySettings | null>(null);
  const [userTier, setUserTier] = useState<AudioQualityTier>('free');

  // Validation modal states
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<'success' | 'error' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if mobile on mount and load user tier
  React.useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    // Load user tier for quality selection
    if (user) {
      loadUserTier();
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, [user]);

  // Load user tier for quality selection
  const loadUserTier = async () => {
    try {
      const response = await fetch('/api/user/subscription');
      if (response.ok) {
        const data = await response.json();
        setUserTier(data.tier || 'free');
      }
    } catch (error) {
      console.error('Failed to load user tier:', error);
      setUserTier('free');
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
    }
  };

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

  const handleCancelUpload = () => {
    uploadActions.resetUpload();
    setTitle('');
    setDescription('');
    setTags('');
    setArtistName('');
    setGenre('');
    setLyrics('');
    setLyricsLanguage('en');
    setEpisodeNumber('');
    setPodcastCategory('');
  };

  // Simple validation function
  const validateForm = () => {
    if (!title.trim()) return 'Title is required';
    if (contentType === 'music' && !artistName.trim()) return 'Artist name is required';
    if (contentType === 'podcast' && !episodeNumber.trim()) return 'Episode number is required';
    if (!uploadState.audioFile) return 'Audio file is required';
    return null;
  };

  // Simple validation modal
  const ValidationModal = () => {
    if (!showValidationModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Validating Upload
              </h3>
              <button
                onClick={() => setShowValidationModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {isValidating && (
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Analyzing your audio file...
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                </div>
              </div>
            )}

            {validationResult === 'success' && (
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-green-700 dark:text-green-300 mb-2">
                  Validation Complete!
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Your file is ready for upload.
                </p>
                <button
                  onClick={() => {
                    setShowValidationModal(false);
                    proceedWithUpload();
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Continue Upload
                </button>
              </div>
            )}

            {validationResult === 'error' && (
              <div className="text-center">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-red-700 dark:text-red-300 mb-2">
                  Validation Failed
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  There was an issue with your file. Please try again.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setValidationResult(null);
                      setIsValidating(true);
                      // Simulate validation again
                      setTimeout(() => setValidationResult('success'), 2000);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => setShowValidationModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Handle publish with validation
  const handlePublish = async () => {
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    console.log('🎯 Starting validation...');
    setShowValidationModal(true);
    setIsValidating(true);
    setValidationResult(null);

    // Simulate validation process
    setTimeout(() => {
      setIsValidating(false);
      setValidationResult('success');
    }, 3000);
  };

  // Proceed with actual upload
  const proceedWithUpload = async () => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    try {
      // Use the uploadTrack method from the hook
      const trackData = {
        title: title.trim(),
        description: description.trim(),
        tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
        privacy: privacy as 'public' | 'private',
        publishOption: publishOption as 'now' | 'draft' | 'schedule',
        scheduleDate: publishOption === 'schedule' ? scheduleDate : undefined,
        // Content-specific data
        ...(contentType === 'music' ? {
          artistName: artistName.trim(),
          genre: genre.trim(),
          lyrics: lyrics.trim(),
          lyricsLanguage: lyricsLanguage,
          // Audio quality fields with defaults
          audioQuality: 'standard',
          bitrate: 128,
          sampleRate: 44100,
          channels: 2,
          codec: 'mp3'
        } : {
          episodeNumber: episodeNumber.trim(),
          category: podcastCategory.trim()
        })
      };

      const success = await uploadActions.uploadTrack(trackData, selectedQuality);
      
      if (success) {
        // Reset form
        setTitle('');
        setDescription('');
        setTags('');
        setArtistName('');
        setGenre('');
        setLyrics('');
        setLyricsLanguage('en');
        setEpisodeNumber('');
        setPodcastCategory('');
        uploadActions.resetUpload();
        
        // Redirect to success page
        window.location.href = `/upload/success?title=${encodeURIComponent(title)}&type=${contentType}`;
      } else {
        console.error('Upload failed');
        alert('Upload failed. Please try again.');
      }

    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    }
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

  const genres = [
    'Electronic', 'Hip Hop', 'Rock', 'Pop', 'Jazz', 'Classical', 'Country', 'R&B', 'Reggae', 'Blues', 'Folk', 'Alternative'
  ];

  const podcastCategories = [
    'Technology', 'Business', 'Education', 'Entertainment', 'News', 'Sports', 'Health', 'Science', 'Arts', 'Comedy', 'True Crime', 'History'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Please log in to upload content
          </h1>
          <Link href="/login" className="text-blue-600 hover:text-blue-700">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-pink-500 rounded-lg flex items-center justify-center">
                  <Music className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">SOUNDBRIDGE</span>
              </Link>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">For You</Link>
              <Link href="/discover" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Discover</Link>
              <Link href="/events" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Events</Link>
              <Link href="/creators" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Creators</Link>
            </nav>

            <div className="flex items-center space-x-4">
              <div className="hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search creators, events, pod..."
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="relative">
                <button className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Content Type Selection */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Upload Content</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contentTypes.map((type) => (
              <div
                key={type.id}
                onClick={() => setContentType(type.id)}
                className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all ${
                  contentType === type.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
                    style={{ background: type.color }}
                  >
                    <type.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {type.label}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {type.description}
                    </p>
                  </div>
                </div>
                {contentType === type.id && (
                  <CheckCircle className="absolute top-4 right-4 h-6 w-6 text-blue-500" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Upload Form */}
        <div className="space-y-6">
          {/* File Upload */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Audio File
            </h3>
            
            {!uploadState.audioFile ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <FileAudio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Drop your audio file here
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  or click to browse
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Supports MP3, WAV, M4A, AAC, OGG, FLAC (Max 100MB)
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileAudio className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {uploadState.audioFile.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {(uploadState.audioFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => uploadActions.setAudioFile(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Basic Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your track title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your content"
                />
              </div>

              {contentType === 'music' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Artist Name *
                    </label>
                    <input
                      type="text"
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter artist name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Genre
                    </label>
                    <select
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select genre</option>
                      {genres.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Lyrics (Optional)
                    </label>
                    <textarea
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                      placeholder="Enter song lyrics (one line per verse)&#10;&#10;Example:&#10;Amazing grace, how sweet the sound&#10;That saved a wretch like me"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Add lyrics to help listeners sing along
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Lyrics Language
                    </label>
                    <select
                      value={lyricsLanguage}
                      onChange={(e) => setLyricsLanguage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="en">English</option>
                      <option value="yo">Yoruba</option>
                      <option value="ig">Igbo</option>
                      <option value="pcm">Pidgin</option>
                      <option value="ha">Hausa</option>
                      <option value="fr">French</option>
                      <option value="es">Spanish</option>
                    </select>
                  </div>
                </>
              )}

              {contentType === 'podcast' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Episode Number *
                    </label>
                    <input
                      type="text"
                      value={episodeNumber}
                      onChange={(e) => setEpisodeNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Episode 1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={podcastCategory}
                      onChange={(e) => setPodcastCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select category</option>
                      {podcastCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter tags separated by commas"
                />
              </div>
            </div>
          </div>

          {/* Audio Quality Selection */}
          {uploadState.audioFile && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <AudioQualitySelector
                userTier={userTier}
                selectedQuality={selectedQuality}
                onQualityChange={setSelectedQuality}
                audioFile={uploadState.audioFile}
                duration={uploadState.audioMetadata?.duration}
              />
            </div>
          )}

          {/* Privacy Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              Privacy Settings
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="privacy"
                  value="public"
                  checked={privacy === 'public'}
                  onChange={(e) => setPrivacy(e.target.value)}
                  className="mr-3"
                />
                <span className="text-gray-700 dark:text-gray-300">Public - Anyone can view</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="privacy"
                  value="followers"
                  checked={privacy === 'followers'}
                  onChange={(e) => setPrivacy(e.target.value)}
                  className="mr-3"
                />
                <span className="text-gray-700 dark:text-gray-300">Followers Only</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="privacy"
                  value="private"
                  checked={privacy === 'private'}
                  onChange={(e) => setPrivacy(e.target.value)}
                  className="mr-3"
                />
                <span className="text-gray-700 dark:text-gray-300">Private - Only you can view</span>
              </label>
            </div>
          </div>

          {/* Publishing Options */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Publishing Options
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="publishOption"
                  value="now"
                  checked={publishOption === 'now'}
                  onChange={(e) => setPublishOption(e.target.value)}
                  className="mr-3"
                />
                <span className="text-gray-700 dark:text-gray-300">Publish Now</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="publishOption"
                  value="schedule"
                  checked={publishOption === 'schedule'}
                  onChange={(e) => setPublishOption(e.target.value)}
                  className="mr-3"
                />
                <span className="text-gray-700 dark:text-gray-300">Schedule for Later</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="publishOption"
                  value="draft"
                  checked={publishOption === 'draft'}
                  onChange={(e) => setPublishOption(e.target.value)}
                  className="mr-3"
                />
                <span className="text-gray-700 dark:text-gray-300">Save as Draft</span>
              </label>
            </div>
          </div>

          {/* Cover Art */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Cover Art
            </h3>
            <ImageUpload
              onImageSelect={handleCoverArtSelect}
              onImageRemove={handleCoverArtRemove}
              selectedFile={uploadState.coverArtFile}
              isUploading={uploadState.isUploading && !!uploadState.coverArtFile}
              uploadProgress={uploadState.uploadProgress.cover}
              uploadStatus={uploadState.uploadStatus}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6">
            <button
              onClick={handleCancelUpload}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel Upload
            </button>

            <button
              onClick={handlePublish}
              disabled={uploadState.isUploading || isValidating}
              className="px-8 py-3 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {uploadState.isUploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : isValidating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Validating...</span>
                </>
              ) : (
                <span>Publish {contentType === 'music' ? 'Track' : 'Episode'}</span>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Validation Modal */}
      <ValidationModal />

      <Footer />
    </div>
  );
}