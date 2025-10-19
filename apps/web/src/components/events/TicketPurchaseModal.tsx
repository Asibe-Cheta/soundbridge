'use client';

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { X, Ticket, Users, Tag, Sparkles } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface TicketType {
  id: string;
  ticket_name: string;
  ticket_type: string;
  description: string;
  price_gbp: number;
  quantity_available: number;
  includes_features?: string[];
}

interface Bundle {
  id: string;
  bundle_name: string;
  description: string;
  individual_price: number;
  bundle_price: number;
  discount_percent: number;
  bundled_track_ids: string[];
}

interface TicketPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  tickets: TicketType[];
  bundles?: Bundle[];
  friendsAttending?: number;
}

export function TicketPurchaseModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  tickets,
  bundles = [],
  friendsAttending = 0,
}: TicketPurchaseModalProps) {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePurchaseTicket = async () => {
    if (!selectedTicket || !buyerName || !buyerEmail) {
      setError('Please fill in all required fields');
      return;
    }

    setIsPurchasing(true);
    setError(null);

    try {
      const response = await fetch('/api/tickets/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicket,
          quantity,
          buyerName,
          buyerEmail,
          buyerPhone,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Purchase failed');
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe not loaded');
      }

      const { error: stripeError } = await stripe.confirmCardPayment(
        data.clientSecret
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Success! Close modal and show confirmation
      alert('Ticket purchased successfully! Check your email for confirmation.');
      onClose();

    } catch (err) {
      console.error('Purchase error:', err);
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handlePurchaseBundle = async () => {
    if (!selectedBundle || !buyerName || !buyerEmail) {
      setError('Please fill in all required fields');
      return;
    }

    setIsPurchasing(true);
    setError(null);

    try {
      const response = await fetch('/api/bundles/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleId: selectedBundle,
          buyerName,
          buyerEmail,
          buyerPhone,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Purchase failed');
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe not loaded');
      }

      const { error: stripeError } = await stripe.confirmCardPayment(
        data.clientSecret
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      alert(`Bundle purchased successfully! You saved £${data.savings.toFixed(2)}!`);
      onClose();

    } catch (err) {
      console.error('Bundle purchase error:', err);
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  const selectedTicketData = tickets.find(t => t.id === selectedTicket);
  const selectedBundleData = bundles.find(b => b.id === selectedBundle);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Get Tickets
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {eventTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Friends Attending */}
          {friendsAttending > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Users className="w-5 h-5" />
                <span className="font-medium">
                  {friendsAttending} {friendsAttending === 1 ? 'friend is' : 'friends are'} attending
                </span>
              </div>
            </div>
          )}

          {/* Bundles Section */}
          {bundles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-semibold text-lg">Special Bundles</h3>
              </div>
              
              {bundles.map((bundle) => (
                <button
                  key={bundle.id}
                  onClick={() => {
                    setSelectedBundle(bundle.id);
                    setSelectedTicket(null);
                  }}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedBundle === bundle.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-purple-500" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {bundle.bundle_name}
                        </h4>
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded">
                          Save {bundle.discount_percent.toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {bundle.description}
                      </p>
                      {bundle.bundled_track_ids.length > 0 && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                          Includes {bundle.bundled_track_ids.length} exclusive tracks!
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 line-through">
                        £{bundle.individual_price.toFixed(2)}
                      </div>
                      <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                        £{bundle.bundle_price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Ticket Types */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                Select Ticket Type
              </h3>
            </div>

            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => {
                  setSelectedTicket(ticket.id);
                  setSelectedBundle(null);
                }}
                disabled={ticket.quantity_available <= 0}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedTicket === ticket.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                } ${ticket.quantity_available <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {ticket.ticket_name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {ticket.description}
                    </p>
                    {ticket.includes_features && ticket.includes_features.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {ticket.includes_features.map((feature, i) => (
                          <li key={i} className="text-xs text-green-600 dark:text-green-400">
                            ✓ {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {ticket.quantity_available} tickets available
                    </p>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    £{ticket.price_gbp.toFixed(2)}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Quantity Selector (only for tickets, not bundles) */}
          {selectedTicket && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity
              </label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {[...Array(Math.min(10, selectedTicketData?.quantity_available || 1))].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} {i === 0 ? 'Ticket' : 'Tickets'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Buyer Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Your Information
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone (Optional)
              </label>
              <input
                type="tel"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="+44 7xxx xxx xxx"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Purchase Summary */}
          {(selectedTicket || selectedBundle) && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {selectedBundle ? 'Bundle' : `${quantity} Ticket(s)`}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  £
                  {selectedBundle
                    ? selectedBundleData?.bundle_price.toFixed(2)
                    : ((selectedTicketData?.price_gbp || 0) * quantity).toFixed(2)}
                </span>
              </div>
              {selectedBundle && selectedBundleData && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>You Save</span>
                  <span className="font-medium">
                    £{(selectedBundleData.individual_price - selectedBundleData.bundle_price).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                <span className="font-bold text-xl text-blue-600 dark:text-blue-400">
                  £
                  {selectedBundle
                    ? selectedBundleData?.bundle_price.toFixed(2)
                    : ((selectedTicketData?.price_gbp || 0) * quantity).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Purchase Button */}
          <button
            onClick={selectedBundle ? handlePurchaseBundle : handlePurchaseTicket}
            disabled={isPurchasing || (!selectedTicket && !selectedBundle)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
          >
            {isPurchasing ? 'Processing...' : 'Continue to Payment'}
          </button>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Secure payment powered by Stripe. You'll receive your tickets via email.
          </p>
        </div>
      </div>
    </div>
  );
}

