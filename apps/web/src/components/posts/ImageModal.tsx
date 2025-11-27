'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { X, Download } from 'lucide-react';

interface ImageModalProps {
  imageUrl: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageModal({ imageUrl, alt = 'Post image', isOpen, onClose }: ImageModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      style={{ cursor: 'zoom-out' }}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-colors"
        aria-label="Close image modal"
      >
        <X size={24} className="text-white" />
      </button>

      {/* Download Button */}
      <button
        onClick={() => {
          const link = document.createElement('a');
          link.href = imageUrl;
          link.download = alt || 'image';
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }}
        className="absolute top-4 right-20 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-colors"
        aria-label="Download image"
      >
        <Download size={24} className="text-white" />
      </button>

      {/* Image Container - Click outside to close */}
      <div
        className="relative max-w-[95vw] max-h-[95vh] w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Full-size image - right-click to save is native browser behavior */}
        <div className="relative w-full h-full flex items-center justify-center">
          <Image
            src={imageUrl}
            alt={alt}
            fill
            className="object-contain"
            sizes="95vw"
            priority
            unoptimized={imageUrl.startsWith('http') && !imageUrl.includes('supabase')}
            // Allow native right-click to save (browser default behavior)
            style={{ userSelect: 'none', pointerEvents: 'auto' }}
            // Don't prevent default - allow native right-click context menu
          />
        </div>
      </div>

      {/* Instructions hint (optional - can be removed for cleaner UI) */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm text-white text-sm opacity-70">
        Right-click to save image • Press ESC to close
      </div>
    </div>
  );
}

