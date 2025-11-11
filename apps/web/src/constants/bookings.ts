export type BookingStatus =
  | 'pending'
  | 'confirmed_awaiting_payment'
  | 'paid'
  | 'completed'
  | 'cancelled'
  | 'disputed';

interface BookingStatusMeta {
  label: string;
  tone: 'default' | 'warning' | 'success' | 'critical' | 'info';
  description: string;
  icon: 'calendar-clock' | 'calendar-check' | 'credit-card' | 'check-circle' | 'calendar-x' | 'shield-alert';
}

export const BOOKING_STATUS_META: Record<BookingStatus, BookingStatusMeta> = {
  pending: {
    label: 'Pending',
    tone: 'warning',
    description: 'Awaiting provider confirmation',
    icon: 'calendar-clock',
  },
  confirmed_awaiting_payment: {
    label: 'Awaiting Payment',
    tone: 'info',
    description: 'Provider confirmed. Complete payment to secure the booking.',
    icon: 'calendar-check',
  },
  paid: {
    label: 'Paid (Escrow)',
    tone: 'success',
    description: 'Payment secured. Funds release after the session.',
    icon: 'credit-card',
  },
  completed: {
    label: 'Completed',
    tone: 'success',
    description: 'Service delivered. Payout scheduled.',
    icon: 'check-circle',
  },
  cancelled: {
    label: 'Cancelled',
    tone: 'critical',
    description: 'Booking cancelled. Review refund details if applicable.',
    icon: 'calendar-x',
  },
  disputed: {
    label: 'Disputed',
    tone: 'critical',
    description: 'Dispute in progress. Support team will follow up.',
    icon: 'shield-alert',
  },
};


