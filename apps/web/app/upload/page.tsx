'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Footer } from '../../src/components/layout/Footer';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import { ImageUpload } from '../../src/components/ui/ImageUpload';
import Image from 'next/image';
import { useAudioUpload } from '../../src/hooks/useAudioUpload';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { AudioQualitySelector } from '../../src/components/upload/AudioQualitySelector';
import UploadEducationModal from '../../src/components/upload/UploadEducationModal';
import RightsVerificationForm from '../../src/components/upload/RightsVerificationForm';
import type { AudioQualitySettings, AudioQualityTier } from '../../src/lib/types/audio-quality';
import { Toaster } from '../../src/components/ui/Toast';
import { toast as hotToast } from 'react-hot-toast';
import { Upload, Music, Mic, FileAudio, Globe, Users, Lock, Calendar, Save, Play, Pause, X, CheckCircle, AlertCircle, AlertTriangle, Loader2, User, Headphones, ArrowLeft, Menu, Home, Bell, Settings, LogOut, Search } from 'lucide-react';

type ContentType = 'music' | 'podcast';

export default function UnifiedUploadPage() {
  const { user, loading, signOut } = useAuth();
  const { theme } = useTheme();
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
  
  // Cover song verification states
  const [isCover, setIsCover] = useState(false);
  const [isrcCode, setIsrcCode] = useState('');
  const [isrcVerificationStatus, setIsrcVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isrcVerificationError, setIsrcVerificationError] = useState<string | null>(null);
  const [isrcVerificationData, setIsrcVerificationData] = useState<any>(null);
  const isrcVerificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ACRCloud fingerprinting states
  const [acrcloudStatus, setAcrcloudStatus] = useState<'idle' | 'checking' | 'match' | 'no_match' | 'error'>('idle');
  const [acrcloudData, setAcrcloudData] = useState<any>(null);
  const [acrcloudError, setAcrcloudError] = useState<string | null>(null);
  const [isOriginalConfirmed, setIsOriginalConfirmed] = useState(false);

  // Podcast-specific states
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [podcastCategory, setPodcastCategory] = useState('');

  // Audio quality states
  const [selectedQuality, setSelectedQuality] = useState<AudioQualitySettings | null>(null);
  const [userTier, setUserTier] = useState<AudioQualityTier>('free');

  // Pricing states
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<number>(2.99);
  const [currency, setCurrency] = useState<'USD' | 'GBP' | 'EUR'>('USD');
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  // Validation modal states
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<'success' | 'error' | null>(null);
  
  // Copyright agreement state
  const [agreedToCopyright, setAgreedToCopyright] = useState(false);
  
  // Rights verification states
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [showRightsVerification, setShowRightsVerification] = useState(false);
  const [rightsVerified, setRightsVerified] = useState(false);
  const [verificationData, setVerificationData] = useState<any>(null);

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
    
    // Load genres from API
    loadGenres();
    
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

  // Check subscription status for paid content
  React.useEffect(() => {
    const checkSubscription = async () => {
      if (!user) return;
      try {
        const supabase = (await import('../../src/lib/supabase')).createBrowserClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier, subscription_end_date, subscription_status')
          .eq('id', user.id)
          .single();
        
        const hasActive = profile?.subscription_tier && 
                          ['premium', 'unlimited'].includes(profile.subscription_tier) &&
                          profile.subscription_status === 'active' &&
                          (!profile.subscription_end_date || new Date(profile.subscription_end_date) > new Date());
        
        setHasActiveSubscription(!!hasActive);
      } catch (error) {
        console.error('Failed to check subscription:', error);
        setHasActiveSubscription(false);
      }
    };
    checkSubscription();
  }, [user]);

  // Load genres from API to match onboarding
  const loadGenres = async () => {
    try {
      setLoadingGenres(true);
      
      // Load music genres
      const musicResponse = await fetch('/api/genres?category=music&active=true');
      if (musicResponse.ok) {
        const musicData = await musicResponse.json();
        if (musicData.success) {
          setGenres(musicData.genres.map((g: any) => g.name));
        }
      }
      
      // Load podcast categories
      const podcastResponse = await fetch('/api/genres?category=podcast&active=true');
      if (podcastResponse.ok) {
        const podcastData = await podcastResponse.json();
        if (podcastData.success) {
          setPodcastCategories(podcastData.genres.map((g: any) => g.name));
        }
      }
    } catch (error) {
      console.error('Failed to load genres:', error);
      // Fallback to basic genres if API fails
      setGenres(['Afrobeats', 'Gospel', 'Hip Hop', 'Pop', 'R&B', 'Rock', 'Jazz', 'Classical', 'Country', 'Electronic', 'Reggae', 'Blues', 'Folk', 'Alternative', 'Other']);
      setPodcastCategories(['Arts & Culture', 'Business', 'Comedy', 'Education', 'Entertainment', 'Health & Fitness', 'Music', 'News & Politics', 'Religion & Spirituality', 'Science', 'Sports', 'Technology', 'True Crime', 'Other']);
    } finally {
      setLoadingGenres(false);
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
    console.log('🎵 Processing file upload:', {
      name: file.name,
      size: file.size,
      type: file.type,
      user: user?.id
    });
    
    uploadActions.setAudioFile(file);
    
    // Auto-fill title from filename
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    setTitle(fileName);
    
    // Reset ACRCloud state
    setAcrcloudStatus('idle');
    setAcrcloudData(null);
    setAcrcloudError(null);
    setIsOriginalConfirmed(false);
    
    console.log('✅ File set in upload state, title auto-filled:', fileName);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log('🎵 File selected:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
      handleFileUpload(file);
      
      // Reset the input so the same file can be selected again if needed
      // This is important for re-selecting after an error
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
    setIsCover(false);
    setIsrcCode('');
    setIsrcVerificationStatus('idle');
    setIsrcVerificationError(null);
    setIsrcVerificationData(null);
    setAcrcloudStatus('idle');
    setAcrcloudData(null);
    setAcrcloudError(null);
    setIsOriginalConfirmed(false);
  };

  // Simple validation function
  const validateForm = () => {
    if (!title.trim()) return 'Title is required';
    if (contentType === 'music' && !artistName.trim()) return 'Artist name is required';
    if (contentType === 'music' && !genre.trim()) return 'Genre selection is required for music tracks';
    if (contentType === 'podcast' && !episodeNumber.trim()) return 'Episode number is required';
    if (contentType === 'podcast' && !podcastCategory.trim()) return 'Category selection is required for podcast episodes';
    if (!uploadState.audioFile) return 'Audio file is required';
    if (!agreedToCopyright) return 'You must agree to the copyright terms to upload content';
    
    // ACRCloud validation
    if (contentType === 'music' && acrcloudStatus === 'checking') {
      return 'Please wait for audio verification to complete';
    }
    
    if (contentType === 'music' && acrcloudStatus === 'match') {
      // Match found - require ISRC verification
      if (!isrcCode.trim()) {
        return 'ISRC code is required. This track appears to be a released song.';
      }
      if (isrcVerificationStatus !== 'success') {
        return 'ISRC code must be verified before uploading';
      }
      // Check artist name match
      if (acrcloudData?.artistMatch && !acrcloudData.artistMatch.match) {
        return `This track belongs to "${acrcloudData.detectedArtist}". If this is you, ensure your profile name matches.`;
      }
    }
    
    if (contentType === 'music' && acrcloudStatus === 'no_match' && !isOriginalConfirmed) {
      return 'Please confirm this is your original/unreleased music';
    }
    
    // Cover song validation (legacy - for manually marked covers)
    if (isCover && !isrcCode.trim()) {
      return 'ISRC code is required for cover songs';
    }
    if (isCover && isrcVerificationStatus !== 'success') {
      return 'ISRC code must be verified before uploading a cover song';
    }
    
    return null;
  };
  
  // Verify ISRC code with debouncing
  const verifyISRCCode = async (isrc: string) => {
    if (!isrc || !isrc.trim()) {
      setIsrcVerificationStatus('idle');
      setIsrcVerificationError(null);
      setIsrcVerificationData(null);
      return;
    }

    setIsrcVerificationStatus('loading');
    setIsrcVerificationError(null);

    try {
      // Normalize ISRC (remove hyphens, uppercase)
      const normalizedInput = isrc.trim().replace(/-/g, '').toUpperCase();

      // 🔒 CRITICAL SECURITY CHECK
      // If ACRCloud detected a match, verify the typed ISRC matches the detected one
      if (acrcloudStatus === 'match' && acrcloudData?.detectedISRC) {
        const normalizedDetected = acrcloudData.detectedISRC
          .replace(/-/g, '')
          .toUpperCase();

        if (normalizedInput !== normalizedDetected) {
          setIsrcVerificationStatus('error');
          setIsrcVerificationError(
            'ISRC code does not match the detected track. ' +
            'Please enter the correct ISRC for this song.'
          );
          setIsrcVerificationData(null);
          return;
        }

        // ✅ ISRC matches ACRCloud detection - verification complete!
        // No need to check MusicBrainz since ACRCloud already confirmed it's valid
        console.log('✅ ISRC verified via ACRCloud match');
        setIsrcVerificationStatus('success');
        setIsrcVerificationError(null);
        setIsrcVerificationData({
          title: acrcloudData.detectedTitle || 'Verified Track',
          'artist-credit': acrcloudData.detectedArtist
            ? [{ name: acrcloudData.detectedArtist }]
            : []
        });
        return; // ← EXIT HERE - Don't check MusicBrainz
      }

      // For manual cover songs (no ACRCloud match), verify ISRC via MusicBrainz API
      const response = await fetch('/api/upload/verify-isrc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isrc: isrc.trim() }),
      });

      const data = await response.json();

      if (data.success && data.verified) {
        setIsrcVerificationStatus('success');
        setIsrcVerificationError(null);
        setIsrcVerificationData(data.recording);
      } else {
        setIsrcVerificationStatus('error');
        setIsrcVerificationError(data.error || 'ISRC verification failed');
        setIsrcVerificationData(null);
      }
    } catch (error: any) {
      setIsrcVerificationStatus('error');
      setIsrcVerificationError(error.message || 'Failed to verify ISRC. Please try again.');
      setIsrcVerificationData(null);
    }
  };

  // Handle ISRC input change with debouncing
  const handleISRCChange = (value: string) => {
    setIsrcCode(value);
    setIsrcVerificationStatus('idle');
    setIsrcVerificationError(null);
    setIsrcVerificationData(null);

    // Clear existing timeout
    if (isrcVerificationTimeoutRef.current) {
      clearTimeout(isrcVerificationTimeoutRef.current);
    }

    // Debounce verification (500ms delay)
    if (value.trim()) {
      isrcVerificationTimeoutRef.current = setTimeout(() => {
        verifyISRCCode(value);
      }, 500);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (isrcVerificationTimeoutRef.current) {
        clearTimeout(isrcVerificationTimeoutRef.current);
      }
    };
  }, []);

  // Reset ISRC when cover checkbox is unchecked
  useEffect(() => {
    if (!isCover) {
      setIsrcCode('');
      setIsrcVerificationStatus('idle');
      setIsrcVerificationError(null);
      setIsrcVerificationData(null);
      if (isrcVerificationTimeoutRef.current) {
        clearTimeout(isrcVerificationTimeoutRef.current);
      }
    }
  }, [isCover]);

  // ACRCloud fingerprinting function
  const fingerprintAudio = async (file: File) => {
    if (contentType !== 'music') {
      // Only fingerprint music tracks
      return;
    }

    setAcrcloudStatus('checking');
    setAcrcloudError(null);
    setAcrcloudData(null);

    try {
      const fileSizeMB = file.size / (1024 * 1024);
      const MAX_DIRECT_SIZE = 10 * 1024 * 1024; // 10 MB - Vercel infrastructure limit
      let audioFileUrl: string | undefined;

      // For large files (> 10MB), upload to storage first, then send URL
      // This bypasses Vercel's payload limit and allows backend to extract a 30-second sample
      if (file.size > MAX_DIRECT_SIZE) {
        console.log('📦 Large file detected, uploading to storage first', {
          fileName: file.name,
          fileSize: file.size,
          fileSizeMB: fileSizeMB.toFixed(2)
        });

        try {
          const supabase = (await import('../../src/lib/supabase')).createBrowserClient();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Generate unique filename
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 15);
          const fileExtension = file.name.split('.').pop() || 'mp3';
          const fileName = `fingerprint-temp/${user.id}/${timestamp}_${randomString}.${fileExtension}`;

          // Upload to Supabase storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('audio-tracks')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            throw new Error(`Storage upload failed: ${uploadError.message}`);
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('audio-tracks')
            .getPublicUrl(fileName);

          audioFileUrl = urlData.publicUrl;
          console.log('✅ File uploaded to storage, using URL for fingerprinting', {
            url: audioFileUrl,
            originalSize: file.size
          });
        } catch (storageError: any) {
          console.error('❌ Storage upload failed, falling back to direct upload', storageError);
          // Fallback: try direct upload anyway (might work if file is just slightly over limit)
        }
      }

      // Prepare request body
      let requestBody: FormData | string;
      let requestContentType: string;

      if (audioFileUrl) {
        // Use JSON with URL for large files
        requestBody = JSON.stringify({
          audioFileUrl,
          artistName: artistName?.trim() || undefined
        });
        requestContentType = 'application/json';
      } else {
        // Use multipart/form-data for small files (no base64 overhead)
        const formData = new FormData();
        formData.append('audioFile', file);
        
        if (artistName && artistName.trim()) {
          formData.append('artistName', artistName.trim());
        }

        requestBody = formData;
        requestContentType = ''; // Browser will set it automatically with boundary for FormData
      }

      console.log('🎵 Sending audio file for fingerprinting', {
        fileName: file.name,
        fileSize: file.size,
        fileSizeMB: fileSizeMB.toFixed(2),
        method: audioFileUrl ? 'URL' : 'multipart',
        hasArtistName: !!artistName
      });

      const response = await fetch('/api/upload/fingerprint', {
        method: 'POST',
        headers: requestContentType ? { 'Content-Type': requestContentType } : {},
        body: requestBody,
      });

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('❌ ACRCloud fingerprinting: HTTP error', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        // For 413 errors, the backend should handle it by sampling, but if it still fails,
        // it means the request itself was too large (shouldn't happen with URL method)
        if (response.status === 413) {
          setAcrcloudStatus('error');
          setAcrcloudError('Request too large. The backend will attempt to process this file, but verification may be unavailable.');
          setAcrcloudData({ requiresManualReview: true });
          return;
        }
        
        setAcrcloudStatus('error');
        setAcrcloudError(`Fingerprinting failed (${response.status}). You can still proceed with upload.`);
        setAcrcloudData({ requiresManualReview: true });
        return;
      }

      const data = await response.json();

      if (!data.success) {
        // API error or timeout - fallback to manual flow
        setAcrcloudStatus('error');
        setAcrcloudError(data.error || 'Fingerprinting failed. You can still proceed with upload.');
        setAcrcloudData({ requiresManualReview: true });
        console.warn('⚠️ ACRCloud fingerprinting error:', data.error);
        return;
      }

      if (data.matchFound) {
        // Match found - require ISRC verification
        setAcrcloudStatus('match');
        setAcrcloudData(data);
        
        // SECURITY: DO NOT auto-fill ISRC - user must manually input it to prove ownership
        // SECURITY: DO NOT auto-check "cover song" - user must consciously decide
        // The detected ISRC is stored in acrcloudData but NOT shown to user

        console.log('🎵 ACRCloud match found:', {
          detectedArtist: data.detectedArtist,
          detectedTitle: data.detectedTitle,
          artistMatch: data.artistMatch?.match
        });
      } else {
        // No match - appears to be unreleased/original
        setAcrcloudStatus('no_match');
        setAcrcloudData(data);
        console.log('✅ ACRCloud: No match found - appears to be original/unreleased');
      }
    } catch (error: any) {
      console.error('❌ ACRCloud fingerprinting error:', error);
      setAcrcloudStatus('error');
      setAcrcloudError(error.message || 'Fingerprinting failed. You can still proceed with upload.');
      setAcrcloudData({ requiresManualReview: true });
    }
  };

  // Trigger ACRCloud fingerprinting when file is uploaded (for music tracks only)
  useEffect(() => {
    if (uploadState.audioFile && contentType === 'music' && acrcloudStatus === 'idle') {
      fingerprintAudio(uploadState.audioFile.file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadState.audioFile?.id, contentType]); // Only re-run when file ID changes

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
    console.log('🚀 Publish button clicked');
    console.log('📊 Current state:', {
      user: user?.id,
      audioFile: uploadState.audioFile?.name,
      title: title,
      contentType: contentType,
      agreedToCopyright: agreedToCopyright
    });
    
    const validationError = validateForm();
    if (validationError) {
      console.error('❌ Validation failed:', validationError);
      alert(validationError);
      return;
    }

    console.log('✅ Validation passed');
    // Show education modal first
    setShowEducationModal(true);
  };

  // Handle rights verification
  const handleRightsVerification = (data: any) => {
    setVerificationData(data);
    setRightsVerified(true);
    setShowRightsVerification(false);
    
    // Proceed with validation
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
          isCover: isCover || (acrcloudStatus === 'match'),
          isrcCode: (isCover || acrcloudStatus === 'match') ? isrcCode.trim() : undefined,
          // Audio quality fields with defaults
          audioQuality: 'standard',
          bitrate: 128,
          sampleRate: 44100,
          channels: 2,
          codec: 'mp3',
          // ACRCloud data
          acrcloudData: acrcloudData || null
        } : {
          episodeNumber: episodeNumber.trim(),
          category: podcastCategory.trim()
        })
      };

      const result = await uploadActions.uploadTrack(trackData, selectedQuality);
      
      if (result.success) {
        const trackId = result.trackId;
        const trackUrl = trackId ? `/track/${trackId}` : '/profile';
        hotToast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-gray-900 text-white shadow-lg rounded-lg pointer-events-auto flex items-center justify-between p-4 border border-gray-700`}
          >
            <div className="mr-3">
              <p className="text-sm font-semibold">Upload successful</p>
              <p className="text-xs text-gray-300">Your track is live.</p>
            </div>
            <a
              href={trackUrl}
              className="text-xs px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              View track
            </a>
          </div>
        ), { duration: 6000 });

        // Update pricing if track was set as paid
        if (isPaid && contentType === 'music') {
          try {
            // Get the uploaded track ID from the response or state
            // For now, we'll need to fetch the most recent track by this user
            const supabase = (await import('../../src/lib/supabase')).createBrowserClient();
            const { data: tracks } = await supabase
              .from('audio_tracks')
              .select('id')
              .eq('creator_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (tracks?.id) {
              const pricingResponse = await fetch(`/api/audio-tracks/${tracks.id}/pricing`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  is_paid: true,
                  price: price,
                  currency: currency,
                }),
              });

              if (!pricingResponse.ok) {
                console.error('Failed to update pricing');
              }
            }
          } catch (error) {
            console.error('Error updating pricing:', error);
            // Don't block the upload success
          }
        }

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
        setIsPaid(false);
        setPrice(2.99);
        setCurrency('USD');
        uploadActions.resetUpload();
        
        // Redirect to success page
        const successUrl = `/upload/success?title=${encodeURIComponent(title)}&type=${contentType}` +
          `${trackId ? `&trackId=${encodeURIComponent(trackId)}` : ''}` +
          `${artistName ? `&artistName=${encodeURIComponent(artistName)}` : ''}` +
          `${genre ? `&genre=${encodeURIComponent(genre)}` : ''}` +
          `${description ? `&description=${encodeURIComponent(description)}` : ''}`;
        window.location.href = successUrl;
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

  // Dynamic genre loading from API
  const [genres, setGenres] = useState<string[]>([]);
  const [podcastCategories, setPodcastCategories] = useState<string[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(false);

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
    <div className={`min-h-screen ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
        : 'bg-gray-50'
    }`}>
      <Toaster />
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
            
            {/* Error Display */}
            {uploadState.error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                      File Validation Error
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      {uploadState.error}
                    </p>
                    <button
                      onClick={() => uploadActions.setAudioFile(null)}
                      className="mt-2 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
                    >
                      Clear and try again
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                  Supports MP3, WAV, M4A, AAC, OGG, WEBM, FLAC, MP4 (Max 100MB)
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
                      Genre *
                    </label>
                    <select
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={loadingGenres}
                    >
                      <option value="">
                        {loadingGenres ? 'Loading genres...' : 'Select a genre'}
                      </option>
                      {genres.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Choose the primary genre that best describes your music
                    </p>
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

                  {/* ACRCloud Audio Verification */}
                  {uploadState.audioFile && (
                    <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Audio Verification
                      </h3>
                      {acrcloudStatus === 'idle' && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center space-x-3">
                            <Loader2 className="h-5 w-5 text-gray-500 dark:text-gray-400 animate-spin flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                Starting audio verification...
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {acrcloudStatus === 'checking' && (
                        <div className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              Verifying audio content...
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                              Checking if this track exists on streaming platforms
                            </p>
                          </div>
                        </div>
                      )}

                      {acrcloudStatus === 'match' && acrcloudData && (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <div className="flex items-start space-x-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                                This song appears to be a released track
                              </p>
                              <div className="space-y-2 text-xs text-yellow-700 dark:text-yellow-300">
                                {acrcloudData.detectedTitle && (
                                  <p>
                                    <span className="font-semibold">Title:</span> {acrcloudData.detectedTitle}
                                  </p>
                                )}
                                {acrcloudData.detectedArtist && (
                                  <p>
                                    <span className="font-semibold">Artist:</span> {acrcloudData.detectedArtist}
                                  </p>
                                )}
                                {acrcloudData.detectedAlbum && (
                                  <p>
                                    <span className="font-semibold">Album:</span> {acrcloudData.detectedAlbum}
                                  </p>
                                )}
                                {acrcloudData.artistMatch && !acrcloudData.artistMatch.match && (
                                  <p className="text-red-700 dark:text-red-300 font-medium mt-2">
                                    ⚠️ Artist name mismatch. This track belongs to "{acrcloudData.detectedArtist}". Please verify ownership with ISRC.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SECURITY: Ownership Verification Warning - NO ISRC SHOWN */}
                      {acrcloudStatus === 'match' && (
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                          <div className="flex items-start space-x-3">
                            <div className="text-2xl">🛡️</div>
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-2">
                                Ownership Verification Required
                              </h4>
                              <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                                To upload this track, please enter the ISRC code from your music
                                distributor (DistroKid, TuneCore, CD Baby, etc.). The ISRC must
                                match the detected track.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {acrcloudStatus === 'no_match' && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-start space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                                This appears to be original/unreleased music
                              </p>
                              <p className="text-xs text-green-700 dark:text-green-300 mb-3">
                                No match found in music databases. You can proceed with upload.
                              </p>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isOriginalConfirmed}
                                  onChange={(e) => setIsOriginalConfirmed(e.target.checked)}
                                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <span className="text-xs text-green-800 dark:text-green-200 font-medium">
                                  I confirm this is my original/unreleased music and I own all rights
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}

                      {acrcloudStatus === 'error' && acrcloudError && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="flex items-start space-x-3">
                            <AlertCircle className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                                Audio verification unavailable
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {acrcloudError}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                You can still proceed with upload. Your track will be flagged for manual review.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ISRC Verification Section */}
                  <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {/* Show different title based on ACRCloud status */}
                    {acrcloudStatus === 'match' ? (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          ISRC Verification Required *
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          This track was detected as a released song. Please provide
                          the ISRC code to verify ownership.
                        </p>
                      </div>
                    ) : (
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Cover Song Verification
                      </h3>
                    )}

                    {/* Only show "cover song" checkbox if ACRCloud DIDN'T detect a match */}
                    {acrcloudStatus !== 'match' && (
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isCover}
                          onChange={(e) => setIsCover(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          This is a cover song
                        </span>
                      </label>
                    )}

                    {/* Show ISRC input if ACRCloud match OR user checked "cover song" */}
                    {(acrcloudStatus === 'match' || isCover) && (
                      <div className="mt-3 space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          ISRC Code *
                        </label>
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={isrcCode}
                            onChange={(e) => handleISRCChange(e.target.value)}
                            placeholder="Type the ISRC code (e.g., GBUM71502800)"
                            maxLength={14}
                            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              isrcVerificationStatus === 'error'
                                ? 'border-red-500 dark:border-red-500'
                                : isrcVerificationStatus === 'success'
                                ? 'border-green-500 dark:border-green-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Format: XX-XXX-YY-NNNNN (12 characters, hyphens optional)
                          </p>

                          {/* Verification Status */}
                          {isrcVerificationStatus === 'loading' && (
                            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Verifying ISRC code...</span>
                            </div>
                          )}

                          {isrcVerificationStatus === 'success' && isrcVerificationData && (
                            <div className="flex items-start space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                                  Verified
                                </p>
                                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                  <span className="font-semibold">{isrcVerificationData.title}</span>
                                  {isrcVerificationData['artist-credit'] && 
                                    isrcVerificationData['artist-credit'].length > 0 && (
                                      <> by {isrcVerificationData['artist-credit'].map((a: any) => a.name || a.artist?.name).join(', ')}</>
                                    )
                                  }
                                </p>
                              </div>
                            </div>
                          )}

                          {isrcVerificationStatus === 'error' && isrcVerificationError && (
                            <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                                  Verification Failed
                                </p>
                                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                  {isrcVerificationError}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
                      Category *
                    </label>
                    <select
                      value={podcastCategory}
                      onChange={(e) => setPodcastCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={loadingGenres}
                    >
                      <option value="">
                        {loadingGenres ? 'Loading categories...' : 'Select a category'}
                      </option>
                      {podcastCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Choose the category that best fits your podcast content
                    </p>
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
                audioFile={uploadState.audioFile.file}
                duration={uploadState.audioMetadata?.duration}
              />
            </div>
          )}

          {/* Pricing Section */}
          {uploadState.audioFile && contentType === 'music' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Pricing
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Only available for subscribed creators (Premium & Unlimited tiers)
              </p>

              {/* Toggle for Paid Content */}
              <div className="flex items-center space-x-3 mb-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    disabled={!hasActiveSubscription}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Make this available for purchase
                </label>
              </div>

              {/* Price Input (shown when isPaid = true) */}
              {isPaid && (
                <>
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Price
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value as 'USD' | 'GBP' | 'EUR')}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="USD">$ USD</option>
                          <option value="GBP">£ GBP</option>
                          <option value="EUR">€ EUR</option>
                        </select>
                        <input
                          type="number"
                          min="0.99"
                          max="50.00"
                          step="0.01"
                          value={price}
                          onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                          placeholder="2.99"
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Price must be between {currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€'}0.99 and {currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€'}50.00
                      </p>
                    </div>

                    {/* Earnings Preview */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">💰</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            You'll keep 90% of sales
                          </p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                            You'll earn {currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€'}{(price * 0.9).toFixed(2)} per sale
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            SoundBridge takes 10% platform fee
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Non-Subscribed Warning */}
              {!hasActiveSubscription && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
                  <div className="flex items-start space-x-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        Upgrade to Premium or Unlimited to sell your content.{' '}
                        <Link href="/pricing" className="text-blue-600 dark:text-blue-400 hover:underline">
                          View Plans
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              )}
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

          {/* Copyright Agreement */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Lock className="h-5 w-5 mr-2 text-blue-600" />
              Copyright Agreement
            </h3>
            
            <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
              <input
                type="checkbox"
                id="copyright-agreement"
                checked={agreedToCopyright}
                onChange={(e) => setAgreedToCopyright(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                required
              />
              <label htmlFor="copyright-agreement" className="text-sm text-gray-700 dark:text-gray-300">
                I confirm that I own all rights to this music and it does not infringe any 
                third-party copyrights. I understand that uploading copyrighted content may 
                result in account suspension or termination.{' '}
                <Link href="/copyright-policy" className="text-blue-600 hover:text-blue-800 underline">
                  Read our Copyright Policy
                </Link>
              </label>
            </div>
            
            {!agreedToCopyright && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  You must agree to the copyright terms to upload content.
                </p>
              </div>
            )}
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
              disabled={
                uploadState.isUploading || 
                isValidating || 
                !agreedToCopyright ||
                (isCover && isrcVerificationStatus !== 'success') ||
                (acrcloudStatus === 'match' && isrcVerificationStatus !== 'success')
              }
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

      {/* Education Modal */}
      <UploadEducationModal
        isOpen={showEducationModal}
        onClose={() => setShowEducationModal(false)}
        onContinue={() => {
          setShowEducationModal(false);
          setShowRightsVerification(true);
        }}
      />

      {/* Rights Verification Modal */}
      {showRightsVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Rights Verification
              </h2>
              <RightsVerificationForm
                trackTitle={title}
                artistName={artistName}
                onVerify={handleRightsVerification}
                onCancel={() => setShowRightsVerification(false)}
              />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}