'use client';

import React, { useState } from 'react';
import { X, CreditCard, Loader2, CheckCircle, AlertCircle, Ticket } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface EventTicketPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    title: string;
    event_date: string;
    price_gbp?: number | null;
    price_ngn?: number | null;
    formattedPrice?: string;
  };
  onSuccess: (ticketData: any) => void;
}

interface PaymentFormProps {
  clientSecret: string;
  event: EventTicketPurchaseModalProps['event'];
  onSuccess: (ticketData: any) => void;
  onCancel: () => void;
}

function PaymentForm({ clientSecret, event, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Confirm payment
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        setProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm ticket purchase with backend
        const response = await fetch('/api/events/confirm-ticket-purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            eventId: event.id,
            quantity: 1,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          onSuccess(data);
        } else {
          setError(data.error || 'Failed to confirm ticket purchase');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '1.5rem' }}>
        <PaymentElement />
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={20} style={{ color: '#EF4444' }} />
          <span style={{ color: '#EF4444' }}>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={processing}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={!stripe || processing}
          style={{
            backgroundColor: '#EC4899',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {processing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard size={16} />
              Pay {event.formattedPrice}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export function EventTicketPurchaseModal({ isOpen, onClose, event, onSuccess }: EventTicketPurchaseModalProps) {
  const [step, setStep] = useState<'loading' | 'payment' | 'success'>('loading');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ticketData, setTicketData] = useState<any>(null);

  React.useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setStep('loading');
      setError(null);
      setClientSecret(null);
      setTicketData(null);

      // Create payment intent
      createPaymentIntent();
    }
  }, [isOpen, event.id]);

  const createPaymentIntent = async () => {
    try {
      const response = await fetch('/api/events/create-ticket-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (response.ok && data.clientSecret) {
        setClientSecret(data.clientSecret);
        setStep('payment');
      } else {
        setError(data.error || 'Failed to initialize payment');
        setStep('payment'); // Show error in payment step
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment');
      setStep('payment');
    }
  };

  const handleSuccess = (data: any) => {
    setTicketData(data);
    setStep('success');
  };

  const handleClose = () => {
    if (step === 'success' && ticketData) {
      onSuccess(ticketData);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: '16px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#fff' }}>
            {step === 'success' ? 'Ticket Purchased!' : 'Buy Ticket'}
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {/* Event Info */}
          <div
            style={{
              backgroundColor: 'rgba(236, 72, 153, 0.1)',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#EC4899' }}>{event.title}</h3>
            <p style={{ margin: '0.25rem 0', color: '#ccc', fontSize: '0.9rem' }}>
              {new Date(event.event_date).toLocaleDateString('en-GB', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.25rem', fontWeight: 'bold', color: '#EC4899' }}>
              {event.formattedPrice}
            </p>
          </div>

          {/* Step Content */}
          {step === 'loading' && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <Loader2 size={48} className="animate-spin" style={{ color: '#EC4899', margin: '0 auto' }} />
              <p style={{ marginTop: '1rem', color: '#999' }}>Initializing payment...</p>
            </div>
          )}

          {step === 'payment' && (
            <>
              {error ? (
                <div
                  style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <AlertCircle size={20} style={{ color: '#EF4444' }} />
                  <span style={{ color: '#EF4444' }}>{error}</span>
                </div>
              ) : clientSecret ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'night',
                      variables: {
                        colorPrimary: '#EC4899',
                        colorBackground: '#1a1a2e',
                        colorText: '#ffffff',
                        colorDanger: '#EF4444',
                        borderRadius: '8px',
                      },
                    },
                  }}
                >
                  <PaymentForm
                    clientSecret={clientSecret}
                    event={event}
                    onSuccess={handleSuccess}
                    onCancel={handleClose}
                  />
                </Elements>
              ) : null}
            </>
          )}

          {step === 'success' && ticketData && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <CheckCircle size={48} style={{ color: '#22C55E' }} />
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#22C55E' }}>Payment Successful!</h3>
              <p style={{ color: '#ccc', marginBottom: '1.5rem' }}>
                Your ticket has been confirmed
              </p>

              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  <Ticket size={20} style={{ color: '#EC4899' }} />
                  <span style={{ color: '#999', fontSize: '0.9rem' }}>Ticket Code</span>
                </div>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#EC4899', margin: 0, letterSpacing: '2px' }}>
                  {ticketData.ticket_code || ticketData.all_ticket_codes?.[0]}
                </p>
              </div>

              <p style={{ fontSize: '0.9rem', color: '#999', marginBottom: '1.5rem' }}>
                A confirmation email has been sent to your email address with your ticket details.
              </p>

              <button
                onClick={handleClose}
                className="btn-primary"
                style={{
                  backgroundColor: '#EC4899',
                  width: '100%',
                }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
