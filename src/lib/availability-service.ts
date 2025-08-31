import { createBrowserClient } from './supabase';
import type {
  CreatorAvailability,
  CollaborationRequest,
  AvailabilitySlot,
  AvailabilitySettings,
  CreateAvailabilityData,
  CreateCollaborationRequestData
} from './types/availability';

class AvailabilityService {
  private supabase = createBrowserClient();

  // Availability Management
  async createAvailability(data: CreateAvailabilityData): Promise<{ data: CreatorAvailability | null; error: string | null }> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: 'Authentication required' };
      }

      const { data: availability, error } = await this.supabase
        .from('creator_availability')
        .insert({
          creator_id: user.id,
          start_date: data.start_date,
          end_date: data.end_date,
          is_available: data.is_available,
          max_requests_per_slot: data.max_requests_per_slot || 1,
          notes: data.notes
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating availability:', error);
        return { data: null, error: 'Failed to create availability slot' };
      }

      return { data: availability, error: null };
    } catch (error) {
      console.error('Unexpected error creating availability:', error);
      return { data: null, error: 'Internal server error' };
    }
  }

  async getCreatorAvailability(creatorId: string): Promise<{ data: AvailabilitySlot[] | null; error: string | null }> {
    try {
      const { data: availability, error } = await this.supabase
        .from('creator_availability')
        .select('*')
        .eq('creator_id', creatorId)
        .gte('end_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching availability:', error);
        return { data: null, error: 'Failed to fetch availability' };
      }

      // Transform to AvailabilitySlot format
      const slots: AvailabilitySlot[] = availability?.map(slot => ({
        id: slot.id,
        start_date: slot.start_date,
        end_date: slot.end_date,
        is_available: slot.is_available,
        request_count: 0, // TODO: Get from collaboration_requests table
        max_requests: slot.max_requests_per_slot,
        notes: slot.notes
      })) || [];

      return { data: slots, error: null };
    } catch (error) {
      console.error('Unexpected error fetching availability:', error);
      return { data: null, error: 'Internal server error' };
    }
  }

  async updateAvailability(availabilityId: string, updates: Partial<CreateAvailabilityData>): Promise<{ data: CreatorAvailability | null; error: string | null }> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: 'Authentication required' };
      }

      const { data: availability, error } = await this.supabase
        .from('creator_availability')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', availabilityId)
        .eq('creator_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating availability:', error);
        return { data: null, error: 'Failed to update availability' };
      }

      return { data: availability, error: null };
    } catch (error) {
      console.error('Unexpected error updating availability:', error);
      return { data: null, error: 'Internal server error' };
    }
  }

  async deleteAvailability(availabilityId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'Authentication required' };
      }

      const { error } = await this.supabase
        .from('creator_availability')
        .delete()
        .eq('id', availabilityId)
        .eq('creator_id', user.id);

      if (error) {
        console.error('Error deleting availability:', error);
        return { success: false, error: 'Failed to delete availability' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Unexpected error deleting availability:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  // Collaboration Requests
  async createCollaborationRequest(data: CreateCollaborationRequestData): Promise<{ data: CollaborationRequest | null; error: string | null }> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: 'Authentication required' };
      }

      // Check if the creator has availability for the requested time
      const { data: availability, error: availabilityError } = await this.supabase
        .from('creator_availability')
        .select('*')
        .eq('id', data.availability_id)
        .eq('creator_id', data.creator_id)
        .eq('is_available', true)
        .lte('start_date', data.proposed_start_date)  // Your start should be >= slot start
        .gte('end_date', data.proposed_end_date)      // Your end should be <= slot end
        .single();

      if (availabilityError || !availability) {
        return { data: null, error: 'Creator is not available for the requested time' };
      }

      // Check if there are already too many requests for this slot
      const { count: requestCount, error: countError } = await this.supabase
        .from('collaboration_requests')
        .select('*', { count: 'exact', head: true })
        .eq('availability_id', data.availability_id)
        .eq('status', 'pending');

      if (countError) {
        console.error('Error checking request count:', countError);
      } else if (requestCount && requestCount >= availability.max_requests_per_slot) {
        return { data: null, error: 'This time slot has reached maximum request limit' };
      }

      const { data: request, error } = await this.supabase
        .from('collaboration_requests')
        .insert({
          requester_id: user.id,
          creator_id: data.creator_id,
          availability_id: data.availability_id,
          proposed_start_date: data.proposed_start_date,
          proposed_end_date: data.proposed_end_date,
          subject: data.subject,
          message: data.message,
          status: 'pending'
        })
        .select(`
          *,
          requester:profiles!collaboration_requests_requester_id_fkey(
            id,
            display_name,
            username,
            avatar_url
          ),
          creator:profiles!collaboration_requests_creator_id_fkey(
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('Error creating collaboration request:', error);
        return { data: null, error: 'Failed to create collaboration request' };
      }

      return { data: request, error: null };
    } catch (error) {
      console.error('Unexpected error creating collaboration request:', error);
      return { data: null, error: 'Internal server error' };
    }
  }

  async getCollaborationRequests(userId: string, type: 'sent' | 'received'): Promise<{ data: CollaborationRequest[] | null; error: string | null }> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: 'Authentication required' };
      }

      let query = this.supabase
        .from('collaboration_requests')
        .select(`
          *,
          requester:profiles!collaboration_requests_requester_id_fkey(
            id,
            display_name,
            username,
            avatar_url
          ),
          creator:profiles!collaboration_requests_creator_id_fkey(
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (type === 'sent') {
        query = query.eq('requester_id', userId);
      } else {
        query = query.eq('creator_id', userId);
      }

      const { data: requests, error } = await query;

      if (error) {
        console.error('Error fetching collaboration requests:', error);
        return { data: null, error: 'Failed to fetch collaboration requests' };
      }

      return { data: requests, error: null };
    } catch (error) {
      console.error('Unexpected error fetching collaboration requests:', error);
      return { data: null, error: 'Internal server error' };
    }
  }

  async respondToCollaborationRequest(requestId: string, response: 'accepted' | 'declined'): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'Authentication required' };
      }

      const { error } = await this.supabase
        .from('collaboration_requests')
        .update({
          status: response,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('creator_id', user.id);

      if (error) {
        console.error('Error responding to collaboration request:', error);
        return { success: false, error: 'Failed to respond to request' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Unexpected error responding to collaboration request:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  // Settings Management
  async getAvailabilitySettings(userId: string): Promise<{ data: AvailabilitySettings | null; error: string | null }> {
    try {
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('collaboration_enabled, auto_decline_unavailable, min_notice_days')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching availability settings:', error);
        return { data: null, error: 'Failed to fetch settings' };
      }

      const settings: AvailabilitySettings = {
        collaboration_enabled: profile.collaboration_enabled ?? true,
        auto_decline_unavailable: profile.auto_decline_unavailable ?? true,
        min_notice_days: profile.min_notice_days ?? 7
      };

      return { data: settings, error: null };
    } catch (error) {
      console.error('Unexpected error fetching availability settings:', error);
      return { data: null, error: 'Internal server error' };
    }
  }

  async updateAvailabilitySettings(userId: string, settings: Partial<AvailabilitySettings>): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await this.supabase
        .from('profiles')
        .update(settings)
        .eq('id', userId);

      if (error) {
        console.error('Error updating availability settings:', error);
        return { success: false, error: 'Failed to update settings' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Unexpected error updating availability settings:', error);
      return { success: false, error: 'Internal server error' };
    }
  }
}

export const availabilityService = new AvailabilityService();
