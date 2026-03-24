'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { ContentPurchaseModal } from '@/src/components/content/ContentPurchaseModal';

function formatPrice(amount: number, currency: string) {
  const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
  return `${symbol}${amount.toFixed(2)}`;
}

interface ContentPurchaseSectionProps {
  contentType: 'track' | 'album';
  contentId: string;
  title: string;
  price: number;
  currency: string;
  coverUrl?: string | null;
  creatorLabel: string;
  isOwner: boolean;
  isPaid: boolean;
}

export function ContentPurchaseSection({
  contentType,
  contentId,
  title,
  price,
  currency,
  coverUrl,
  creatorLabel,
  isOwner,
  isPaid,
}: ContentPurchaseSectionProps) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  if (isOwner || !isPaid) {
    return null;
  }

  return (
    <>
      <div className="rounded-2xl border border-violet-500/40 bg-violet-950/25 p-5 mb-6">
        <h2 className="text-lg font-semibold text-violet-100 mb-2">
          {contentType === 'album' ? 'Buy this album' : 'Buy this track'}
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          {formatPrice(price, currency)} · Secure checkout with Stripe
        </p>
        {!user ? (
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            Log in to purchase
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            Buy {formatPrice(price, currency)}
          </button>
        )}
      </div>

      <ContentPurchaseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        contentType={contentType}
        contentId={contentId}
        title={title}
        price={price}
        currency={currency}
        coverUrl={coverUrl}
        creatorLabel={creatorLabel}
        onPurchaseSuccess={() => setModalOpen(false)}
      />
    </>
  );
}
