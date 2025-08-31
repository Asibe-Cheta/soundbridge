'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface Creator {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  role: 'creator' | 'listener';
  location: string | null;
  country: 'UK' | 'Nigeria' | null;
  social_links: Record<string, string>;
  created_at: string;
  updated_at: string;
  // Computed fields
  followers_count: number;
  tracks_count: number;
  events_count: number;
  isFollowing: boolean;
}

export interface CreatorsFilters {
  search?: string;
  genre?: string;
  location?: string;
  sortBy?: 'followers' | 'rating' | 'tracks' | 'name';
}

export interface CreatorsState {
  creators: Creator[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface CreatorsActions {
  fetchCreators: (filters?: CreatorsFilters, reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  updateFilters: (filters: Partial<CreatorsFilters>) => void;
  followCreator: (creatorId: string) => Promise<{ success: boolean; error?: string }>;
  unfollowCreator: (creatorId: string) => Promise<{ success: boolean; error?: string }>;
}

export function useCreators(): [CreatorsState, CreatorsActions] {
  const { user } = useAuth();
  const [state, setState] = useState<CreatorsState>({
    creators: [],
    loading: false,
    error: null,
    pagination: {
      total: 0,
      limit: 20,
      offset: 0,
      hasMore: false
    }
  });

  const [filters, setFilters] = useState<CreatorsFilters>({
    search: '',
    genre: 'all',
    location: 'all',
    sortBy: 'followers'
  });

  const fetchCreators = useCallback(async (newFilters?: CreatorsFilters, reset: boolean = false) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const currentFilters = newFilters || filters;
      const params = new URLSearchParams();

      if (currentFilters.search) {
        params.append('search', currentFilters.search);
      }
      if (currentFilters.genre && currentFilters.genre !== 'all') {
        params.append('genre', currentFilters.genre);
      }
      if (currentFilters.location && currentFilters.location !== 'all') {
        params.append('location', currentFilters.location);
      }
      if (currentFilters.sortBy) {
        params.append('sortBy', currentFilters.sortBy);
      }

      params.append('limit', state.pagination.limit.toString());
      params.append('offset', reset ? '0' : state.pagination.offset.toString());
      
      if (user?.id) {
        params.append('currentUserId', user.id);
      }

      const response = await fetch(`/api/creators?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch creators');
      }

      const result = await response.json();

      setState(prev => ({
        ...prev,
        creators: reset ? result.data : [...prev.creators, ...result.data],
        loading: false,
        pagination: {
          ...prev.pagination,
          total: result.pagination.total,
          offset: reset ? result.pagination.limit : prev.pagination.offset + result.pagination.limit,
          hasMore: result.pagination.hasMore
        }
      }));

      if (newFilters) {
        setFilters(currentFilters);
      }

    } catch (error) {
      console.error('Error fetching creators:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch creators'
      }));
    }
  }, [filters, state.pagination.limit, state.pagination.offset, user?.id]);

  const loadMore = useCallback(async () => {
    if (state.pagination.hasMore && !state.loading) {
      await fetchCreators();
    }
  }, [state.pagination.hasMore, state.loading, fetchCreators]);

  const updateFilters = useCallback((newFilters: Partial<CreatorsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const followCreator = useCallback(async (creatorId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'You must be logged in to follow creators' };
    }

    try {
      const response = await fetch('/api/follows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          following_id: creatorId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to follow creator');
      }

      // Update local state
      setState(prev => ({
        ...prev,
        creators: prev.creators.map(creator =>
          creator.id === creatorId
            ? { ...creator, isFollowing: true, followers_count: creator.followers_count + 1 }
            : creator
        )
      }));

      return { success: true };
    } catch (error) {
      console.error('Error following creator:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to follow creator' 
      };
    }
  }, [user]);

  const unfollowCreator = useCallback(async (creatorId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'You must be logged in to unfollow creators' };
    }

    try {
      const response = await fetch(`/api/follows/${creatorId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unfollow creator');
      }

      // Update local state
      setState(prev => ({
        ...prev,
        creators: prev.creators.map(creator =>
          creator.id === creatorId
            ? { ...creator, isFollowing: false, followers_count: Math.max(0, creator.followers_count - 1) }
            : creator
        )
      }));

      return { success: true };
    } catch (error) {
      console.error('Error unfollowing creator:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to unfollow creator' 
      };
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchCreators(undefined, true);
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchCreators(filters, true);
  }, [filters.search, filters.genre, filters.location, filters.sortBy]);

  const actions: CreatorsActions = {
    fetchCreators,
    loadMore,
    updateFilters,
    followCreator,
    unfollowCreator
  };

  return [state, actions];
}
