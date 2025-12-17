// Moderation Notification Service for SoundBridge
// Multi-channel notifications: Email (SendGrid) + In-app + Push

import { createClient } from '@supabase/supabase-js';
import {
  getTrackFlaggedEmail,
  getTrackApprovedEmail,
  getTrackRejectedEmail,
  getAppealReceivedEmail,
  getAppealApprovedEmail,
  getAppealRejectedEmail,
  type EmailTemplateData
} from './email-templates';

/**
 * Moderation notification data structure
 */
export interface ModerationNotificationData {
  userId: string;
  trackId: string;
  trackTitle: string;
  artistName: string;
  type: 'track_flagged' | 'track_approved' | 'track_rejected' | 'appeal_received' | 'appeal_approved' | 'appeal_rejected';
  action?: 'approve' | 'reject';
  reason?: string;
  reviewedBy?: string;
  appealText?: string;
}

/**
 * Get email template for notification type
 */
function getEmailTemplate(data: ModerationNotificationData, username: string): { subject: string; html: string } {
  const templateData: EmailTemplateData = {
    username,
    trackTitle: data.trackTitle,
    artistName: data.artistName,
    trackId: data.trackId,
    reason: data.reason,
    appealText: data.appealText
  };

  switch (data.type) {
    case 'track_flagged':
      return getTrackFlaggedEmail(templateData);
    case 'track_approved':
      return getTrackApprovedEmail(templateData);
    case 'track_rejected':
      return getTrackRejectedEmail(templateData);
    case 'appeal_received':
      return getAppealReceivedEmail(templateData);
    case 'appeal_approved':
      return getAppealApprovedEmail(templateData);
    case 'appeal_rejected':
      return getAppealRejectedEmail(templateData);
  }
}

/**
 * Send email notification via SendGrid
 */
export async function sendEmailNotification(data: ModerationNotificationData): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user email and username
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, username')
      .eq('id', data.userId)
      .single();

    if (!profile?.email) {
      console.log('No email found for user:', data.userId);
      return;
    }

    const username = profile.username || 'there';
    const emailTemplate = getEmailTemplate(data, username);

    // Send via SendGrid API
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://soundbridge.live';
    const response = await fetch(`${appUrl}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: profile.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      })
    });

    if (!response.ok) {
      throw new Error(`Email API returned ${response.status}`);
    }

    console.log(`✅ Email sent to ${profile.email} (${data.type})`);
  } catch (error) {
    console.error('Error sending email notification:', error);
    throw error;
  }
}

/**
 * Create in-app notification
 */
export async function createInAppNotification(data: ModerationNotificationData): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const notificationMessages: Record<typeof data.type, string> = {
      track_flagged: `Your track "${data.trackTitle}" is under review`,
      track_approved: `Your track "${data.trackTitle}" has been approved! 🎉`,
      track_rejected: `Your track "${data.trackTitle}" was not approved`,
      appeal_received: `We received your appeal for "${data.trackTitle}"`,
      appeal_approved: `Your appeal for "${data.trackTitle}" has been approved! 🎉`,
      appeal_rejected: `Appeal decision for "${data.trackTitle}"`
    };

    const { error } = await supabase.from('notifications').insert({
      user_id: data.userId,
      type: 'moderation',
      title: 'Content Moderation',
      message: notificationMessages[data.type],
      link: `/track/${data.trackId}`,
      read: false,
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error('Error creating in-app notification:', error);
      throw error;
    }

    console.log(`✅ In-app notification created for user ${data.userId}`);
  } catch (error) {
    console.error('Error in createInAppNotification:', error);
    throw error;
  }
}

/**
 * Send push notification to mobile app (Expo)
 */
export async function sendPushNotification(data: ModerationNotificationData): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's push token
    const { data: profile } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', data.userId)
      .single();

    if (!profile?.expo_push_token) {
      console.log('No push token for user:', data.userId);
      return;
    }

    const pushMessages: Record<typeof data.type, { title: string; body: string }> = {
      track_flagged: {
        title: '🔍 Track Under Review',
        body: `"${data.trackTitle}" is being reviewed by our team`
      },
      track_approved: {
        title: '✅ Track Approved!',
        body: `"${data.trackTitle}" is now live`
      },
      track_rejected: {
        title: '❌ Track Not Approved',
        body: `"${data.trackTitle}" was not approved. Tap to appeal.`
      },
      appeal_received: {
        title: '📬 Appeal Received',
        body: `We're reviewing your appeal for "${data.trackTitle}"`
      },
      appeal_approved: {
        title: '🎉 Appeal Approved!',
        body: `"${data.trackTitle}" has been reinstated`
      },
      appeal_rejected: {
        title: 'Appeal Decision',
        body: `Decision made on your appeal for "${data.trackTitle}"`
      }
    };

    const message = pushMessages[data.type];

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: profile.expo_push_token,
        title: message.title,
        body: message.body,
        data: { trackId: data.trackId, type: 'moderation' },
        sound: 'default',
        priority: 'high'
      })
    });

    if (!response.ok) {
      throw new Error(`Expo Push API returned ${response.status}`);
    }

    console.log(`✅ Push notification sent to user ${data.userId}`);
  } catch (error) {
    console.error('Error sending push notification:', error);
    // Don't throw - push notifications are optional
  }
}

/**
 * Send all notifications (email + in-app + push)
 * Main entry point for sending moderation notifications
 */
export async function sendModerationNotification(data: ModerationNotificationData): Promise<void> {
  console.log(`📧 Sending moderation notification: ${data.type} for track ${data.trackId}`);

  try {
    // Send all notifications in parallel
    await Promise.allSettled([
      sendEmailNotification(data),
      createInAppNotification(data),
      sendPushNotification(data)
    ]);

    console.log(`✅ All notifications sent for ${data.type}`);
  } catch (error) {
    console.error('Error in sendModerationNotification:', error);
    // Don't throw - we want at least some notifications to succeed
  }
}
