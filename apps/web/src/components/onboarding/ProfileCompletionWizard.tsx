'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { Upload, MapPin, Music, X, ArrowRight, ArrowLeft, Check, SkipForward } from 'lucide-react';
import { CountrySelector } from './CountrySelector';

interface ProfileCompletionWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const genres = [
  'Afrobeats', 'Gospel', 'UK Drill', 'Highlife', 'Jazz', 'Hip Hop', 
  'R&B', 'Pop', 'Electronic', 'Rock', 'Country', 'Classical'
];

// Remove hardcoded locations - now using CountrySelector

export function ProfileCompletionWizard({ isOpen, onClose }: ProfileCompletionWizardProps) {
  const { onboardingState, setProfileCompleted, setCurrentStep, getProgressPercentage } = useOnboarding();
  const { user } = useAuth();
  const [currentStep, setCurrentStepLocal] = useState(0);
  const [formData, setFormData] = useState({
    displayName: user?.user_metadata?.full_name || '',
    avatar: null as File | null,
    country: '',
    genres: [] as string[],
    bio: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const steps = [
    { title: 'Basic Info', description: 'Tell us about yourself' },
    { title: 'Location', description: 'Where are you based?' },
    { title: 'Interests', description: 'What genres do you love?' },
    { title: 'Bio', description: 'Tell your story' }
  ];

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStepLocal(currentStep + 1);
    } else {
      // Complete profile setup
      await handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStepLocal(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      setIsUploading(true);
      
      // Upload avatar if selected
      let avatarUrl = null;
      if (formData.avatar) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', formData.avatar);
        formDataUpload.append('userId', user?.id || '');
        
        const uploadResponse = await fetch('/api/upload/avatar', {
          method: 'POST',
          body: formDataUpload,
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          avatarUrl = uploadData.url;
        }
      }

      // Update profile using the complete-profile endpoint
      const response = await fetch('/api/user/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: onboardingState.selectedRole,
          display_name: formData.displayName,
          avatar_url: avatarUrl,
          country: formData.country,
          bio: formData.bio,
          genres: formData.genres
        }),
      });

      if (response.ok) {
        setProfileCompleted(true);
        setCurrentStep('first_action');
        onClose();
      }
    } catch (error) {
      console.error('Error completing profile:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, avatar: file }));
    }
  };

  const toggleGenre = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem' }}>
            <div>
              <label className="block font-medium text-gray-300 mb-2" style={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                Display Name *
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                className="w-full border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-700 text-white"
                style={{
                  padding: isMobile ? '0.75rem' : '1rem',
                  fontSize: isMobile ? '0.9rem' : '1rem'
                }}
                placeholder="How should people know you?"
                required
              />
            </div>
            
            <div>
              <label className="block font-medium text-gray-300 mb-2" style={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                Profile Picture
              </label>
              <div className="flex items-center" style={{ gap: isMobile ? '0.75rem' : '1rem' }}>
                <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center" style={{
                  width: isMobile ? '48px' : '64px',
                  height: isMobile ? '48px' : '64px'
                }}>
                  {formData.avatar ? (
                    <img
                      src={URL.createObjectURL(formData.avatar)}
                      alt="Preview"
                      className="rounded-full object-cover"
                      style={{
                        width: isMobile ? '48px' : '64px',
                        height: isMobile ? '48px' : '64px'
                      }}
                    />
                  ) : (
                    <Upload className="text-white" size={isMobile ? 18 : 24} />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors text-white"
                  style={{
                    padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1rem',
                    fontSize: isMobile ? '0.8rem' : '0.9rem'
                  }}
                >
                  Choose Photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1rem' }}>
            <div>
              <label className="block font-medium text-gray-300 mb-2" style={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                Where are you based?
              </label>
              <CountrySelector
                value={formData.country}
                onChange={(country) => setFormData(prev => ({ ...prev, country }))}
                placeholder="Select your country"
                isMobile={isMobile}
                className="w-full"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1rem' }}>
            <div>
              <label className="block font-medium text-gray-300 mb-2" style={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                What genres do you love? (Select all that apply)
              </label>
              <div className="grid gap-2" style={{ gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)' }}>
                {genres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`p-3 text-center border rounded-lg transition-colors ${
                      formData.genres.includes(genre)
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-900 dark:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Music className="h-4 w-4" />
                      <span className="text-sm">{genre}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tell us about yourself (optional)
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                rows={4}
                placeholder="Share your story, what you do, or what you're looking for..."
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4" style={{ paddingTop: isMobile ? '1rem' : '8rem' }}>
      <div 
        className="relative w-full mx-auto overflow-y-auto"
        style={{
          maxWidth: isMobile ? '100%' : '56rem',
          maxHeight: isMobile ? '90vh' : '75vh',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: isMobile ? '16px' : '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
          <div>
            <h2 className="font-bold text-white" style={{
              fontSize: isMobile ? '1.1rem' : '1.25rem',
              marginBottom: isMobile ? '0.25rem' : '0'
            }}>
              {steps[currentStep].title}
            </h2>
            <p className="text-white/70" style={{
              fontSize: isMobile ? '0.8rem' : '0.875rem'
            }}>
              {steps[currentStep].description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="text-white/70 hover:text-white" size={isMobile ? 18 : 20} strokeWidth={2} />
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: isMobile ? '0.5rem' : '0.5rem' }}>
            <span className="text-white/70" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-white/70" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
              {Math.round(((currentStep + 1) / steps.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full" style={{ height: isMobile ? '4px' : '8px' }}>
            <div
              className="bg-gradient-to-r from-red-500 to-pink-500 rounded-full transition-all duration-300"
              style={{ 
                width: `${((currentStep + 1) / steps.length) * 100}%`,
                height: isMobile ? '4px' : '8px'
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? '1rem' : '1.5rem', paddingBottom: isMobile ? '0.5rem' : '1rem' }}>
          {renderStepContent()}
        </div>

        {/* Footer - Sticky at bottom */}
        <div className="flex items-center justify-between p-6 border-t border-white/10 bg-black/20 backdrop-blur-sm sticky bottom-0 rounded-b-2xl">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex items-center space-x-2 px-4 py-2 text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => {
                setProfileCompleted(true);
                setCurrentStep('first_action');
                onClose();
              }}
              className="flex items-center space-x-2 px-3 py-2 text-white/50 hover:text-white/70 transition-colors text-sm"
            >
              <SkipForward className="h-4 w-4" />
              <span>Skip profile setup</span>
            </button>
          </div>

          <button
            onClick={handleNext}
            disabled={!formData.displayName || isUploading}
            className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Saving...</span>
              </>
            ) : currentStep === steps.length - 1 ? (
              <>
                <Check className="h-4 w-4" />
                <span>Complete</span>
              </>
            ) : (
              <>
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
