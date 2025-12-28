/**
 * In-App Notifications Service
 * For Express Interest feature - Phase 1 implementation
 */

import { createServiceClient } from './supabase';

export interface NotificationPayload {
  userId: string;
  type: 'interest_received' | 'interest_accepted' | 'interest_rejected' | 'opportunity_match';
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Create an in-app notification for a user
 */
export async function createNotification(payload: NotificationPayload): Promise<void> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('web_notifications')
      .insert({
        user_id: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        read: false,
      });

    if (error) {
      console.error('Failed to create notification:', error);
      // Don't throw - notifications are non-critical
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    // Don't throw - notifications are non-critical
  }
}

/**
 * Notification helpers for Express Interest events
 */
export const opportunityNotifications = {
  /**
   * Notify opportunity poster when someone expresses interest
   */
  async interestReceived(
    posterUserId: string,
    interestedUserName: string,
    opportunityTitle: string,
    interestId: string,
    opportunityId: string
  ) {
    await createNotification({
      userId: posterUserId,
      type: 'interest_received',
      title: 'New Interest in Your Opportunity',
      body: `${interestedUserName} is interested in "${opportunityTitle}"`,
      data: {
        interestId,
        opportunityId,
        type: 'interest_received',
      },
    });
  },

  /**
   * Notify interested user when their interest is accepted
   */
  async interestAccepted(
    interestedUserId: string,
    posterName: string,
    opportunityTitle: string,
    interestId: string,
    opportunityId: string
  ) {
    await createNotification({
      userId: interestedUserId,
      type: 'interest_accepted',
      title: 'Your Interest Was Accepted! 🎉',
      body: `${posterName} accepted your interest in "${opportunityTitle}"`,
      data: {
        interestId,
        opportunityId,
        type: 'interest_accepted',
      },
    });
  },

  /**
   * Notify interested user when their interest is rejected
   */
  async interestRejected(
    interestedUserId: string,
    opportunityTitle: string,
    interestId: string
  ) {
    await createNotification({
      userId: interestedUserId,
      type: 'interest_rejected',
      title: 'Interest Update',
      body: `Update on your interest in "${opportunityTitle}"`,
      data: {
        interestId,
        type: 'interest_rejected',
      },
    });
  },

  /**
   * Notify subscribers when a new opportunity matches their alert
   */
  async opportunityMatch(
    userId: string,
    opportunityTitle: string,
    location: string | null,
    opportunityId: string,
    alertId?: string
  ) {
    await createNotification({
      userId,
      type: 'opportunity_match',
      title: 'New Opportunity Matches Your Interests! 🎯',
      body: `"${opportunityTitle}"${location ? ` - ${location}` : ''}`,
      data: {
        opportunityId,
        alertId,
        type: 'opportunity_match',
      },
    });
  },
};

