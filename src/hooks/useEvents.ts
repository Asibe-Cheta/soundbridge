import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../lib/event-service';
import type { Event, EventFilters, EventCreateData } from '../lib/types/event';

export interface EventsState {
  events: Event[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  filters: EventFilters;
}

export interface EventsActions {
  fetchEvents: (filters?: EventFilters) => Promise<void>;
  createEvent: (eventData: EventCreateData) => Promise<{ success: boolean; event?: Event; error?: string }>;
  updateEvent: (eventId: string, eventData: Partial<EventCreateData>) => Promise<{ success: boolean; event?: Event; error?: string }>;
  deleteEvent: (eventId: string) => Promise<{ success: boolean; error?: string }>;
  rsvpToEvent: (eventId: string, status: 'attending' | 'interested' | 'not_going') => Promise<{ success: boolean; error?: string }>;
  removeRsvp: (eventId: string) => Promise<{ success: boolean; error?: string }>;
  updateFilters: (filters: Partial<EventFilters>) => void;
  loadMore: () => Promise<void>;
  refreshEvents: () => Promise<void>;
}

export function useEvents(): [EventsState, EventsActions] {
  const { user } = useAuth();
  const [state, setState] = useState<EventsState>({
    events: [],
    loading: false,
    error: null,
    total: 0,
    hasMore: false,
    filters: {}
  });

  const fetchEvents = useCallback(async (filters: EventFilters = {}) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const result = await eventService.getEvents(filters);

      if (result.error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error instanceof Error ? result.error.message : 'Failed to fetch events'
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        events: result.data,
        loading: false,
        total: result.data.length,
        hasMore: result.data.length >= 20 // Assuming 20 is the default limit
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch events'
      }));
    }
  }, []);

  const createEvent = useCallback(async (eventData: EventCreateData): Promise<{ success: boolean; event?: Event; error?: string }> => {
    try {
      if (!user) {
        return { success: false, error: 'Authentication required' };
      }

      const result = await eventService.createEvent(eventData);

      if (result.error) {
        return { success: false, error: result.error instanceof Error ? result.error.message : 'Failed to create event' };
      }

      // Add new event to the list
      if (result.data) {
        setState(prev => ({
          ...prev,
          events: [result.data as Event, ...prev.events],
          total: prev.total + 1
        }));
      }

      return { success: true, event: result.data || undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create event'
      };
    }
  }, [user]);

  const updateEvent = useCallback(async (eventId: string, eventData: Partial<EventCreateData>): Promise<{ success: boolean; event?: Event; error?: string }> => {
    try {
      if (!user) {
        return { success: false, error: 'Authentication required' };
      }

      const result = await eventService.updateEvent(eventId, eventData);

      if (result.error) {
        return { success: false, error: result.error instanceof Error ? result.error.message : 'Failed to update event' };
      }

      // Update event in the list
      if (result.data) {
        setState(prev => ({
          ...prev,
          events: prev.events.map(event =>
            event.id === eventId ? result.data as Event : event
          )
        }));
      }

      return { success: true, event: result.data || undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update event'
      };
    }
  }, [user]);

  const deleteEvent = useCallback(async (eventId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
        return { success: false, error: 'Authentication required' };
      }

      const result = await eventService.deleteEvent(eventId);

      if (result.error) {
        return { success: false, error: result.error instanceof Error ? result.error.message : 'Failed to delete event' };
      }

      // Remove event from the list
      setState(prev => ({
        ...prev,
        events: prev.events.filter(event => event.id !== eventId),
        total: prev.total - 1
      }));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete event'
      };
    }
  }, [user]);

  const rsvpToEvent = useCallback(async (eventId: string, status: 'attending' | 'interested' | 'not_going'): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
        return { success: false, error: 'Authentication required' };
      }

      const result = await eventService.rsvpToEvent(eventId, status);

      if (result.error) {
        return { success: false, error: result.error?.message || 'Failed to RSVP' };
      }

      // Update event in the list with new RSVP status
      setState(prev => ({
        ...prev,
        events: prev.events.map(event => {
          if (event.id === eventId) {
            return {
              ...event,
              isAttending: status === 'attending',
              isInterested: status === 'interested',
              attendeeCount: status === 'attending' ? (event.attendeeCount || 0) + 1 : event.attendeeCount
            };
          }
          return event;
        })
      }));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to RSVP'
      };
    }
  }, [user]);

  const removeRsvp = useCallback(async (eventId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
        return { success: false, error: 'Authentication required' };
      }

      // This would need to be implemented in the event service
      // For now, we'll just update the local state
      setState(prev => ({
        ...prev,
        events: prev.events.map(event => {
          if (event.id === eventId) {
            return {
              ...event,
              isAttending: false,
              isInterested: false,
              attendeeCount: Math.max(0, (event.attendeeCount || 0) - 1)
            };
          }
          return event;
        })
      }));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove RSVP'
      };
    }
  }, [user]);

  const updateFilters = useCallback((newFilters: Partial<EventFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters }
    }));
  }, []);

  const loadMore = useCallback(async () => {
    if (state.loading || !state.hasMore) return;

    try {
      setState(prev => ({ ...prev, loading: true }));

      const offset = state.events.length;
      const result = await eventService.getEvents({
        ...state.filters,
        offset,
        limit: 20
      });

      if (result.error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error?.message || 'Failed to load more events'
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        events: [...prev.events, ...result.data.filter((event): event is Event => event !== null)],
        loading: false,
        hasMore: result.data.length >= 20
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load more events'
      }));
    }
  }, [state.loading, state.hasMore, state.filters, state.events.length]);

  const refreshEvents = useCallback(async () => {
    await fetchEvents(state.filters);
  }, [state.filters]);

  // Initial load
  useEffect(() => {
    fetchEvents();
  }, []);

  return [
    state,
    {
      fetchEvents,
      createEvent,
      updateEvent,
      deleteEvent,
      rsvpToEvent,
      removeRsvp,
      updateFilters,
      loadMore,
      refreshEvents
    }
  ];
} 