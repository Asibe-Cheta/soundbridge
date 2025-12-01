'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useOnboarding, OnboardingUserType } from '@/src/contexts/OnboardingContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { ArrowRight, ArrowLeft, Check, X, Loader2 } from 'lucide-react';
import { CountrySelector } from './CountrySelector';
import { fetchJsonWithAuth } from '@/src/lib/fetchWithAuth';

interface QuickSetupProps {
  isOpen: boolean;
  onContinue: () => void;
  onBack: () => void;
}

interface Genre {
  id: string;
  name: string;
  category: string;
}

export function QuickSetup({ isOpen, onContinue, onBack }: QuickSetupProps) {
  const { onboardingState, setProfileCompleted, setCurrentStep } = useOnboarding();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    displayName: user?.user_metadata?.full_name || '',
    username: '',
    genres: [] as string[],
    location: '',
    country: ''
  });
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Debounced username check
  const checkUsername = useCallback(
    async (username: string) => {
      if (!username || username.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      // Validate format
      const usernamePattern = /^[a-z0-9_]+$/;
      if (!usernamePattern.test(username.toLowerCase())) {
        setErrors(prev => ({ ...prev, username: 'Username can only contain lowercase letters, numbers, and underscores' }));
        setUsernameAvailable(false);
        return;
      }

      if (username.length > 30) {
        setErrors(prev => ({ ...prev, username: 'Username must be no more than 30 characters' }));
        setUsernameAvailable(false);
        return;
      }

      setCheckingUsername(true);
      setErrors(prev => ({ ...prev, username: '' }));

      try {
        const response = await fetch('/api/onboarding/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.toLowerCase() })
        });

        const data = await response.json();
        if (data.success) {
          setUsernameAvailable(data.available);
          if (!data.available && data.suggestions) {
            setErrors(prev => ({ ...prev, username: `Username taken. Try: ${data.suggestions.slice(0, 2).join(', ')}` }));
          }
        }
      } catch (error) {
        console.error('Error checking username:', error);
      } finally {
        setCheckingUsername(false);
      }
    },
    []
  );

  useEffect(() => {
    if (formData.username) {
      const timer = setTimeout(() => {
        checkUsername(formData.username);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setUsernameAvailable(null);
    }
  }, [formData.username, checkUsername]);

  if (!isOpen) return null;

  const handleGenreToggle = (genreId: string) => {
    setFormData(prev => {
      const isSelected = prev.genres.includes(genreId);
      const newGenres = isSelected
        ? prev.genres.filter(id => id !== genreId)
        : [...prev.genres, genreId];
      return { ...prev, genres: newGenres };
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName || formData.displayName.length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters';
    }

    if (!formData.username || formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (usernameAvailable === false) {
      newErrors.username = 'Username is not available';
    }

    if (formData.genres.length < 3) {
      newErrors.genres = 'Please select at least 3 genres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Map onboarding_user_type to role for API
      const role = onboardingState.onboardingUserType === 'music_lover' ? 'listener' : 'creator';

      const { data, error } = await fetchJsonWithAuth('/api/user/complete-profile', {
        method: 'POST',
        body: JSON.stringify({
          role,
          display_name: formData.displayName,
          username: formData.username.toLowerCase(),
          genres: formData.genres,
          country: formData.country,
          location: formData.location,
          onboarding_user_type: onboardingState.onboardingUserType
        })
      });

      if (error || !data?.success) {
        console.error('Error completing profile:', error || data?.error);
        setErrors({ submit: 'Failed to save profile. Please try again.' });
        return;
      }

      setProfileCompleted(true);
      setCurrentStep('valueDemo');
      onContinue();
    } catch (error) {
      console.error('Error submitting profile:', error);
      setErrors({ submit: 'An error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canContinue = 
    formData.displayName.length >= 2 &&
    formData.username.length >= 3 &&
    usernameAvailable === true &&
    formData.genres.length >= 3;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="relative w-full max-w-2xl bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowRight className="text-white/70 hover:text-white rotate-180" size={20} />
            </button>
            <span className="text-sm text-white/70">Step 2 of 4</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">
            Let's set up your profile
          </h2>

          {/* Display Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/90 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="How should people call you?"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
              maxLength={50}
            />
            {errors.displayName && (
              <p className="text-red-400 text-sm mt-1">{errors.displayName}</p>
            )}
          </div>

          {/* Username */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/90 mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70">@</span>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                  setFormData(prev => ({ ...prev, username: value }));
                }}
                placeholder="yourname"
                className="w-full pl-8 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
                maxLength={30}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {checkingUsername ? (
                  <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
                ) : usernameAvailable === true ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : usernameAvailable === false ? (
                  <X className="w-5 h-5 text-red-400" />
                ) : null}
              </div>
            </div>
            {errors.username && (
              <p className="text-red-400 text-sm mt-1">{errors.username}</p>
            )}
            {usernameAvailable === true && (
              <p className="text-green-400 text-sm mt-1">✓ Available</p>
            )}
          </div>

          {/* Genres */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/90 mb-2">
              What genres do you work with?
              <span className="text-white/60 ml-2">(Select at least 3)</span>
            </label>
            {loadingGenres ? (
              <div className="text-white/70">Loading genres...</div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-2">
                  {genres.slice(0, 12).map((genre) => {
                    const isSelected = formData.genres.includes(genre.id);
                    return (
                      <button
                        key={genre.id}
                        onClick={() => handleGenreToggle(genre.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                      >
                        {genre.name}
                      </button>
                    );
                  })}
                </div>
                {formData.genres.length > 0 && (
                  <p className="text-sm text-white/70 mt-2">
                    Selected: {formData.genres.slice(0, 3).map(id => genres.find(g => g.id === id)?.name).filter(Boolean).join(', ')}
                    {formData.genres.length > 3 && ` +${formData.genres.length - 3} more`}
                  </p>
                )}
                {errors.genres && (
                  <p className="text-red-400 text-sm mt-1">{errors.genres}</p>
                )}
              </>
            )}
          </div>

          {/* Location */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/90 mb-2">
              Your Location <span className="text-white/60">(Optional)</span>
            </label>
            <CountrySelector
              value={formData.country}
              onChange={(country) => setFormData(prev => ({ ...prev, country }))}
            />
          </div>

          {errors.submit && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Continue Button */}
          <div className="flex justify-center mt-8">
            <button
              onClick={handleSubmit}
              disabled={!canContinue || isSubmitting}
              className={`px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                canContinue && !isSubmitting
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-white/10 text-white/50 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
