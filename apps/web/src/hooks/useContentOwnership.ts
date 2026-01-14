'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';

interface OwnershipData {
  owns: boolean;
  is_creator: boolean;
  purchase: {
    id: string;
    purchased_at: string;
    price_paid: number;
    currency: string;
  } | null;
}

export function useContentOwnership(contentId: string | null, contentType: 'track' | 'album' | 'podcast' = 'track') {
  const { user } = useAuth();
  const [ownership, setOwnership] = useState<OwnershipData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !contentId) {
      setOwnership(null);
      return;
    }

    const checkOwnership = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = (await import('@/src/lib/supabase')).createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setOwnership(null);
          return;
        }

        const response = await fetch(
          `/api/content/ownership?content_id=${contentId}&content_type=${contentType}`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          }
        );

        const data = await response.json();

        if (data.success) {
          setOwnership(data.data);
        } else {
          setError(data.error || 'Failed to check ownership');
          setOwnership(null);
        }
      } catch (err: any) {
        console.error('Error checking ownership:', err);
        setError(err.message);
        setOwnership(null);
      } finally {
        setLoading(false);
      }
    };

    checkOwnership();
  }, [user, contentId, contentType]);

  return { ownership, loading, error };
}
