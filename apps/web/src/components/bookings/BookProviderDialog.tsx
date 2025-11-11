'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, CalendarClock, ShieldAlert, CheckCircle, ArrowRight, X } from 'lucide-react';

import { BOOKING_STATUS_META } from '@/src/constants/bookings';

interface AvailabilitySlot {
  id: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  is_bookable: boolean;
  recurrence_rule: string | null;
}

interface OfferingSummary {
  id: string;
  title: string;
  category: string;
  rate_amount: number | null;
  rate_currency: string | null;
  rate_unit: string;
  is_active: boolean;
}

interface BookProviderDialogProps {
  providerId: string;
  providerName: string;
  defaultCurrency?: string | null;
  offerings: OfferingSummary[];
  availability: AvailabilitySlot[];
}

type FormState = {
  offeringId: string | '';
  slotId: string | '';
  start: string;
  end: string;
  totalAmount: string;
  currency: string;
  notes: string;
};

const toInputValue = (date: string) => {
  const dt = new Date(date);
  if (Number.isNaN(dt.valueOf())) {
    return '';
  }
  const iso = dt.toISOString();
  return iso.slice(0, 16);
};

const toISO = (value: string) => {
  if (!value) return '';
  const dt = new Date(value);
  return Number.isNaN(dt.valueOf()) ? '' : dt.toISOString();
};

export const BookProviderDialog: React.FC<BookProviderDialogProps> = ({
  providerId,
  providerName,
  defaultCurrency = 'USD',
  offerings,
  availability,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);

  const bookableSlots = useMemo(
    () =>
      (availability ?? [])
        .filter((slot) => slot.is_bookable && new Date(slot.end_time).getTime() > Date.now())
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 6),
    [availability],
  );

  const [form, setForm] = useState<FormState>(() => {
    const firstOffering = offerings?.find((item) => item.is_active);
    const initialSlot = bookableSlots[0];
    return {
      offeringId: firstOffering?.id ?? '',
      slotId: initialSlot?.id ?? '',
      start: initialSlot ? toInputValue(initialSlot.start_time) : '',
      end: initialSlot ? toInputValue(initialSlot.end_time) : '',
      totalAmount: firstOffering?.rate_amount ? String(firstOffering.rate_amount) : '',
      currency: firstOffering?.rate_currency ?? defaultCurrency ?? 'USD',
      notes: '',
    };
  });

  const resetForm = () => {
    const firstOffering = offerings?.find((item) => item.is_active);
    const initialSlot = bookableSlots[0];
    setForm({
      offeringId: firstOffering?.id ?? '',
      slotId: initialSlot?.id ?? '',
      start: initialSlot ? toInputValue(initialSlot.start_time) : '',
      end: initialSlot ? toInputValue(initialSlot.end_time) : '',
      totalAmount: firstOffering?.rate_amount ? String(firstOffering.rate_amount) : '',
      currency: firstOffering?.rate_currency ?? defaultCurrency ?? 'USD',
      notes: '',
    });
    setError(null);
    setSuccessMessage(null);
    setCreatedBookingId(null);
  };

  const handleSlotChange = (slotId: string) => {
    setForm((prev) => {
      if (!slotId) {
        return { ...prev, slotId, start: '', end: '' };
      }
      const slot = bookableSlots.find((item) => item.id === slotId);
      if (!slot) {
        return { ...prev, slotId };
      }
      return {
        ...prev,
        slotId,
        start: toInputValue(slot.start_time),
        end: toInputValue(slot.end_time),
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const body = {
      providerId,
      serviceOfferingId: form.offeringId || null,
      scheduledStart: toISO(form.start),
      scheduledEnd: toISO(form.end),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
      totalAmount: Number(form.totalAmount),
      currency: form.currency || defaultCurrency || 'USD',
      bookingNotes: form.notes || null,
      bookingType: 'service' as const,
    };

    if (!body.scheduledStart || !body.scheduledEnd) {
      setError('Choose a start and end time for your booking.');
      setIsSubmitting(false);
      return;
    }

    if (!Number.isFinite(body.totalAmount) || body.totalAmount <= 0) {
      setError('Enter a valid project total.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await response.json();

      if (!response.ok) {
        setError(json.error || 'Failed to place booking request.');
        return;
      }

      setSuccessMessage(
        `Great! ${providerName} will review and confirm your booking. We’ll notify you within 48 hours.`,
      );
      setCreatedBookingId(json.booking?.id ?? null);
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : 'Could not request booking. Try again shortly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (!isOpen) {
            resetForm();
          }
          setIsOpen(true);
        }}
        style={{
          padding: '0.75rem 1.4rem',
          borderRadius: '0.9rem',
          background: 'linear-gradient(135deg, #dc2626, #ec4899)',
          color: 'white',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        Request booking
        <ArrowRight size={16} />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-dialog-title"
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
            padding: '2rem 1.5rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '640px',
              background: 'var(--bg-secondary)',
              borderRadius: '1.5rem',
              border: '1px solid var(--border-primary)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close booking dialog"
              style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
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

            <div style={{ display: 'grid', gap: '0.35rem' }}>
              <h2 id="booking-dialog-title" style={{ margin: 0, fontSize: '1.6rem', color: 'white', fontWeight: 700 }}>
                Book {providerName}
              </h2>
              <p style={{ color: '#cbd5f5', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
                Choose an offering and a time that suits you. You’ll only be charged once the provider confirms.
              </p>
            </div>

            {successMessage ? (
              <div
                style={{
                  display: 'grid',
                  gap: '1.2rem',
                  padding: '1.2rem',
                  borderRadius: '1rem',
                  border: '1px solid rgba(34,197,94,0.4)',
                  background: 'rgba(34,197,94,0.08)',
                  color: '#bbf7d0',
                }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <CheckCircle size={20} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.35rem' }}>Request sent</div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#d1fae5' }}>{successMessage}</p>
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.65rem',
                    fontSize: '0.85rem',
                    color: '#d1fae5',
                  }}
                >
                  <span>• You can monitor the status under your bookings dashboard.</span>
                  <span>• Once {providerName.split(' ')[0] || 'the provider'} confirms, pay within 48 hours to secure the slot.</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    style={{
                      padding: '0.65rem 1.2rem',
                      borderRadius: '0.9rem',
                      border: 'none',
                      background: 'linear-gradient(135deg, #dc2626, #ec4899)',
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                  <a
                    href="/bookings"
                    style={{
                      padding: '0.65rem 1.2rem',
                      borderRadius: '0.9rem',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fef2f2',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    View my bookings
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.4rem' }}>
                <div
                  style={{
                    display: 'grid',
                    gap: '1rem',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  }}
                >
                  <label style={{ display: 'grid', gap: '0.5rem' }}>
                    <span style={{ color: '#cbd5f5', fontSize: '0.85rem', fontWeight: 600 }}>Service</span>
                    <select
                      value={form.offeringId}
                      onChange={(event) => {
                        const value = event.target.value;
                        const offering = offerings.find((item) => item.id === value);
                        setForm((prev) => ({
                          ...prev,
                          offeringId: value,
                          totalAmount:
                            offering?.rate_amount !== null && offering?.rate_amount !== undefined
                              ? String(offering.rate_amount)
                              : prev.totalAmount,
                          currency: offering?.rate_currency ?? prev.currency,
                        }));
                      }}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '0.75rem',
                        border: '1px solid var(--border-primary)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="">Custom scope</option>
                      {offerings
                        ?.filter((item) => item.is_active)
                        .map((offering) => (
                          <option key={offering.id} value={offering.id}>
                            {offering.title} {offering.rate_amount ? `· ${offering.rate_amount} ${offering.rate_currency ?? ''}/${offering.rate_unit}` : ''}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label style={{ display: 'grid', gap: '0.5rem' }}>
                    <span style={{ color: '#cbd5f5', fontSize: '0.85rem', fontWeight: 600 }}>Scheduled start</span>
                    <input
                      type="datetime-local"
                      value={form.start}
                      onChange={(event) => setForm((prev) => ({ ...prev, start: event.target.value }))}
                      required
                      style={{
                        padding: '0.75rem',
                        borderRadius: '0.75rem',
                        border: '1px solid var(--border-primary)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '0.5rem' }}>
                    <span style={{ color: '#cbd5f5', fontSize: '0.85rem', fontWeight: 600 }}>Scheduled end</span>
                    <input
                      type="datetime-local"
                      value={form.end}
                      onChange={(event) => setForm((prev) => ({ ...prev, end: event.target.value }))}
                      required
                      style={{
                        padding: '0.75rem',
                        borderRadius: '0.75rem',
                        border: '1px solid var(--border-primary)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '0.5rem' }}>
                    <span style={{ color: '#cbd5f5', fontSize: '0.85rem', fontWeight: 600 }}>Project total</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="number"
                        min={1}
                        step={0.01}
                        value={form.totalAmount}
                        onChange={(event) => setForm((prev) => ({ ...prev, totalAmount: event.target.value }))}
                        required
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          borderRadius: '0.75rem',
                          border: '1px solid var(--border-primary)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <select
                        value={form.currency}
                        onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
                        style={{
                          width: '100px',
                          padding: '0.75rem',
                          borderRadius: '0.75rem',
                          border: '1px solid var(--border-primary)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="NGN">NGN</option>
                      </select>
                    </div>
                  </label>
                </div>

                {bookableSlots.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gap: '0.75rem',
                      padding: '1rem',
                      borderRadius: '1rem',
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(15,23,42,0.4)',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5f5' }}>
                      Available slots
                    </span>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      {bookableSlots.map((slot) => {
                        const selected = form.slotId === slot.id;
                        const start = new Date(slot.start_time);
                        const end = new Date(slot.end_time);
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => handleSlotChange(slot.id)}
                            style={{
                              borderRadius: '0.85rem',
                              border: '1px solid',
                              borderColor: selected ? 'rgba(220,38,38,0.6)' : 'rgba(148,163,184,0.35)',
                              background: selected ? 'rgba(220,38,38,0.12)' : 'transparent',
                              color: selected ? '#fecaca' : '#cbd5f5',
                              padding: '0.6rem 0.9rem',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                            }}
                          >
                            <CalendarClock size={14} />
                            {start.toLocaleString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}{' '}
                            –{' '}
                            {end.toLocaleTimeString(undefined, {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <label style={{ display: 'grid', gap: '0.5rem' }}>
                  <span style={{ color: '#cbd5f5', fontSize: '0.85rem', fontWeight: 600 }}>Project notes</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                    rows={4}
                    placeholder="Share context, deliverables, location info or anything the provider needs to prepare."
                    style={{
                      resize: 'vertical',
                      padding: '0.75rem',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--border-primary)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </label>

                <div
                  style={{
                    display: 'grid',
                    gap: '0.75rem',
                    padding: '1rem',
                    borderRadius: '1rem',
                    border: '1px solid rgba(148,163,184,0.25)',
                    background: 'rgba(30,41,59,0.6)',
                    color: '#cbd5f5',
                    fontSize: '0.85rem',
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', color: '#fca5a5' }}>
                    <ShieldAlert size={16} />
                    <span style={{ fontWeight: 600 }}>Booking policy</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: '0.35rem' }}>
                    <li>{BOOKING_STATUS_META.confirmed_awaiting_payment.description}</li>
                    <li>Funds stay in escrow for trust & safety once you pay.</li>
                    <li>Full refund if the provider cancels or no-shows.</li>
                  </ul>
                </div>

                {error && (
                  <div
                    style={{
                      borderRadius: '0.9rem',
                      border: '1px solid rgba(248,113,113,0.35)',
                      background: 'rgba(248,113,113,0.12)',
                      color: '#fecaca',
                      padding: '0.75rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: '0.75rem 1.4rem',
                      borderRadius: '0.9rem',
                      border: 'none',
                      background: 'linear-gradient(135deg, #dc2626, #ec4899)',
                      color: 'white',
                      fontWeight: 600,
                      cursor: isSubmitting ? 'wait' : 'pointer',
                      opacity: isSubmitting ? 0.75 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Sending request…
                      </>
                    ) : (
                      <>
                        Request booking
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '0.9rem',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'transparent',
                      color: '#cbd5f5',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookProviderDialog;


