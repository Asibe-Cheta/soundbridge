'use client';

import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, CreditCard, Info, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: {
    id: string;
    title: string;
    cover_art_url?: string;
    price: number;
    currency: string;
    creator: {
      id: string;
      username: string;
      display_name: string;
      avatar_url?: string;
    };
  };
  onPurchaseSuccess?: () => void;
}

export function PurchaseModal({ isOpen, onClose, track, onPurchaseSuccess }: PurchaseModalProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(false);
      setIsPurchasing(false);
      // TODO: Load user's payment methods
      // For now, we'll use a placeholder
    }
  }, [isOpen]);

  const formatPrice = (amount: number, currency: string) => {
    const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
    return `${symbol}${amount.toFixed(2)}`;
  };

  const handlePurchase = async () => {
    if (!user) {
      setError('Please log in to purchase content');
      return;
    }

    setIsPurchasing(true);
    setError(null);

    try {
      // First, check if user already owns the content
      const ownershipResponse = await fetch(
        `/api/content/ownership?content_id=${track.id}&content_type=track`
      );

      const ownershipData = await ownershipResponse.json();

      if (ownershipData.success && ownershipData.data.owns) {
        setError('You already own this content');
        setIsPurchasing(false);
        return;
      }

      // For now, we'll need to create a payment method first
      // This is a simplified version - in production, you'd use Stripe Elements
      // to collect payment method details securely
      
      // TODO: Integrate with Stripe Elements to get payment_method_id
      // For now, we'll show an error asking user to add payment method
      
      if (!paymentMethodId) {
        setError('Please add a payment method first. Payment method selection coming soon.');
        setIsPurchasing(false);
        return;
      }

      const response = await fetch('/api/content/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_id: track.id,
          content_type: 'track',
          payment_method_id: paymentMethodId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onPurchaseSuccess?.();
          onClose();
        }, 2000);
      } else {
        setError(data.message || 'Purchase failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Purchase error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div
        className={`relative w-full max-w-md rounded-lg shadow-xl ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Purchase Content
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Purchase Complete!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You can now download and listen to "{track.title}" anytime.
              </p>
            </div>
          ) : (
            <>
              {/* Content Preview */}
              <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {track.cover_art_url ? (
                  <img
                    src={track.cover_art_url}
                    alt={track.title}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <ShoppingCart className="h-10 w-10 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {track.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    by {track.creator.display_name || track.creator.username}
                  </p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {formatPrice(track.price, track.currency)}
                  </p>
                </div>
              </div>

              {/* Info Box */}
              <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500 mb-6">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  You'll be able to download this content after purchase and listen to it unlimited times.
                </p>
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Payment Method
                </h4>
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Default Payment Method
                    </span>
                  </div>
                  <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    Change
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Payment method selection coming soon. Please add a payment method in your account settings.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  disabled={isPurchasing}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePurchase}
                  disabled={isPurchasing || !paymentMethodId}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isPurchasing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" />
                      <span>Purchase {formatPrice(track.price, track.currency)}</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
