'use client';

import React, { useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { useAuth } from '@/src/contexts/AuthContext';
import { X, Image as ImageIcon, Music, Globe, Users, Loader2, AlertCircle, Link as LinkIcon, Flame } from 'lucide-react';
import { hasUrls, extractUrls } from '@/src/lib/link-utils';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

const MAX_CONTENT_LENGTH = 3000;
const CHAR_COUNTER_THRESHOLD = 0.8; // Show counter when >= 80% used (2400 chars)
const MAX_IMAGE_RAW_SIZE = 50 * 1024 * 1024; // 50MB sanity guard before compression (WEB_TEAM_UX_POST)
const MAX_IMAGES = 20;
const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_DURATION = 60; // seconds
const MIN_NON_WHITESPACE = 10;

const compressImage = (file: File): Promise<File> =>
  imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: 'image/jpeg',
  });

export const CreatePostModal = React.memo(function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'update' | 'opportunity' | 'achievement' | 'collaboration' | 'event'>('update');
  const [visibility, setVisibility] = useState<'connections' | 'public'>('connections');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Detect URLs in content (MUST be before early return to maintain consistent hook order)
  const detectedUrls = useMemo(() => {
    if (!content) return [];
    return extractUrls(content);
  }, [content]);

  const hasLinks = detectedUrls.length > 0;

  // Early return AFTER all hooks to prevent React Error #310
  if (!isOpen) return null;

  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';
    setError(null);
    const currentCount = imageFiles.length;
    const remaining = MAX_IMAGES - currentCount;
    if (remaining <= 0) {
      setError(`Maximum ${MAX_IMAGES} photos per post.`);
      return;
    }
    const toProcess: File[] = [];
    let hadOversize = false;
    let hadInvalid = false;
    for (let i = 0; i < files.length && toProcess.length < remaining; i++) {
      const file = files[i];
      if (!allowedImageTypes.includes(file.type)) {
        hadInvalid = true;
        continue;
      }
      if (file.size > MAX_IMAGE_RAW_SIZE) {
        hadOversize = true;
        continue;
      }
      toProcess.push(file);
    }
    if (hadInvalid) setError('Please select image files (JPG, PNG, WEBP, AVIF).');
    if (hadOversize) setError('One or more photos exceed the 50 MB limit and were skipped.');
    if (toProcess.length === 0) return;
    if (audioFile) {
      setAudioFile(null);
      setUploadedAudioUrl(null);
    }
    setIsCompressing(true);
    try {
      const compressed = await Promise.all(toProcess.map(compressImage));
      const added = compressed.slice(0, remaining);
      setImageFiles(prev => [...prev, ...added].slice(0, MAX_IMAGES));
      const urls = await Promise.all(
        added.map(file => new Promise<string>(resolve => {
          const r = new FileReader();
          r.onloadend = () => resolve(r.result as string);
          r.readAsDataURL(file);
        }))
      );
      setImagePreviews(prev => [...prev, ...urls].slice(0, MAX_IMAGES));
    } catch (err) {
      setError('Failed to optimise photos. Please try again.');
    } finally {
      setIsCompressing(false);
    }
  };

  const removeImageAt = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setError(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
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

    if (imageFiles.length > 0) {
      setImageFiles([]);
      setImagePreviews([]);
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
    const trimmed = content.trim();
    const nonWhitespace = trimmed.replace(/\s/g, '').length;
    if (nonWhitespace < MIN_NON_WHITESPACE) {
      setError('Content must have at least 10 non-whitespace characters');
      return;
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      setError(`Content must be ${MAX_CONTENT_LENGTH} characters or less`);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const postPayload: Record<string, unknown> = {
        content: trimmed,
        visibility,
        post_type: postType,
      };

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(postPayload),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to create post');
      const postId = data.data.id;

      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('post_id', postId);
        try {
          const up = await fetch('/api/posts/upload-image', { method: 'POST', credentials: 'include', body: formData });
          const upData = await up.json();
          if (upData.success && upData.data?.file_url) imageUrls.push(upData.data.file_url);
        } catch (_) {}
      }
      if (imageUrls.length > 0) {
        await fetch(`/api/posts/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ image_urls: imageUrls }),
        });
      }

      if (audioFile) {
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('post_id', postId);
        try {
          await fetch('/api/posts/upload-audio', { method: 'POST', credentials: 'include', body: formData });
        } catch (_) {}
      }

      setContent('');
      setImageFiles([]);
      setImagePreviews([]);
      setAudioFile(null);
      setUploadedAudioUrl(null);
      setPostType('update');
      setVisibility('connections');
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
    setImageFiles([]);
    setImagePreviews([]);
    setAudioFile(null);
    setUploadedAudioUrl(null);
    setError(null);
    setPostType('update');
    setVisibility('connections');
    onClose();
  };

  const remainingChars = MAX_CONTENT_LENGTH - content.length;
  const showCounter = content.length >= CHAR_COUNTER_THRESHOLD * MAX_CONTENT_LENGTH;
  const atLimit = content.length >= MAX_CONTENT_LENGTH;
  const canPublish = !isUploading && !isCompressing && content.trim().replace(/\s/g, '').length >= MIN_NON_WHITESPACE && content.length <= MAX_CONTENT_LENGTH;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-xl font-semibold text-white">Create Post</h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Form - scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0 pb-20">
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

          {/* Content Textarea - grows naturally, outer area scrolls */}
          <textarea
            value={content}
            onChange={(e) => {
              const v = e.target.value;
              if (v.length <= MAX_CONTENT_LENGTH) setContent(v);
            }}
            placeholder="What do you want to share? You can paste links and they'll be clickable."
            className="w-full min-h-[120px] bg-gray-800 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 resize-y focus:outline-none focus:border-red-500/50 transition-colors"
            disabled={isUploading}
          />
          {showCounter && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {hasLinks && (
                  <div className="flex items-center gap-1 text-red-400">
                    <LinkIcon size={14} />
                    <span>{detectedUrls.length} link{detectedUrls.length > 1 ? 's' : ''} detected</span>
                  </div>
                )}
              </div>
              <span className={atLimit ? 'text-red-400' : 'text-gray-400'}>
                {remainingChars} characters left
              </span>
            </div>
          )}

          {/* Optimising photos indicator */}
          {isCompressing && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 size={16} className="animate-spin" />
              <span>Optimising photos…</span>
            </div>
          )}

          {/* Image grid preview */}
          {imagePreviews.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-white/10">
                    <Image src={src} alt={`Preview ${i + 1}`} fill className="object-cover" sizes="120px" />
                    <button
                      type="button"
                      onClick={() => removeImageAt(i)}
                      className="absolute top-1 right-1 p-1.5 bg-black/60 rounded-full hover:bg-black/80"
                      disabled={isUploading || isCompressing}
                    >
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
              {imageFiles.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploading || isCompressing || !!audioFile}
                  className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Add more photos ({imageFiles.length} / {MAX_IMAGES})
                </button>
              )}
              {/* Single shared hidden input is in toolbar below */}
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
              accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
              multiple
              onChange={handleImageSelect}
              className="hidden"
              disabled={isUploading || isCompressing}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploading || isCompressing || !!audioFile || imageFiles.length >= MAX_IMAGES}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 border border-white/10 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
            >
              <ImageIcon size={18} className="text-gray-400" />
              <span className="text-sm text-gray-300">Photo</span>
              {imageFiles.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {imageFiles.length}
                </span>
              )}
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
              disabled={isUploading || imageFiles.length > 0}
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
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push('/gigs/urgent/create');
                }}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                <Flame size={14} />
                Urgent Gig
              </button>
              <span className="text-gray-500 text-sm self-center">or choose below:</span>
            </div>
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
              disabled={!canPublish}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-red-600 to-pink-500 text-white font-medium hover:from-red-700 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading && <Loader2 size={16} className="animate-spin" />}
              {isUploading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
        </form>
      </div>
    </div>
  );
});

