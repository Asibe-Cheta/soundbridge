'use client';

import React, { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

interface PayPalCheckoutButtonProps {
  /** Endpoint that already creates Stripe PaymentIntents today — reused here with provider: 'paypal' */
  createOrderEndpoint: string;
  /** Extra flow-specific fields to send alongside { provider: 'paypal' }, e.g. { creatorId, amount, message } */
  createOrderPayload: Record<string, unknown>;
  currency: string;
  onCaptured: (result: { captureId: string }) => void;
  onError: (message: string) => void;
}

/**
 * Shared across all 4 PayPal-enabled checkout flows. Order creation and capture both happen
 * server-side (never client-side actions.order.capture()) so we never trust a client-reported
 * "it worked" — mirrors the existing Stripe confirmPayment({redirect:'if_required'}) pattern of
 * treating the server response as the source of truth.
 */
export function PayPalCheckoutButton({
  createOrderEndpoint,
  createOrderPayload,
  currency,
  onCaptured,
  onError,
}: PayPalCheckoutButtonProps) {
  const [processing, setProcessing] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  if (!clientId) {
    return <p className="text-sm text-red-400">PayPal is not configured.</p>;
  }

  return (
    <PayPalScriptProvider options={{ clientId, currency: currency.toUpperCase(), intent: 'capture' }}>
      <PayPalButtons
        style={{ layout: 'vertical' }}
        disabled={processing}
        createOrder={async () => {
          const res = await fetch(createOrderEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ ...createOrderPayload, provider: 'paypal' }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data?.paypalOrderId) {
            throw new Error(data?.error || 'Could not start PayPal checkout');
          }
          return data.paypalOrderId as string;
        }}
        onApprove={async (data) => {
          setProcessing(true);
          try {
            const res = await fetch('/api/paypal/capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ orderId: data.orderID }),
            });
            const result = await res.json().catch(() => ({}));
            if (!res.ok || !result?.success) {
              onError(result?.error || 'PayPal payment could not be completed.');
              return;
            }
            onCaptured({ captureId: result.captureId });
          } catch (err) {
            onError(err instanceof Error ? err.message : 'Something went wrong');
          } finally {
            setProcessing(false);
          }
        }}
        onError={(err) => {
          onError(err instanceof Error ? err.message : 'PayPal checkout failed');
        }}
      />
    </PayPalScriptProvider>
  );
}
