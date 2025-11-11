import { createClient } from '@supabase/supabase-js';

import { SendGridService } from '@/src/lib/sendgrid-service';
import type { Database } from '@/src/lib/types';

type ServiceBookingRow = Database['public']['Tables']['service_bookings']['Row'];
type ServiceOfferingRow = Database['public']['Tables']['service_offerings']['Row'];
type BookingNotificationRow = Database['public']['Tables']['booking_notifications']['Row'];

type BookingProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
};

export type BookingNotificationType =
  | 'booking_request_booker'
  | 'booking_request_provider'
  | 'booking_confirmed_booker'
  | 'booking_confirmed_provider'
  | 'booking_payment_reminder_booker'
  | 'booking_payment_received_booker'
  | 'booking_payment_received_provider'
  | 'booking_24h_reminder_booker'
  | 'booking_24h_reminder_provider'
  | 'booking_completion_prompt_booker'
  | 'booking_completion_prompt_provider'
  | 'booking_cancelled_booker'
  | 'booking_cancelled_provider'
  | 'booking_disputed_booker'
  | 'booking_disputed_provider'
  | 'booking_disputed_admin';

interface BookingContext {
  booking: ServiceBookingRow;
  offering: ServiceOfferingRow | null;
  provider: BookingProfile | null;
  booker: BookingProfile | null;
}

interface NotificationPayload {
  templateId: string;
  dynamicTemplateData: Record<string, any>;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const bookingAdminEmail = process.env.BOOKING_ADMIN_EMAIL || process.env.SUPPORT_EMAIL || null;

const TEMPLATE_ID_MAP: Partial<Record<BookingNotificationType, string | undefined>> = {
  booking_request_booker: process.env.SENDGRID_BOOKING_REQUEST_BOOKER_TEMPLATE_ID,
  booking_request_provider: process.env.SENDGRID_BOOKING_REQUEST_PROVIDER_TEMPLATE_ID,
  booking_confirmed_booker: process.env.SENDGRID_BOOKING_CONFIRMED_BOOKER_TEMPLATE_ID,
  booking_confirmed_provider: process.env.SENDGRID_BOOKING_CONFIRMED_PROVIDER_TEMPLATE_ID,
  booking_payment_reminder_booker: process.env.SENDGRID_BOOKING_PAYMENT_REMINDER_TEMPLATE_ID,
  booking_payment_received_booker: process.env.SENDGRID_BOOKING_PAYMENT_RECEIVED_BOOKER_TEMPLATE_ID,
  booking_payment_received_provider: process.env.SENDGRID_BOOKING_PAYMENT_RECEIVED_PROVIDER_TEMPLATE_ID,
  booking_24h_reminder_booker: process.env.SENDGRID_BOOKING_24H_REMINDER_BOOKER_TEMPLATE_ID,
  booking_24h_reminder_provider: process.env.SENDGRID_BOOKING_24H_REMINDER_PROVIDER_TEMPLATE_ID,
  booking_completion_prompt_booker: process.env.SENDGRID_BOOKING_COMPLETION_PROMPT_BOOKER_TEMPLATE_ID,
  booking_completion_prompt_provider: process.env.SENDGRID_BOOKING_COMPLETION_PROMPT_PROVIDER_TEMPLATE_ID,
  booking_cancelled_booker: process.env.SENDGRID_BOOKING_CANCELLED_BOOKER_TEMPLATE_ID,
  booking_cancelled_provider: process.env.SENDGRID_BOOKING_CANCELLED_PROVIDER_TEMPLATE_ID,
  booking_disputed_booker: process.env.SENDGRID_BOOKING_DISPUTED_BOOKER_TEMPLATE_ID,
  booking_disputed_provider: process.env.SENDGRID_BOOKING_DISPUTED_PROVIDER_TEMPLATE_ID,
  booking_disputed_admin: process.env.SENDGRID_BOOKING_DISPUTED_ADMIN_TEMPLATE_ID,
};

const BASE_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://soundbridge.live';

const PAYMENT_REMINDER_HOURS = 12;
const COMPLETION_PROMPT_DELAY_MINUTES = 60;

const REMINDER_NOTIFICATION_TYPES: BookingNotificationType[] = [
  'booking_payment_reminder_booker',
  'booking_24h_reminder_booker',
  'booking_24h_reminder_provider',
  'booking_completion_prompt_booker',
  'booking_completion_prompt_provider',
];

class BookingNotificationService {
  private supabaseAdmin =
    supabaseUrl && supabaseServiceRoleKey
      ? createClient<any>(supabaseUrl, supabaseServiceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      : null;

  private isReady() {
    if (!this.supabaseAdmin) {
      console.error('BookingNotificationService not initialised: missing Supabase service credentials');
      return false;
    }
    return true;
  }

  async queueBookingRequested(bookingId: string) {
    if (!this.isReady()) return;
    const context = await this.getBookingContext(bookingId);
    if (!context) return;

    await Promise.all([
      this.queueNotification('booking_request_booker', context, 'booker'),
      this.queueNotification('booking_request_provider', context, 'provider'),
    ]);
  }

  async queueBookingConfirmed(bookingId: string) {
    if (!this.isReady()) return;
    const context = await this.getBookingContext(bookingId);
    if (!context) return;

    await Promise.all([
      this.queueNotification('booking_confirmed_booker', context, 'booker'),
      this.queueNotification('booking_confirmed_provider', context, 'provider'),
    ]);

    const confirmedAt = context.booking.confirmed_at
      ? new Date(context.booking.confirmed_at)
      : new Date();
    const paymentReminder = new Date(confirmedAt.getTime() + PAYMENT_REMINDER_HOURS * 60 * 60 * 1000);

    // Only schedule reminder if before session start
    if (paymentReminder < new Date(context.booking.scheduled_start)) {
      await this.queueNotification('booking_payment_reminder_booker', context, 'booker', {
        scheduledFor: paymentReminder,
        allowDuplicate: false,
      });
    }
  }

  async queuePaymentReceived(bookingId: string) {
    if (!this.isReady()) return;
    const context = await this.getBookingContext(bookingId);
    if (!context) return;

    await Promise.all([
      this.queueNotification('booking_payment_received_booker', context, 'booker'),
      this.queueNotification('booking_payment_received_provider', context, 'provider'),
    ]);

    await this.cancelOutstandingReminders(context.booking.id, 'Payment received');

    // 24 hour reminder
    const startTime = new Date(context.booking.scheduled_start);
    const reminderTime = new Date(startTime.getTime() - 24 * 60 * 60 * 1000);
    const reminderScheduledFor = reminderTime > new Date() ? reminderTime : new Date();

    await Promise.all([
      this.queueNotification('booking_24h_reminder_booker', context, 'booker', {
        scheduledFor: reminderScheduledFor,
        allowDuplicate: false,
      }),
      this.queueNotification('booking_24h_reminder_provider', context, 'provider', {
        scheduledFor: reminderScheduledFor,
        allowDuplicate: false,
      }),
    ]);

    // Completion prompt (1 hour after scheduled end)
    const endTime = new Date(context.booking.scheduled_end);
    const completionPromptAt = new Date(endTime.getTime() + COMPLETION_PROMPT_DELAY_MINUTES * 60 * 1000);
    const completionScheduledFor = completionPromptAt > new Date() ? completionPromptAt : new Date();

    await Promise.all([
      this.queueNotification('booking_completion_prompt_booker', context, 'booker', {
        scheduledFor: completionScheduledFor,
        allowDuplicate: false,
      }),
      this.queueNotification('booking_completion_prompt_provider', context, 'provider', {
        scheduledFor: completionScheduledFor,
        allowDuplicate: false,
      }),
    ]);
  }

  async queueBookingCancelled(bookingId: string, reason?: string | null) {
    if (!this.isReady()) return;
    const context = await this.getBookingContext(bookingId);
    if (!context) return;

    await this.cancelOutstandingReminders(context.booking.id, 'Booking cancelled');

    await Promise.all([
      this.queueNotification('booking_cancelled_booker', context, 'booker', {
        allowDuplicate: false,
        payloadOverrides: { cancellation_reason: reason ?? context.booking.cancellation_reason ?? '' },
      }),
      this.queueNotification('booking_cancelled_provider', context, 'provider', {
        allowDuplicate: false,
        payloadOverrides: { cancellation_reason: reason ?? context.booking.cancellation_reason ?? '' },
      }),
    ]);
  }

  async queueBookingDisputed(bookingId: string, reason?: string | null) {
    if (!this.isReady()) return;
    const context = await this.getBookingContext(bookingId);
    if (!context) return;

    await this.cancelOutstandingReminders(context.booking.id, 'Booking disputed');

    const payloadOverrides = { dispute_reason: reason ?? context.booking.dispute_reason ?? '' };

    const tasks: Promise<void>[] = [
      this.queueNotification('booking_disputed_booker', context, 'booker', {
        allowDuplicate: false,
        payloadOverrides,
      }),
      this.queueNotification('booking_disputed_provider', context, 'provider', {
        allowDuplicate: false,
        payloadOverrides,
      }),
    ];

    if (bookingAdminEmail) {
      tasks.push(
        this.queueNotification('booking_disputed_admin', context, 'admin', {
          allowDuplicate: false,
          payloadOverrides,
        }),
      );
    }

    await Promise.all(tasks);
  }

  async sendQueuedNotifications(limit = 50): Promise<{ sent: number; failed: number }> {
    if (!this.isReady()) return { sent: 0, failed: 0 };

    const nowISO = new Date().toISOString();

    const { data: notifications, error } = await this.supabaseAdmin!
      .from('booking_notifications')
      .select('*')
      .eq('status', 'queued')
      .lte('scheduled_for', nowISO)
      .order('scheduled_for', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch queued booking notifications', error);
      return { sent: 0, failed: 0 };
    }

    if (!notifications || notifications.length === 0) {
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const notification of notifications) {
      const templatePayload = (notification.payload as NotificationPayload | null) ?? null;
      const templateId = templatePayload?.templateId || TEMPLATE_ID_MAP[notification.notification_type as BookingNotificationType];

      if (!templateId) {
        await this.markFailed(notification.id, 'Missing SendGrid template configuration');
        failed += 1;
        continue;
      }

      if (!notification.recipient_email) {
        await this.markFailed(notification.id, 'Recipient email missing');
        failed += 1;
        continue;
      }

      let dynamicTemplateData = templatePayload?.dynamicTemplateData ?? null;

      if (!dynamicTemplateData) {
        const context = await this.getBookingContext(notification.booking_id);
        if (!context) {
          await this.markFailed(notification.id, 'Unable to rebuild notification context');
          failed += 1;
          continue;
        }
        dynamicTemplateData = this.buildTemplateData(notification.notification_type as BookingNotificationType, context, {});
      }

      try {
        const success = await SendGridService.sendTemplatedEmail({
          to: notification.recipient_email,
          templateId,
          dynamicTemplateData,
        });

        if (!success) {
          await this.markFailed(notification.id, 'SendGrid send failed');
          failed += 1;
          continue;
        }

        await this.supabaseAdmin!
          .from('booking_notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            last_error: null,
            payload: {
              templateId,
              dynamicTemplateData,
            },
          })
          .eq('id', notification.id);

        sent += 1;
      } catch (err) {
        console.error('Error sending booking notification', notification.id, err);
        await this.markFailed(notification.id, err instanceof Error ? err.message : 'Unknown error');
        failed += 1;
      }
    }

    return { sent, failed };
  }

  private async queueNotification(
    type: BookingNotificationType,
    context: BookingContext,
    recipient: 'booker' | 'provider' | 'admin',
    options?: { scheduledFor?: Date; allowDuplicate?: boolean; payloadOverrides?: Record<string, any> },
  ): Promise<void> {
    if (!this.isReady()) return;

    const templateId = TEMPLATE_ID_MAP[type];
    if (!templateId) {
      console.warn(`[booking notifications] Template not configured for type ${type}`);
      return;
    }

    const targetProfile =
      recipient === 'booker' ? context.booker : recipient === 'provider' ? context.provider : null;
    let recipientEmail = targetProfile?.email ?? null;
    let recipientId = targetProfile?.id ?? null;

    if (recipient === 'admin') {
      recipientEmail = bookingAdminEmail;
      recipientId = null;
    }

    if (!recipientEmail) {
      console.warn(`[booking notifications] Recipient email missing for ${type}, skipping`);
      return;
    }

    if (!options?.allowDuplicate) {
      const { data: existing } = await this.supabaseAdmin!
        .from('booking_notifications')
        .select('id')
        .eq('booking_id', context.booking.id)
        .eq('notification_type', type)
        .eq('recipient_email', recipientEmail)
        .limit(1)
        .maybeSingle();

      if (existing) {
        return;
      }
    }

    const dynamicTemplateData = this.buildTemplateData(type, context, {
      ...(options?.payloadOverrides ?? {}),
    });

    await this.supabaseAdmin!
      .from('booking_notifications')
      .insert({
        booking_id: context.booking.id,
        recipient_id: recipientId,
        recipient_email: recipientEmail,
        notification_type: type,
        scheduled_for: options?.scheduledFor?.toISOString() ?? new Date().toISOString(),
        payload: {
          templateId,
          dynamicTemplateData,
        } satisfies NotificationPayload,
      });
  }

  private buildTemplateData(
    type: BookingNotificationType,
    context: BookingContext,
    overrides: Record<string, any>,
  ) {
    const serviceTitle =
      context.offering?.title ??
      context.offering?.category?.replace('_', ' ') ??
      'Custom project';

    const scheduledStart = new Date(context.booking.scheduled_start);
    const scheduledEnd = new Date(context.booking.scheduled_end);

    const formattedStart = scheduledStart.toLocaleString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    const formattedEnd = scheduledEnd.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const baseData = {
      booking_id: context.booking.id,
      provider_name: context.provider?.display_name || context.provider?.username || 'Provider',
      provider_email: context.provider?.email || '',
      booker_name: context.booker?.display_name || context.booker?.username || 'Client',
      booker_email: context.booker?.email || '',
      service_title: serviceTitle,
      scheduled_start_iso: context.booking.scheduled_start,
      scheduled_end_iso: context.booking.scheduled_end,
      scheduled_range_human: `${formattedStart} – ${formattedEnd} (${context.booking.timezone})`,
      timezone: context.booking.timezone,
      total_amount: context.booking.total_amount?.toFixed(2),
      platform_fee: context.booking.platform_fee?.toFixed(2),
      provider_payout: context.booking.provider_payout?.toFixed(2),
      currency: context.booking.currency,
      booking_notes: context.booking.booking_notes ?? '',
      provider_dashboard_url: `${BASE_APP_URL}/dashboard?tab=service-provider`,
      booker_dashboard_url: `${BASE_APP_URL}/bookings`,
      notification_type: type,
    };

    return {
      ...baseData,
      ...overrides,
    };
  }

  private async cancelOutstandingReminders(bookingId: string, reason: string) {
    if (!this.isReady()) return;
    await this.supabaseAdmin!
      .from('booking_notifications')
      .update({
        status: 'failed',
        last_error: reason,
      })
      .eq('booking_id', bookingId)
      .eq('status', 'queued')
      .in('notification_type', REMINDER_NOTIFICATION_TYPES);
  }

  private async getBookingContext(bookingId: string): Promise<BookingContext | null> {
    if (!this.isReady()) return null;

    const { data: booking, error } = await this.supabaseAdmin!
      .from('service_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      console.error('Failed to load booking context', error);
      return null;
    }

    const [bookerProfile, providerProfile, offering] = await Promise.all([
      this.fetchProfile(booking.booker_id),
      this.fetchProfile(booking.provider_id),
      booking.service_offering_id ? this.fetchOffering(booking.service_offering_id) : Promise.resolve(null),
    ]);

    return {
      booking,
      offering,
      provider: providerProfile,
      booker: bookerProfile,
    };
  }

  private async fetchProfile(profileId: string | null): Promise<BookingProfile | null> {
    if (!profileId) return null;
    const { data, error } = await this.supabaseAdmin!
      .from('profiles')
      .select('id, email, display_name, username')
      .eq('id', profileId)
      .maybeSingle();
    if (error) {
      console.error('Failed to fetch profile', profileId, error);
      return null;
    }
    return (data as BookingProfile | null) ?? null;
  }

  private async fetchOffering(offeringId: string): Promise<ServiceOfferingRow | null> {
    const { data, error } = await this.supabaseAdmin!
      .from('service_offerings')
      .select('*')
      .eq('id', offeringId)
      .maybeSingle();
    if (error) {
      console.error('Failed to fetch service offering', offeringId, error);
      return null;
    }
    return data ?? null;
  }

  private async markFailed(notificationId: string, errorMessage: string) {
    if (!this.isReady()) return;
    await this.supabaseAdmin!
      .from('booking_notifications')
      .update({
        status: 'failed',
        last_error: errorMessage,
      })
      .eq('id', notificationId);
  }
}

export const bookingNotificationService = new BookingNotificationService();

