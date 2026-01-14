'use client';

import React from 'react';
import { CheckCircle, ShoppingCart } from 'lucide-react';

interface TrackPriceBadgeProps {
  isPaid: boolean;
  price?: number;
  currency?: string;
  userOwnsTrack?: boolean;
  onPurchaseClick?: () => void;
}

export function TrackPriceBadge({
  isPaid,
  price,
  currency = 'USD',
  userOwnsTrack = false,
  onPurchaseClick,
}: TrackPriceBadgeProps) {
  if (!isPaid) return null;

  const formatPrice = (amount: number, curr: string) => {
    const symbol = curr === 'USD' ? '$' : curr === 'GBP' ? '£' : '€';
    return `${symbol}${amount.toFixed(2)}`;
  };

  if (userOwnsTrack) {
    return (
      <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 dark:bg-green-900/20 border border-green-500 text-green-700 dark:text-green-400 rounded-lg text-sm font-semibold">
        <CheckCircle className="h-4 w-4" />
        <span>Owned</span>
      </span>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 border border-blue-500 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-semibold">
        {price ? formatPrice(price, currency) : 'Paid'}
      </span>
      {onPurchaseClick && (
        <button
          onClick={onPurchaseClick}
          className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Buy</span>
        </button>
      )}
    </div>
  );
}
