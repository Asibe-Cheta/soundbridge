import { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';

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
  const [data, setData] = useState<PersonalizedFeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPersonalizedFeed = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🎯 Fetching personalized feed for user:', user.id);
      
      const response = await fetch(`/api/feed/personalized?userId=${user.id}`);
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
  }, [user?.id]);

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
