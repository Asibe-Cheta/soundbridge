'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { availabilityService } from '../lib/availability-service';
import type {
  CreatorAvailability,
  CollaborationRequest,
  AvailabilitySlot,
  AvailabilitySettings,
  CreateAvailabilityData,
  CreateCollaborationRequestData
} from '../lib/types/availability';

export interface AvailabilityState {
  availability: AvailabilitySlot[];
  collaborationRequests: CollaborationRequest[];
  settings: AvailabilitySettings | null;
  loading: boolean;
  error: string | null;
}

export interface AvailabilityActions {
  createAvailability: (data: CreateAvailabilityData) => Promise<{ success: boolean; error?: string }>;
  updateAvailability: (id: string, data: Partial<CreateAvailabilityData>) => Promise<{ success: boolean; error?: string }>;
  deleteAvailability: (id: string) => Promise<{ success: boolean; error?: string }>;
  fetchAvailability: (creatorId: string) => Promise<void>;
  createCollaborationRequest: (data: CreateCollaborationRequestData) => Promise<{ success: boolean; error?: string }>;
  fetchCollaborationRequests: (type: 'sent' | 'received') => Promise<void>;
  respondToRequest: (requestId: string, response: 'accepted' | 'declined') => Promise<{ success: boolean; error?: string }>;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AvailabilitySettings>) => Promise<{ success: boolean; error?: string }>;
}

export function useAvailability(): [AvailabilityState, AvailabilityActions] {
  const { user } = useAuth();
  const [state, setState] = useState<AvailabilityState>({
    availability: [],
    collaborationRequests: [],
    settings: null,
    loading: false,
    error: null
  });

  const createAvailability = useCallback(async (data: CreateAvailabilityData) => {
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await availabilityService.createAvailability(data);
      
      if (result.error) {
        setState(prev => ({ ...prev, error: result.error, loading: false }));
        return { success: false, error: result.error };
      }

      // Refresh availability list by calling the service directly
      const refreshResult = await availabilityService.getCreatorAvailability(user.id);
      if (!refreshResult.error) {
        setState(prev => ({ 
          ...prev, 
          availability: refreshResult.data || [], 
          loading: false 
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create availability';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { success: false, error: errorMessage };
    }
  }, [user]);

  const updateAvailability = useCallback(async (id: string, data: Partial<CreateAvailabilityData>) => {
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await availabilityService.updateAvailability(id, data);
      
      if (result.error) {
        setState(prev => ({ ...prev, error: result.error, loading: false }));
        return { success: false, error: result.error };
      }

      // Refresh availability list by calling the service directly
      const refreshResult = await availabilityService.getCreatorAvailability(user.id);
      if (!refreshResult.error) {
        setState(prev => ({ 
          ...prev, 
          availability: refreshResult.data || [], 
          loading: false 
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update availability';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { success: false, error: errorMessage };
    }
  }, [user]);

  const deleteAvailability = useCallback(async (id: string) => {
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await availabilityService.deleteAvailability(id);
      
      if (result.error) {
        setState(prev => ({ ...prev, error: result.error, loading: false }));
        return { success: false, error: result.error };
      }

      // Refresh availability list by calling the service directly
      const refreshResult = await availabilityService.getCreatorAvailability(user.id);
      if (!refreshResult.error) {
        setState(prev => ({ 
          ...prev, 
          availability: refreshResult.data || [], 
          loading: false 
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete availability';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { success: false, error: errorMessage };
    }
  }, [user]);

  const fetchAvailability = useCallback(async (creatorId: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await availabilityService.getCreatorAvailability(creatorId);
      
      if (result.error) {
        setState(prev => ({ ...prev, error: result.error, loading: false }));
        return;
      }

      setState(prev => ({ 
        ...prev, 
        availability: result.data || [], 
        loading: false 
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch availability';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
    }
  }, []);

  const createCollaborationRequest = useCallback(async (data: CreateCollaborationRequestData) => {
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await availabilityService.createCollaborationRequest(data);
      
      if (result.error) {
        setState(prev => ({ ...prev, error: result.error, loading: false }));
        return { success: false, error: result.error };
      }

      setState(prev => ({ ...prev, loading: false }));
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create collaboration request';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { success: false, error: errorMessage };
    }
  }, [user]);

  const fetchCollaborationRequests = useCallback(async (type: 'sent' | 'received') => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await availabilityService.getCollaborationRequests(user.id, type);
      
      if (result.error) {
        setState(prev => ({ ...prev, error: result.error, loading: false }));
        return;
      }

      setState(prev => ({ 
        ...prev, 
        collaborationRequests: result.data || [], 
        loading: false 
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch collaboration requests';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
    }
  }, [user]);

  const respondToRequest = useCallback(async (requestId: string, response: 'accepted' | 'declined') => {
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await availabilityService.respondToCollaborationRequest(requestId, response);
      
      if (result.error) {
        setState(prev => ({ ...prev, error: result.error, loading: false }));
        return { success: false, error: result.error };
      }

      // Refresh collaboration requests by calling the service directly
      const refreshResult = await availabilityService.getCollaborationRequests(user.id, 'received');
      if (!refreshResult.error) {
        setState(prev => ({ 
          ...prev, 
          collaborationRequests: refreshResult.data || [], 
          loading: false 
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to respond to request';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { success: false, error: errorMessage };
    }
  }, [user]);

  const fetchSettings = useCallback(async () => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await availabilityService.getAvailabilitySettings(user.id);
      
      if (result.error) {
        setState(prev => ({ ...prev, error: result.error, loading: false }));
        return;
      }

      setState(prev => ({ 
        ...prev, 
        settings: result.data, 
        loading: false 
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch settings';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
    }
  }, [user]);

  const updateSettings = useCallback(async (settings: Partial<AvailabilitySettings>) => {
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await availabilityService.updateAvailabilitySettings(user.id, settings);
      
      if (result.error) {
        setState(prev => ({ ...prev, error: result.error, loading: false }));
        return { success: false, error: result.error };
      }

      // Refresh settings by calling the service directly
      const refreshResult = await availabilityService.getAvailabilitySettings(user.id);
      if (!refreshResult.error) {
        setState(prev => ({ 
          ...prev, 
          settings: refreshResult.data, 
          loading: false 
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update settings';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { success: false, error: errorMessage };
    }
  }, [user]);

  // Auto-fetch settings when user changes
  useEffect(() => {
    if (user) {
      const loadSettings = async () => {
        try {
          const result = await availabilityService.getAvailabilitySettings(user.id);
          if (!result.error) {
            setState(prev => ({ 
              ...prev, 
              settings: result.data, 
              loading: false 
            }));
          }
        } catch (error) {
          console.error('Error loading settings:', error);
        }
      };
      loadSettings();
    }
  }, [user]);

  const actions: AvailabilityActions = {
    createAvailability,
    updateAvailability,
    deleteAvailability,
    fetchAvailability,
    createCollaborationRequest,
    fetchCollaborationRequests,
    respondToRequest,
    fetchSettings,
    updateSettings
  };

  return [state, actions];
}
