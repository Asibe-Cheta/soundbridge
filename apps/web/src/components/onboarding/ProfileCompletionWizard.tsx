'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { Upload, MapPin, Music, X, ArrowRight, ArrowLeft, Check, SkipForward, AlertCircle } from 'lucide-react';
import { CountrySelector } from './CountrySelector';
import { supabase } from '@/src/lib/supabase';

interface ProfileCompletionWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Genre {
  id: string;
  name: string;
  category: string;
  description: string;
}

// Genres are now fetched from API dynamically

export function ProfileCompletionWizard({ isOpen, onClose }: ProfileCompletionWizardProps) {
  const { onboardingState, setProfileCompleted, setCurrentStep, getProgressPercentage, completeOnboarding } = useOnboarding();
  const { user } = useAuth();
  const [currentStep, setCurrentStepLocal] = useState(0);
  const [formData, setFormData] = useState({
    displayName: user?.user_metadata?.full_name || '',
    avatar: null as File | null,
    country: '',
    genres: [] as string[],
    bio: ''
  });
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);
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

  // Fetch genres from API
  useEffect(() => {
    if (isOpen) {
      fetchGenres();
    }
  }, [isOpen]);

  const fetchGenres = async () => {
    try {
      setLoadingGenres(true);
      const response = await fetch('/api/genres?category=music&active=true');
      const data = await response.json();
      
      if (data.success) {
        setGenres(data.genres || []);
      }
    } catch (error) {
      console.error('Error fetching genres:', error);
    } finally {
      setLoadingGenres(false);
    }
  };

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

      // Get the current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      // Update profile using the complete-profile endpoint
      const response = await fetch('/api/user/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Send access token in Authorization header as fallback to cookies
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
        },
        credentials: 'include', // Required for cookie-based auth
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
        // Save genre preferences to the genres API
        if (formData.genres.length > 0 && user?.id) {
          try {
            await fetch(`/api/users/${user.id}/genres`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                genre_ids: formData.genres
              }),
            });
          } catch (genreError) {
            console.error('Error saving genre preferences:', genreError);
            // Don't block onboarding completion if genre save fails
          }
        }

        // Mark profile as completed and move to completion
        setProfileCompleted(true);
        
        // Complete the entire onboarding process
        if (completeOnboarding) {
          await completeOnboarding();
        }
        
        // Close the modal
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

  const toggleGenre = (genreId: string) => {
    setFormData(prev => {
      const isSelected = prev.genres.includes(genreId);
      
      if (isSelected) {
        // Remove genre
        return {
          ...prev,
          genres: prev.genres.filter(g => g !== genreId)
        };
      } else {
        // Add genre if less than 5 selected
        if (prev.genres.length < 5) {
          return {
            ...prev,
            genres: [...prev.genres, genreId]
          };
        }
        return prev;
      }
    });
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
        const selectedCount = formData.genres.length;
        const isValidSelection = selectedCount >= 3 && selectedCount <= 5;
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1rem' }}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block font-medium text-gray-300" style={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                  What genres do you love?
                </label>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                  isValidSelection 
                    ? 'bg-green-500/20 text-green-400' 
                    : selectedCount > 5 
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {isValidSelection ? (
                    <Check className="h-4 w-4" />
                  ) : selectedCount > 5 ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <Music className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    {selectedCount}/5 selected
                  </span>
                </div>
              </div>
              
              <p className="text-white/60 text-xs mb-3">
                Select 3-5 genres to personalize your experience
              </p>

              {loadingGenres ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-red-500" />
                </div>
              ) : (
                <div 
                  className="grid gap-2 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800" 
                  style={{ gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)' }}
                >
                  {genres.map((genre) => {
                    const isSelected = formData.genres.includes(genre.id);
                    const isDisabled = !isSelected && selectedCount >= 5;
                    
                    return (
                      <button
                        key={genre.id}
                        onClick={() => toggleGenre(genre.id)}
                        disabled={isDisabled}
                        className={`p-3 text-center border rounded-lg transition-all duration-200 ${
                          isSelected
                            ? 'border-red-500 bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 shadow-lg shadow-red-500/20'
                            : isDisabled
                              ? 'border-gray-700 bg-gray-800/30 text-gray-600 cursor-not-allowed'
                              : 'border-gray-600 hover:border-red-400 hover:bg-red-500/10 text-gray-300 hover:text-white'
                        }`}
                        title={genre.description}
                      >
                        <div className="flex items-center justify-center space-x-2">
                          {isSelected && <Check className="h-3 w-3" />}
                          <span className="text-sm font-medium">{genre.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedCount < 3 && selectedCount > 0 && (
                <div className="flex items-center gap-2 mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                  <p className="text-yellow-400 text-xs">
                    Please select at least {3 - selectedCount} more genre{3 - selectedCount > 1 ? 's' : ''}
                  </p>
                </div>
              )}
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-[9999] p-4 overflow-y-auto" style={{ paddingTop: isMobile ? '5rem' : '7rem', paddingBottom: '2rem' }}>
      <div 
        className="relative w-full mx-auto"
        style={{
          maxWidth: isMobile ? '100%' : '56rem',
          minHeight: isMobile ? 'auto' : '500px',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: isMobile ? '16px' : '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          marginBottom: isMobile ? '2rem' : '0'
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
        <div className="flex items-center justify-between p-6 border-t border-white/10 bg-black/20 backdrop-blur-sm rounded-b-2xl">
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
              onClick={async () => {
                // Skip profile setup and complete onboarding
                setProfileCompleted(true);
                
                // Complete the entire onboarding process
                if (completeOnboarding) {
                  await completeOnboarding();
                }
                
                // Close the modal
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
            disabled={
              !formData.displayName || 
              isUploading || 
              (currentStep === 2 && formData.genres.length < 3)
            }
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
