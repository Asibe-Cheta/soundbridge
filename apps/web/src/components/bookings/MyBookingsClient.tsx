'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { CalendarClock, CalendarCheck, CalendarX, CheckCircle, CreditCard, Loader2, ShieldAlert, X, RefreshCcw } from 'lucide-react';

import { BOOKING_STATUS_META, type BookingStatus } from '@/src/constants/bookings';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

interface ProfileSummary {
  user_id: string;
  display_name: string;
  headline: string | null;
  is_verified: boolean;
}

interface OfferingSummary {
  id: string;
  title: string;
  category: string;
  rate_amount: number | null;
  rate_currency: string | null;
  rate_unit: string;
}

interface VenueSummary {
  id: string;
  name: string;
  address: Record<string, unknown> | null;
}

interface BookingRecord {
  id: string;
  provider_id: string;
  booker_id: string;
  service_offering_id: string | null;
  venue_id: string | null;
  status: BookingStatus;
  scheduled_start: string;
  scheduled_end: string;
  timezone: string;
  total_amount: number;
  currency: string;
  platform_fee: number;
  provider_payout: number;
  booking_notes: string | null;
  cancellation_reason: string | null;
  stripe_payment_intent_id: string | null;
  confirmed_at: string | null;
  paid_at: string | null;
  completed_at: string | null;
  created_at: string;
  provider?: ProfileSummary | null;
  offering?: OfferingSummary | null;
  venue?: VenueSummary | null;
}

interface PaymentContext {
  booking: BookingRecord;
  clientSecret: string;
  paymentIntentId: string;
  status: string;
}

const statusIconMap: Record<(typeof BOOKING_STATUS_META)[BookingStatus]['icon'], React.ReactNode> = {
  'calendar-clock': <CalendarClock size={14} />,
  'calendar-check': <CalendarCheck size={14} />,
  'credit-card': <CreditCard size={14} />,
  'check-circle': <CheckCircle size={14} />,
  'calendar-x': <CalendarX size={14} />,
  'shield-alert': <ShieldAlert size={14} />,
};

const formatDateTime = (start: string, end: string, timezone: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startFormatted = startDate.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const endFormatted = endDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${startFormatted} – ${endFormatted} (${timezone})`;
};

const toneStyles: Record<'default' | 'warning' | 'success' | 'critical' | 'info', { bg: string; border: string; color: string }> =
  {
    default: {
      bg: 'rgba(148,163,184,0.15)',
      border: 'rgba(148,163,184,0.25)',
      color: '#cbd5f5',
    },
    warning: {
      bg: 'rgba(250,204,21,0.12)',
      border: 'rgba(250,204,21,0.28)',
      color: '#fde68a',
    },
    success: {
      bg: 'rgba(34,197,94,0.12)',
      border: 'rgba(34,197,94,0.28)',
      color: '#bbf7d0',
    },
    critical: {
      bg: 'rgba(239,68,68,0.12)',
      border: 'rgba(239,68,68,0.28)',
      color: '#fecaca',
    },
    info: {
      bg: 'rgba(59,130,246,0.12)',
      border: 'rgba(59,130,246,0.28)',
      color: '#bfdbfe',
    },
  };

const PaymentForm: React.FC<{
  context: PaymentContext;
  onClose: () => void;
  onPaymentConfirmed: (booking: BookingRecord) => void;
}> = ({ context, onClose, onPaymentConfirmed }) => {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/bookings`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setMessage(error.message ?? 'Payment could not be processed. Try again.');
      setIsSubmitting(false);
      return;
    }

    if (!paymentIntent) {
      setMessage('Payment confirmation pending. Please wait a moment.');
      setIsSubmitting(false);
      return;
    }

    if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_confirmation') {
      setMessage('Please complete the additional verification presented by your bank.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/bookings/${context.booking.id}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      });
      const json = await response.json();

      if (!response.ok) {
        setMessage(json.error || 'Unable to finalise your booking payment.');
        setIsSubmitting(false);
        return;
      }

      onPaymentConfirmed(json.booking);
      setMessage('Payment successful! Your booking is secured.');
      setTimeout(onClose, 1200);
    } catch (confirmError) {
      console.error(confirmError);
      setMessage('Payment succeeded but we could not update the booking. Contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
      <div
        style={{
          padding: '1rem',
          borderRadius: '1rem',
          border: '1px solid rgba(148,163,184,0.35)',
          background: 'rgba(15,23,42,0.6)',
          display: 'grid',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', fontWeight: 600, fontSize: '1rem' }}>
          <span>Amount due</span>
          <span>
            {context.booking.currency} {context.booking.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          Funds stay in escrow until your session completes. Platform fee:{' '}
          {context.booking.currency} {context.booking.platform_fee.toFixed(2)}
        </div>
      </div>

      <PaymentElement />

      {message && (
        <div
          style={{
            borderRadius: '0.9rem',
            border: message.includes('success') ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(248,113,113,0.35)',
            background: message.includes('success') ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.12)',
            color: message.includes('success') ? '#bbf7d0' : '#fecaca',
            padding: '0.85rem',
            fontSize: '0.85rem',
          }}
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !stripe || !elements}
        style={{
          padding: '0.85rem 1.2rem',
          borderRadius: '0.9rem',
          border: 'none',
          background: 'linear-gradient(135deg, #dc2626, #ec4899)',
          color: 'white',
          fontWeight: 600,
          cursor: isSubmitting ? 'wait' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Pay now <CreditCard size={16} />
          </>
        )}
      </button>
    </form>
  );
};

export const MyBookingsClient: React.FC = () => {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentContext, setPaymentContext] = useState<PaymentContext | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/bookings', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error || 'Failed to load bookings.');
        setBookings([]);
        return;
      }
      setBookings(json.bookings ?? []);
    } catch (listError) {
      console.error(listError);
      setError(listError instanceof Error ? listError.message : 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleInitiatePayment = async (booking: BookingRecord) => {
    if (!stripePromise) {
      setError('Stripe is not configured for payments. Please contact support.');
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/bookings/${booking.id}/payment-intent`, { method: 'POST' });
      const json = await response.json();

      if (!response.ok) {
        setError(json.error || 'Could not initiate payment.');
        return;
      }

      if (!json.clientSecret) {
        setError('Payment session was created but no client secret was returned.');
        return;
      }

      setPaymentContext({
        booking,
        clientSecret: json.clientSecret,
        paymentIntentId: json.paymentIntentId,
        status: json.status,
      });
      setIsPaymentOpen(true);
    } catch (intentError) {
      console.error(intentError);
      setError(intentError instanceof Error ? intentError.message : 'Unable to start payment.');
    }
  };

  const handlePaymentConfirmed = (updatedBooking: BookingRecord) => {
    setBookings((prev) => prev.map((booking) => (booking.id === updatedBooking.id ? updatedBooking : booking)));
  };

  const groupedBookings = useMemo(() => {
    return {
      attention: bookings.filter((booking) => booking.status === 'confirmed_awaiting_payment'),
      upcoming: bookings.filter((booking) => booking.status === 'pending' || booking.status === 'paid'),
      completed: bookings.filter((booking) => booking.status === 'completed'),
      cancelled: bookings.filter((booking) => booking.status === 'cancelled' || booking.status === 'disputed'),
    };
  }, [bookings]);

  return (
    <section
      style={{
        display: 'grid',
        gap: '1.75rem',
        padding: '2rem 0',
      }}
    >
      <header style={{ display: 'grid', gap: '0.75rem' }}>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>My bookings</div>
        <p style={{ color: '#cbd5f5', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '720px', margin: 0 }}>
          Track every service request from pending to payout. Pay confirmed bookings within 48 hours to keep your slot,
          and follow the status timeline to stay informed.
        </p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 0.85rem',
            borderRadius: '0.85rem',
            border: '1px solid rgba(148,163,184,0.35)',
            color: '#cbd5f5',
            fontSize: '0.85rem',
          }}
        >
          <ShieldAlert size={16} style={{ color: '#fca5a5' }} />
          Money stays protected in Stripe escrow until the provider delivers.
        </div>
      </header>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={loadBookings}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.6rem 0.9rem',
            borderRadius: '0.75rem',
            border: '1px solid rgba(148,163,184,0.35)',
            background: 'rgba(15,23,42,0.5)',
            color: '#cbd5f5',
            cursor: 'pointer',
          }}
        >
          <RefreshCcw size={14} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div
          style={{
            padding: '3rem',
            borderRadius: '1rem',
            border: '1px solid var(--border-primary)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#cbd5f5',
          }}
        >
          <Loader2 size={20} className="animate-spin" />
          Loading your bookings…
        </div>
      ) : error ? (
        <div
          style={{
            padding: '1.5rem',
            borderRadius: '1rem',
            border: '1px solid rgba(248,113,113,0.35)',
            background: 'rgba(248,113,113,0.12)',
            color: '#fecaca',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </div>
      ) : bookings.length === 0 ? (
        <div
          style={{
            padding: '3rem',
            borderRadius: '1rem',
            border: '1px solid var(--border-primary)',
            background: 'var(--bg-secondary)',
            textAlign: 'center',
            color: '#cbd5f5',
          }}
        >
          You haven’t booked any services yet. Explore providers to get started.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.75rem' }}>
          {[
            { title: 'Awaiting payment', key: 'attention' as const, highlight: true },
            { title: 'Upcoming & in progress', key: 'upcoming' as const },
            { title: 'Completed', key: 'completed' as const },
            { title: 'Cancelled & disputes', key: 'cancelled' as const },
          ].map(({ title, key, highlight }) => {
            const list = groupedBookings[key];
            if (!list || list.length === 0) return null;
            return (
              <section
                key={key}
                style={{
                  display: 'grid',
                  gap: '1rem',
                  borderRadius: '1.25rem',
                  border: '1px solid var(--border-primary)',
                  background: highlight ? 'rgba(30,41,59,0.75)' : 'var(--bg-secondary)',
                  padding: '1.75rem',
                }}
              >
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, color: 'white', fontSize: '1.3rem', fontWeight: 600 }}>{title}</h2>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    {list.length} booking{list.length === 1 ? '' : 's'}
                  </span>
                </header>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {list.map((booking) => {
                    const meta = BOOKING_STATUS_META[booking.status];
                    const toneStyle = toneStyles[meta.tone];
                    const icon = statusIconMap[meta.icon];
                    return (
                      <div
                        key={booking.id}
                        style={{
                          borderRadius: '1rem',
                          border: '1px solid rgba(148,163,184,0.2)',
                          background: 'rgba(15,23,42,0.55)',
                          padding: '1.25rem',
                          display: 'grid',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                          <div style={{ display: 'grid', gap: '0.35rem' }}>
                            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'white' }}>
                              {booking.provider?.display_name ?? 'Service provider'}
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                              {booking.offering?.title ?? 'Custom scope'}
                            </div>
                          </div>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.45rem 0.7rem',
                              borderRadius: '0.75rem',
                              background: toneStyle.bg,
                              border: `1px solid ${toneStyle.border}`,
                              color: toneStyle.color,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em',
                            }}
                          >
                            {icon}
                            {meta.label}
                          </div>
                        </div>

                        <div style={{ fontSize: '0.85rem', color: '#cbd5f5' }}>
                          {formatDateTime(booking.scheduled_start, booking.scheduled_end, booking.timezone)}
                        </div>

                        {booking.booking_notes && (
                          <div
                            style={{
                              padding: '0.75rem',
                              borderRadius: '0.75rem',
                              border: '1px solid rgba(148,163,184,0.2)',
                              background: 'rgba(30,41,59,0.5)',
                              color: '#94a3b8',
                              fontSize: '0.85rem',
                            }}
                          >
                            {booking.booking_notes}
                          </div>
                        )}

                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.9rem',
                            fontSize: '0.8rem',
                            color: '#94a3b8',
                          }}
                        >
                          <span>
                            Total:{' '}
                            <strong style={{ color: '#f8fafc' }}>
                              {booking.currency} {booking.total_amount.toFixed(2)}
                            </strong>
                          </span>
                          <span>
                            Platform fee:{' '}
                            <strong style={{ color: '#f8fafc' }}>
                              {booking.currency} {booking.platform_fee.toFixed(2)}
                            </strong>
                          </span>
                          <span>
                            Provider payout:{' '}
                            <strong style={{ color: '#f8fafc' }}>
                              {booking.currency} {booking.provider_payout.toFixed(2)}
                            </strong>
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                          {booking.status === 'confirmed_awaiting_payment' && (
                            <button
                              type="button"
                              onClick={() => handleInitiatePayment(booking)}
                              style={{
                                padding: '0.75rem 1.3rem',
                                borderRadius: '0.9rem',
                                border: 'none',
                                background: 'linear-gradient(135deg, #dc2626, #ec4899)',
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                              }}
                            >
                              <CreditCard size={16} />
                              Pay now
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {isPaymentOpen && paymentContext && stripePromise && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            overflowY: 'auto',
            zIndex: 1000,
            padding: '2.5rem 1.5rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              background: 'rgba(15,23,42,0.95)',
              borderRadius: '1.5rem',
              border: '1px solid rgba(148,163,184,0.35)',
              padding: '2rem',
              position: 'relative',
              display: 'grid',
              gap: '1.5rem',
            }}
          >
            <button
              type="button"
              onClick={() => setIsPaymentOpen(false)}
              aria-label="Close payment dialog"
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'rgba(148,163,184,0.14)',
                border: 'none',
                borderRadius: '999px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#cbd5f5',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'grid', gap: '0.4rem' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Secure payment
              </div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600, color: 'white' }}>
                Pay {paymentContext.booking.provider?.display_name ?? 'provider'}
              </h2>
              <p style={{ color: '#cbd5f5', fontSize: '0.9rem', margin: 0 }}>
                Complete payment now to secure the confirmed slot. Funds stay protected until the booking completes.
              </p>
            </div>

            <Elements
              options={{
                clientSecret: paymentContext.clientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#ec4899',
                    colorText: '#f8fafc',
                    borderRadius: '12px',
                  },
                },
              }}
              stripe={stripePromise}
            >
              <PaymentForm
                context={paymentContext}
                onClose={() => setIsPaymentOpen(false)}
                onPaymentConfirmed={handlePaymentConfirmed}
              />
            </Elements>
          </div>
        </div>
      )}
    </section>
  );
};

export default MyBookingsClient;


