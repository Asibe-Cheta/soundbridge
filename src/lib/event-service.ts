import { createBrowserClient } from './supabase';
import type { Event, EventAttendee, EventFilters, EventCreateData } from './types/event';

export class EventService {
  private supabase = createBrowserClient();

  // Get all events with optional filters
  async getEvents(filters: EventFilters = {}): Promise<{ data: Event[]; error: unknown }> {
    try {
      let query = this.supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            banner_url,
            bio,
            location,
            country
          ),
          attendees:event_attendees(
            user_id,
            status,
            created_at
          )
        `)
        .order('event_date', { ascending: true });

      // Apply filters
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters.location && filters.location !== 'all') {
        query = query.ilike('location', `%${filters.location}%`);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters.dateRange) {
        const now = new Date();
        let startDate: Date;

        switch (filters.dateRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'next-month':
            startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            break;
          default:
            startDate = now;
        }

        query = query.gte('event_date', startDate.toISOString());
      }

      if (filters.priceRange && filters.priceRange !== 'all') {
        switch (filters.priceRange) {
          case 'free':
            query = query.eq('price_gbp', 0).eq('price_ngn', 0);
            break;
          case 'low':
            query = query.lt('price_gbp', 20);
            break;
          case 'medium':
            query = query.gte('price_gbp', 20).lte('price_gbp', 50);
            break;
          case 'high':
            query = query.gt('price_gbp', 50);
            break;
        }
      }

      // Only show future events by default
      if (!filters.includePast) {
        query = query.gte('event_date', new Date().toISOString());
      }

      const { data, error } = await query;

      if (error) {
        return { data: [], error };
      }

      // Transform data to include computed fields
      const events = data?.map(event => ({
        ...event,
        attendeeCount: event.attendees?.length || 0,
        isAttending: event.attendees?.some((a: { status: string }) => a.status === 'attending') || false,
        isInterested: event.attendees?.some((a: { status: string }) => a.status === 'interested') || false,
        formattedDate: this.formatEventDate(event.event_date),
        formattedPrice: this.formatPrice(event.price_gbp, event.price_ngn),
        isFeatured: this.isFeaturedEvent(event),
        rating: this.calculateEventRating(event)
      } as Event)) || [];

      return { data: events, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get event by ID with full details
  async getEventById(id: string): Promise<{ data: Event | null; error: unknown }> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            banner_url,
            bio,
            location,
            country,
            social_links
          ),
          attendees:event_attendees(
            user_id,
            status,
            created_at,
            user:profiles(
              id,
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error };
      }

      if (!data) {
        return { data: null, error: 'Event not found' };
      }

      // Transform data
      const event = {
        ...data,
        attendeeCount: data.attendees?.length || 0,
        attendingUsers: data.attendees?.filter((a: any) => a.status === 'attending') || [],
        interestedUsers: data.attendees?.filter((a: any) => a.status === 'interested') || [],
        formattedDate: this.formatEventDate(data.event_date),
        formattedPrice: this.formatPrice(data.price_gbp, data.price_ngn),
        isFeatured: this.isFeaturedEvent(data),
        rating: this.calculateEventRating(data)
      };

      return { data: event, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get events by creator
  async getEventsByCreator(creatorId: string): Promise<{ data: Event[]; error: unknown }> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            banner_url
          ),
          attendees:event_attendees(count)
        `)
        .eq('creator_id', creatorId)
        .order('event_date', { ascending: true });

      if (error) {
        return { data: [], error };
      }

      const events = data?.map(event => ({
        ...event,
        attendeeCount: event.attendees?.[0]?.count || 0,
        formattedDate: this.formatEventDate(event.event_date),
        formattedPrice: this.formatPrice(event.price_gbp, event.price_ngn),
        isFeatured: this.isFeaturedEvent(event),
        rating: this.calculateEventRating(event)
      } as Event)) || [];

      return { data: events, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get user's attending events
  async getUserAttendingEvents(userId: string): Promise<{ data: Event[]; error: unknown }> {
    try {
      const { data, error } = await this.supabase
        .from('event_attendees')
        .select(`
          event:events(
            *,
            creator:profiles!events_creator_id_fkey(
              id,
              username,
              display_name,
              avatar_url,
              banner_url
            ),
            attendees:event_attendees(count)
          )
        `)
        .eq('user_id', userId)
        .in('status', ['attending', 'interested'])
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], error };
      }

      const events = data?.map(item => {
        const event = {
          ...item.event,
          attendeeCount: (item.event as any).attendees?.[0]?.count || 0,
          userStatus: (item as any).status,
          formattedDate: this.formatEventDate((item.event as any).event_date),
          formattedPrice: this.formatPrice((item.event as any).price_gbp, (item.event as any).price_ngn),
          isFeatured: this.isFeaturedEvent(item.event),
          rating: this.calculateEventRating(item.event)
        };
        return event as unknown as Event;
      }) || [];

      return { data: events, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Create new event
  async createEvent(eventData: EventCreateData): Promise<{ data: Event | null; error: unknown }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { data: null, error: 'Authentication required' };
      }

      const { data, error } = await this.supabase
        .from('events')
        .insert([{
          ...eventData,
          creator_id: user.id,
          current_attendees: 0
        }])
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            banner_url
          )
        `)
        .single();

      if (error) {
        return { data: null, error };
      }

      const event = {
        ...data,
        attendeeCount: 0,
        formattedDate: this.formatEventDate(data.event_date),
        formattedPrice: this.formatPrice(data.price_gbp, data.price_ngn),
        isFeatured: this.isFeaturedEvent(data),
        rating: this.calculateEventRating(data)
      } as Event;

      return { data: event, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Update event
  async updateEvent(eventId: string, eventData: Partial<EventCreateData>): Promise<{ data: Event | null; error: unknown }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { data: null, error: 'Authentication required' };
      }

      // Verify user owns the event
      const { data: existingEvent } = await this.supabase
        .from('events')
        .select('creator_id')
        .eq('id', eventId)
        .single();

      if (!existingEvent || existingEvent.creator_id !== user.id) {
        return { data: null, error: 'Unauthorized' };
      }

      const { data, error } = await this.supabase
        .from('events')
        .update(eventData)
        .eq('id', eventId)
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            banner_url
          )
        `)
        .single();

      if (error) {
        return { data: null, error };
      }

      const event = {
        ...data,
        attendeeCount: 0,
        formattedDate: this.formatEventDate(data.event_date),
        formattedPrice: this.formatPrice(data.price_gbp, data.price_ngn),
        isFeatured: this.isFeaturedEvent(data),
        rating: this.calculateEventRating(data)
      } as Event;

      return { data: event, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Delete event
  async deleteEvent(eventId: string): Promise<{ success: boolean; error: unknown }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Authentication required' };
      }

      // Verify user owns the event
      const { data: existingEvent } = await this.supabase
        .from('events')
        .select('creator_id')
        .eq('id', eventId)
        .single();

      if (!existingEvent || existingEvent.creator_id !== user.id) {
        return { success: false, error: 'Unauthorized' };
      }

      const { error } = await this.supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      return { success: !error, error };
    } catch (error) {
      return { success: false, error };
    }
  }

  // RSVP to event
  async rsvpToEvent(eventId: string, status: 'attending' | 'interested' | 'not_going'): Promise<{ success: boolean; error: unknown }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Authentication required' };
      }

      const { error } = await this.supabase
        .from('event_attendees')
        .upsert({
          event_id: eventId,
          user_id: user.id,
          status,
          updated_at: new Date().toISOString()
        });

      return { success: !error, error };
    } catch (error) {
      return { success: false, error };
    }
  }

  // Get nearby events (location-based)
  async getNearbyEvents(latitude: number, longitude: number, radiusKm: number = 50): Promise<{ data: Event[]; error: unknown }> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_nearby_events', {
          user_lat: latitude,
          user_lng: longitude,
          radius_km: radiusKm
        });

      if (error) {
        return { data: [], error };
      }

      const events = data?.map((event: any) => ({
        ...event,
        attendeeCount: event.attendee_count || 0,
        formattedDate: this.formatEventDate(event.event_date),
        formattedPrice: this.formatPrice(event.price_gbp, event.price_ngn),
        isFeatured: this.isFeaturedEvent(event),
        rating: this.calculateEventRating(event)
      })) || [];

      return { data: events, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get trending events
  async getTrendingEvents(limit: number = 10): Promise<{ data: Event[]; error: unknown }> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            banner_url
          ),
          attendees:event_attendees(count)
        `)
        .gte('event_date', new Date().toISOString())
        .order('current_attendees', { ascending: false })
        .limit(limit);

      if (error) {
        return { data: [], error };
      }

      const events = data?.map(event => ({
        ...event,
        attendeeCount: event.attendees?.[0]?.count || 0,
        formattedDate: this.formatEventDate(event.event_date),
        formattedPrice: this.formatPrice(event.price_gbp, event.price_ngn),
        isFeatured: this.isFeaturedEvent(event),
        rating: this.calculateEventRating(event)
      })) || [];

      return { data: events, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Helper methods
  private formatEventDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays < 7) {
      return `${diffDays} days`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }
  }

  private formatPrice(priceGbp: number | null, priceNgn: number | null): string {
    if (priceGbp === 0 && priceNgn === 0) {
      return 'Free Entry';
    }

    if (priceGbp && priceGbp > 0) {
      return `£${priceGbp}`;
    }

    if (priceNgn && priceNgn > 0) {
      return `₦${priceNgn.toLocaleString()}`;
    }

    return 'Free Entry';
  }

  private isFeaturedEvent(event: { current_attendees?: number }): boolean {
    // Logic to determine if event is featured
    // Could be based on attendee count, creator reputation, etc.
    return (event.current_attendees || 0) > 100;
  }

  private calculateEventRating(event: { current_attendees?: number }): number {
    // Placeholder for rating calculation
    // Could be based on attendee feedback, creator rating, etc.
    return 4.5 + Math.random() * 0.5;
  }
}

// Export singleton instance
export const eventService = new EventService(); 