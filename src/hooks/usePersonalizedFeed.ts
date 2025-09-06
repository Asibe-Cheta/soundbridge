import { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useOnboarding } from '@/src/contexts/OnboardingContext';

export interface PersonalizedContent {
  music: any[];
  creators: any[];
  events: any[];
  podcasts: any[];
}

export interface PersonalizedFeedData {
  profile: {
    role: string;
    location: string;
    genres: string[];
    country: string;
  };
  music: any[];
  creators: any[];
  events: any[];
  podcasts: any[];
}

export function usePersonalizedFeed() {
  const { user } = useAuth();
  const { onboardingState } = useOnboarding();
  const [data, setData] = useState<PersonalizedFeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPersonalizedFeed = async () => {
    if (!user?.id) {
      console.log('🎯 No user ID available, skipping personalized feed');
      setLoading(false);
      return;
    }

    // Don't fetch personalized data if user is still in onboarding
    if (onboardingState.isOnboardingActive || onboardingState.showOnboarding) {
      console.log('🎯 User is in onboarding, skipping personalized feed');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🎯 Fetching personalized feed for user:', user.id);
      
      const response = await fetch(`/api/feed/personalized?userId=${user.id}`);
      
      if (!response.ok) {
        console.error('❌ API response not ok:', response.status, response.statusText);
        setError(`API error: ${response.status}`);
        setLoading(false);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Personalized feed data:', result.data);
        setData(result.data);
      } else {
        console.error('❌ Failed to fetch personalized feed:', result.error);
        setError(result.error || 'Failed to load personalized content');
      }
    } catch (err) {
      console.error('❌ Error fetching personalized feed:', err);
      setError('Failed to load personalized content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonalizedFeed();
  }, [user?.id, onboardingState.isOnboardingActive, onboardingState.showOnboarding]);

  const refetch = () => {
    fetchPersonalizedFeed();
  };

  return {
    data,
    loading,
    error,
    refetch,
    hasPersonalizedData: !!(data && (data.music.length > 0 || data.creators.length > 0 || data.events.length > 0 || data.podcasts.length > 0))
  };
}
