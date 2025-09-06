'use client';

import React, { useState, useRef } from 'react';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { Upload, MapPin, Music, X, ArrowRight, ArrowLeft, Check } from 'lucide-react';

interface ProfileCompletionWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const genres = [
  'Afrobeats', 'Gospel', 'UK Drill', 'Highlife', 'Jazz', 'Hip Hop', 
  'R&B', 'Pop', 'Electronic', 'Rock', 'Country', 'Classical'
];

const locations = [
  'London, UK', 'Lagos, Nigeria', 'Abuja, Nigeria', 'Manchester, UK',
  'Birmingham, UK', 'Liverpool, UK', 'Port Harcourt, Nigeria', 'Other'
];

export function ProfileCompletionWizard({ isOpen, onClose }: ProfileCompletionWizardProps) {
  const { onboardingState, setProfileCompleted, setCurrentStep, getProgressPercentage } = useOnboarding();
  const { user } = useAuth();
  const [currentStep, setCurrentStepLocal] = useState(0);
  const [formData, setFormData] = useState({
    displayName: user?.user_metadata?.full_name || '',
    avatar: null as File | null,
    location: '',
    genres: [] as string[],
    bio: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        
        const uploadResponse = await fetch('/api/upload/avatar', {
          method: 'POST',
          body: formDataUpload,
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          avatarUrl = uploadData.url;
        }
      }

      // Update profile
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: formData.displayName,
          avatar_url: avatarUrl,
          location: formData.location,
          bio: formData.bio,
          genres: formData.genres,
          profile_completed: true
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
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="How should people know you?"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Profile Picture
              </label>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                  {formData.avatar ? (
                    <img
                      src={URL.createObjectURL(formData.avatar)}
                      alt="Preview"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <Upload className="h-6 w-6 text-white" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Where are you based?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {locations.map((location) => (
                  <button
                    key={location}
                    onClick={() => setFormData(prev => ({ ...prev, location }))}
                    className={`p-3 text-left border rounded-lg transition-colors ${
                      formData.location === location
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-900 dark:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">{location}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What genres do you love? (Select all that apply)
              </label>
              <div className="grid grid-cols-3 gap-2">
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 pt-20">
      <div 
        className="relative w-full max-w-4xl mx-auto max-h-[85vh] overflow-y-auto"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">
              {steps[currentStep].title}
            </h2>
            <p className="text-white/70 text-sm">
              {steps[currentStep].description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-white/70 hover:text-white" strokeWidth={2} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-white/70">
              {Math.round(((currentStep + 1) / steps.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-red-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

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
