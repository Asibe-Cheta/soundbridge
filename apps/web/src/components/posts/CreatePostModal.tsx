'use client';

import React, { useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useAuth } from '@/src/contexts/AuthContext';
import { X, Image as ImageIcon, Music, Globe, Users, Loader2, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { hasUrls, extractUrls } from '@/src/lib/link-utils';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

const MAX_CONTENT_LENGTH = 500;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_DURATION = 60; // seconds

export function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'update' | 'opportunity' | 'achievement' | 'collaboration' | 'event'>('update');
  const [visibility, setVisibility] = useState<'connections' | 'public'>('connections');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WEBP)');
      return;
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      setError(`Image must be less than ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
      return;
    }

    setImageFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Clear audio if image is selected
    if (audioFile) {
      setAudioFile(null);
      setUploadedAudioUrl(null);
    }
  };

  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      setError('Please select an audio file (MP3, WAV)');
      return;
    }

    // Validate file size
    if (file.size > MAX_AUDIO_SIZE) {
      setError(`Audio must be less than ${MAX_AUDIO_SIZE / 1024 / 1024}MB`);
      return;
    }

    // Validate duration (approximate)
    try {
      const audio = new Audio(URL.createObjectURL(file));
      audio.onloadedmetadata = () => {
        const duration = audio.duration;
        if (duration > MAX_AUDIO_DURATION) {
          setError(`Audio must be less than ${MAX_AUDIO_DURATION} seconds`);
          audio.remove();
          return;
        }
        setAudioFile(file);
        setError(null);
      };
      audio.onerror = () => {
        setError('Invalid audio file');
      };
    } catch (err) {
      setError('Could not validate audio file');
      return;
    }

    // Clear image if audio is selected
    if (imageFile) {
      setImageFile(null);
      setImagePreview(null);
      setUploadedImageUrl(null);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    const formData = new FormData();
    formData.append('file', imageFile);

    try {
      const response = await fetch('/api/posts/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();
      if (data.success && data.data?.file_url) {
        return data.data.file_url;
      } else {
        throw new Error(data.error || 'Failed to upload image');
      }
    } catch (err: any) {
      throw new Error(err.message || 'Failed to upload image');
    }
  };

  const uploadAudio = async (): Promise<string | null> => {
    if (!audioFile) return null;

    const formData = new FormData();
    formData.append('file', audioFile);

    try {
      const response = await fetch('/api/posts/upload-audio', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();
      if (data.success && data.data?.file_url) {
        return data.data.file_url;
      } else {
        throw new Error(data.error || 'Failed to upload audio');
      }
    } catch (err: any) {
      throw new Error(err.message || 'Failed to upload audio');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && !imageFile && !audioFile) {
      setError('Please add some content, an image, or audio');
      return;
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      setError(`Content must be ${MAX_CONTENT_LENGTH} characters or less`);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Step 1: Create post first
      const postData: any = {
        content: content.trim(),
        visibility,
        post_type: postType,
      };
      
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(postData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create post');
      }

      const postId = data.data.id;

      // Step 2: Upload attachments with post_id to create attachment records
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('post_id', postId);

        try {
          const uploadResponse = await fetch('/api/posts/upload-image', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });

          const uploadData = await uploadResponse.json();
          if (!uploadData.success) {
            console.error('Failed to upload image:', uploadData.error);
            // Continue anyway - post is created
          }
        } catch (uploadErr) {
          console.error('Error uploading image:', uploadErr);
          // Continue anyway - post is created
        }
      }

      if (audioFile) {
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('post_id', postId);

        try {
          const uploadResponse = await fetch('/api/posts/upload-audio', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });

          const uploadData = await uploadResponse.json();
          if (!uploadData.success) {
            console.error('Failed to upload audio:', uploadData.error);
            // Continue anyway - post is created
          }
        } catch (uploadErr) {
          console.error('Error uploading audio:', uploadErr);
          // Continue anyway - post is created
        }
      }
      
      // Reset form
      setContent('');
      setImageFile(null);
      setAudioFile(null);
      setImagePreview(null);
      setUploadedImageUrl(null);
      setUploadedAudioUrl(null);
      setPostType('update');
      setVisibility('connections');

      // Close modal and refresh
      onPostCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create post. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    setContent('');
    setImageFile(null);
    setAudioFile(null);
    setImagePreview(null);
    setUploadedImageUrl(null);
    setUploadedAudioUrl(null);
    setError(null);
    setPostType('update');
    setVisibility('connections');
    onClose();
  };

  const remainingChars = MAX_CONTENT_LENGTH - content.length;
  
  // Detect URLs in content
  const detectedUrls = useMemo(() => {
    if (!content) return [];
    return extractUrls(content);
  }, [content]);
  
  const hasLinks = detectedUrls.length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Create Post</h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-center gap-2 text-red-400">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-pink-500 flex items-center justify-center text-white font-semibold">
              {user?.user_metadata?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="text-white font-medium">
                {user?.user_metadata?.full_name || 'You'}
              </div>
              <div className="text-sm text-gray-400">
                Posting as yourself
              </div>
            </div>
          </div>

          {/* Content Textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What do you want to share? You can paste links and they'll be clickable."
            className="w-full min-h-[120px] bg-gray-800 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-red-500/50 transition-colors"
            maxLength={MAX_CONTENT_LENGTH}
            disabled={isUploading}
          />
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {hasLinks && (
                <div className="flex items-center gap-1 text-red-400">
                  <LinkIcon size={14} />
                  <span>{detectedUrls.length} link{detectedUrls.length > 1 ? 's' : ''} detected</span>
                </div>
              )}
            </div>
            <span className="text-gray-400">
              {remainingChars} characters remaining
            </span>
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative rounded-lg overflow-hidden border border-white/10">
              <Image
                src={imagePreview}
                alt="Preview"
                width={800}
                height={600}
                className="w-full h-auto max-h-64 object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                  setUploadedImageUrl(null);
                  if (imageInputRef.current) imageInputRef.current.value = '';
                }}
                className="absolute top-2 right-2 p-2 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                disabled={isUploading}
              >
                <X size={16} className="text-white" />
              </button>
            </div>
          )}

          {/* Audio Preview */}
          {audioFile && (
            <div className="bg-gray-800 border border-white/10 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-600 to-pink-500 flex items-center justify-center">
                  <Music size={20} className="text-white" />
                </div>
                <div>
                  <div className="text-white font-medium">
                    {audioFile.name}
                  </div>
                  <div className="text-sm text-gray-400">
                    {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAudioFile(null);
                  setUploadedAudioUrl(null);
                  if (audioInputRef.current) audioInputRef.current.value = '';
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                disabled={isUploading}
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>
          )}

          {/* Attachment Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageSelect}
              className="hidden"
              disabled={isUploading}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploading || !!audioFile}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 border border-white/10 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ImageIcon size={18} className="text-gray-400" />
              <span className="text-sm text-gray-300">Photo</span>
            </button>

            <input
              ref={audioInputRef}
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav"
              onChange={handleAudioSelect}
              className="hidden"
              disabled={isUploading}
            />
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              disabled={isUploading || !!imageFile}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 border border-white/10 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Music size={18} className="text-gray-400" />
              <span className="text-sm text-gray-300">Audio (max 60s)</span>
            </button>
          </div>

          {/* Post Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Post Type
            </label>
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value as any)}
              className="w-full bg-gray-800 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-red-500/50"
              disabled={isUploading}
            >
              <option value="update">Update</option>
              <option value="opportunity">Opportunity</option>
              <option value="achievement">Achievement</option>
              <option value="collaboration">Collaboration</option>
              <option value="event">Event</option>
            </select>
          </div>

          {/* Visibility Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Visibility
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setVisibility('connections')}
                disabled={isUploading}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  visibility === 'connections'
                    ? 'border-red-500/50 bg-red-500/10 text-white'
                    : 'border-white/10 bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Users size={16} />
                <span>Connections Only</span>
              </button>
              <button
                type="button"
                onClick={() => setVisibility('public')}
                disabled={isUploading}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  visibility === 'public'
                    ? 'border-red-500/50 bg-red-500/10 text-white'
                    : 'border-white/10 bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Globe size={16} />
                <span>Public</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-lg bg-gray-800 border border-white/10 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || (!content.trim() && !imageFile && !audioFile)}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-red-600 to-pink-500 text-white font-medium hover:from-red-700 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading && <Loader2 size={16} className="animate-spin" />}
              {isUploading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

