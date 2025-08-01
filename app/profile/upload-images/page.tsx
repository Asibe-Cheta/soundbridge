'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Footer } from '../../../src/components/layout/Footer';

import { ImageUpload } from '../../../src/components/ui/ImageUpload';
import { useImageUpload } from '../../../src/hooks/useImageUpload';
import { useAuth } from '../../../src/contexts/AuthContext';
import {
  Image as ImageIcon,
  Camera,
  Palette,
  Save,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function ProfileImageUploadPage() {
  const { user } = useAuth();
  const [avatarState, avatarActions] = useImageUpload();
  const [bannerState, bannerActions] = useImageUpload();
  const [activeTab, setActiveTab] = useState<'avatar' | 'banner'>('avatar');

  const handleAvatarUpload = async () => {
    const success = await avatarActions.uploadProfileImage('avatar');
    if (success) {
      // Reset form after successful upload
      setTimeout(() => {
        avatarActions.resetUpload();
      }, 2000);
    }
  };

  const handleBannerUpload = async () => {
    const success = await bannerActions.uploadProfileImage('banner');
    if (success) {
      // Reset form after successful upload
      setTimeout(() => {
        bannerActions.resetUpload();
      }, 2000);
    }
  };

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="main-container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <AlertCircle size={48} style={{ color: '#EC4899', marginBottom: '1rem' }} />
          <h2 style={{ marginBottom: '1rem' }}>Authentication Required</h2>
          <p style={{ color: '#999', marginBottom: '2rem' }}>
            You need to be logged in to upload profile images.
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Link href="/profile" style={{ textDecoration: 'none' }}>
              <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} />
                Back to Profile
              </button>
            </Link>
          </div>
          <h1 className="section-title">Upload Profile Images</h1>
          <p style={{ color: '#ccc', marginTop: '0.5rem' }}>
            Update your profile picture and banner to personalize your SoundBridge profile
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => setActiveTab('avatar')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'avatar' ? '#EC4899' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Camera size={16} />
            Profile Picture
          </button>
          <button
            onClick={() => setActiveTab('banner')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'banner' ? '#EC4899' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <ImageIcon size={16} />
            Banner Image
          </button>
        </div>

        <div className="grid grid-2" style={{ gap: '2rem' }}>
          {/* Upload Area */}
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>
              {activeTab === 'avatar' ? (
                <>
                  <Camera size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
                  Profile Picture
                </>
              ) : (
                <>
                  <ImageIcon size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
                  Banner Image
                </>
              )}
            </h3>

            <ImageUpload
              onImageSelect={(file) => {
                if (activeTab === 'avatar') {
                  avatarActions.setImageFile(file);
                } else {
                  bannerActions.setImageFile(file);
                }
              }}
              onImageRemove={() => {
                if (activeTab === 'avatar') {
                  avatarActions.resetUpload();
                } else {
                  bannerActions.resetUpload();
                }
              }}
              selectedFile={activeTab === 'avatar' ? avatarState.imageFile : bannerState.imageFile}
              previewUrl={activeTab === 'avatar' ? avatarState.previewUrl : bannerState.previewUrl}
              isUploading={activeTab === 'avatar' ? avatarState.isUploading : bannerState.isUploading}
              uploadProgress={activeTab === 'avatar' ? avatarState.uploadProgress : bannerState.uploadProgress}
              uploadStatus={activeTab === 'avatar' ? avatarState.uploadStatus : bannerState.uploadStatus}
              error={activeTab === 'avatar' ? avatarState.error : bannerState.error}
              title={activeTab === 'avatar' ? 'Upload Profile Picture' : 'Upload Banner Image'}
              subtitle={activeTab === 'avatar' ? 'Square image recommended (400x400px)' : 'Wide image recommended (1200x400px)'}
              aspectRatio={activeTab === 'avatar' ? 1 : 3}
              disabled={activeTab === 'avatar' ? avatarState.isUploading : bannerState.isUploading}
            />
          </div>

          {/* Upload Info */}
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>
              <Palette size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
              Upload Guidelines
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeTab === 'avatar' ? (
                <>
                  <div>
                    <h4 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>Profile Picture</h4>
                    <ul style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.6' }}>
                      <li>• Square format recommended (400x400px)</li>
                      <li>• High quality image for best results</li>
                      <li>• Will be automatically compressed and optimized</li>
                      <li>• Supports JPG, PNG, WebP, AVIF formats</li>
                      <li>• Maximum file size: 5MB</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h4 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>Banner Image</h4>
                    <ul style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.6' }}>
                      <li>• Wide format recommended (1200x400px)</li>
                      <li>• Landscape orientation works best</li>
                      <li>• Will be automatically compressed and optimized</li>
                      <li>• Supports JPG, PNG, WebP, AVIF formats</li>
                      <li>• Maximum file size: 5MB</li>
                    </ul>
                  </div>
                </>
              )}

              <div style={{
                padding: '1rem',
                background: 'rgba(236, 72, 153, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(236, 72, 153, 0.3)'
              }}>
                <h4 style={{ marginBottom: '0.5rem', fontWeight: '600', color: '#EC4899' }}>
                  <CheckCircle size={16} style={{ marginRight: '0.5rem', display: 'inline' }} />
                  Features
                </h4>
                <ul style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  <li>• Automatic image compression and optimization</li>
                  <li>• Real-time upload progress tracking</li>
                  <li>• Drag & drop functionality</li>
                  <li>• Image preview before upload</li>
                  <li>• Secure storage with CDN delivery</li>
                </ul>
              </div>
            </div>

            {/* Upload Button */}
            <div style={{ marginTop: '2rem' }}>
              <button
                onClick={activeTab === 'avatar' ? handleAvatarUpload : handleBannerUpload}
                disabled={
                  (activeTab === 'avatar' && !avatarState.imageFile) ||
                  (activeTab === 'banner' && !bannerState.imageFile) ||
                  (activeTab === 'avatar' && avatarState.isUploading) ||
                  (activeTab === 'banner' && bannerState.isUploading)
                }
                className="btn-primary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: (
                    (activeTab === 'avatar' && !avatarState.imageFile) ||
                    (activeTab === 'banner' && !bannerState.imageFile) ||
                    (activeTab === 'avatar' && avatarState.isUploading) ||
                    (activeTab === 'banner' && bannerState.isUploading)
                  ) ? 0.6 : 1
                }}
              >
                {(activeTab === 'avatar' && avatarState.isUploading) || (activeTab === 'banner' && bannerState.isUploading) ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Upload {activeTab === 'avatar' ? 'Profile Picture' : 'Banner Image'}
                  </>
                )}
              </button>
            </div>

            {/* Success/Error Messages */}
            {(activeTab === 'avatar' ? avatarState.successMessage : bannerState.successMessage) && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px',
                color: '#22C55E'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} />
                  <span>{activeTab === 'avatar' ? avatarState.successMessage : bannerState.successMessage}</span>
                </div>
              </div>
            )}

            {(activeTab === 'avatar' ? avatarState.error : bannerState.error) && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#EF4444'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={16} />
                  <span>{activeTab === 'avatar' ? avatarState.error : bannerState.error}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
} 