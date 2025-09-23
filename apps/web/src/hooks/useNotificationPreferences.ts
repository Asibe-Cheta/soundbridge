import { useState, useEffect, useCallback } from 'react';

export interface NotificationPreferences {
  locationRadius: number;
  eventCategories: string[];
  notificationTiming: string;
  deliveryMethods: string[];
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  creatorActivity: boolean;
  socialNotifications: {
    follows: boolean;
    messages: boolean;
    collaborations: boolean;
    likes: boolean;
    shares: boolean;
  };
  collaborationRequests: {
    newRequests: boolean;
    requestUpdates: boolean;
    requestReminders: boolean;
    deliveryMethods: string[];
  };
}

export interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences | null;
  loading: boolean;
  error: string | null;
  savePreferences: (section: string, data: any) => Promise<boolean>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<boolean>;
  refreshPreferences: () => Promise<void>;
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences from API
  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/notifications/preferences');
      const result = await response.json();

      if (response.ok && result.success) {
        setPreferences(result.data);
      } else {
        setError(result.error || 'Failed to load preferences');
      }
    } catch (err) {
      setError('Network error while loading preferences');
      console.error('Error loading notification preferences:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save preferences for a specific section
  const savePreferences = useCallback(async (section: string, data: any): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section,
          data
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setPreferences(result.data);
        return true;
      } else {
        setError(result.error || 'Failed to save preferences');
        return false;
      }
    } catch (err) {
      setError('Network error while saving preferences');
      console.error('Error saving notification preferences:', err);
      return false;
    }
  }, []);

  // Update preferences (full update)
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPreferences),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setPreferences(result.data);
        return true;
      } else {
        setError(result.error || 'Failed to update preferences');
        return false;
      }
    } catch (err) {
      setError('Network error while updating preferences');
      console.error('Error updating notification preferences:', err);
      return false;
    }
  }, []);

  // Refresh preferences from server
  const refreshPreferences = useCallback(async (): Promise<void> => {
    await loadPreferences();
  }, [loadPreferences]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    error,
    savePreferences,
    updatePreferences,
    refreshPreferences
  };
}
