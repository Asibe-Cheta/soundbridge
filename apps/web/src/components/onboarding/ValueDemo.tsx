'use client';

import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import { ArrowRight, ArrowLeft, Loader2, User, MapPin, CheckCircle } from 'lucide-react';
import { fetchJsonWithAuth } from '@/src/lib/fetchWithAuth';

interface ValueDemoProps {
  isOpen: boolean;
  onContinue: () => void;
  onBack: () => void;
}

interface Creator {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  location: string | null;
  country: string | null;
  bio: string | null;
  role: string;
  stats: {
    connections: number;
    tracks: number;
    verified: boolean;
  };
}

export function ValueDemo({ isOpen, onContinue, onBack }: ValueDemoProps) {
  const { onboardingState, setCurrentStep } = useOnboarding();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchCreators();
    }
  }, [isOpen, onboardingState.onboardingUserType]);

  const fetchCreators = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (onboardingState.onboardingUserType) {
        params.append('user_type', onboardingState.onboardingUserType);
      }
      params.append('limit', '3');

      const { data, error } = await fetchJsonWithAuth(`/api/onboarding/value-demo?${params.toString()}`);

      if (error || !data?.success) {
        console.error('Error fetching creators:', error);
        return;
      }

      setCreators(data.creators || []);
    } catch (error) {
      console.error('Error fetching creators:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleContinue = () => {
    setCurrentStep('tierSelection');
    onContinue();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="relative w-full max-w-4xl bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
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
            <span className="text-sm text-white/70">Step 3 of 4</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center">
            You're joining an amazing community
          </h2>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          ) : creators.length === 0 ? (
            <div className="text-center py-12 text-white/70">
              <p>Loading creator profiles...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {creators.map((creator) => (
                <div
                  key={creator.id}
                  className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all"
                >
                  {/* Avatar */}
                  <div className="flex justify-center mb-4">
                    {creator.avatar_url ? (
                      <img
                        src={creator.avatar_url}
                        alt={creator.display_name}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <User className="w-10 h-10 text-purple-400" />
                      </div>
                    )}
                  </div>

                  {/* Name and Location */}
                  <h3 className="text-lg font-semibold text-white text-center mb-1">
                    {creator.display_name}
                  </h3>
                  <p className="text-sm text-white/70 text-center mb-4">
                    {creator.bio || creator.role}
                    {creator.location && (
                      <span className="flex items-center justify-center gap-1 mt-1">
                        <MapPin size={12} />
                        {creator.location}
                        {creator.country && `, ${creator.country}`}
                      </span>
                    )}
                  </p>

                  {/* Stats */}
                  <div className="space-y-2 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Connections</span>
                      <span className="text-white font-semibold">{creator.stats.connections}+</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Tracks</span>
                      <span className="text-white font-semibold">{creator.stats.tracks}</span>
                    </div>
                    {creator.stats.verified && (
                      <div className="flex items-center gap-2 text-sm text-purple-400">
                        <CheckCircle size={16} />
                        <span>Verified Professional</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-8 text-center">
            <p className="text-lg text-white/80 mb-6">
              Ready to get discovered?
            </p>
            <button
              onClick={handleContinue}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2 mx-auto"
            >
              Continue
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
