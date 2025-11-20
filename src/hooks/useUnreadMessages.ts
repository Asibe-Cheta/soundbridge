import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { messagingService } from '../services/messagingService';

export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnreadCount = async () => {
    if (!user?.id) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await messagingService.getUnreadCount(user.id);
      if (!error && data !== null) {
        setUnreadCount(data);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const subscription = messagingService.subscribeToMessages(user.id, () => {
      // When a new message arrives, refresh the count
      fetchUnreadCount();
    });

    return () => {
      messagingService.unsubscribeFromMessages(subscription);
    };
  }, [user]);

  return { unreadCount, isLoading, refetch: fetchUnreadCount };
}

