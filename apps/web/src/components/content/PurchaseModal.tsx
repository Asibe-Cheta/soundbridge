'use client';

import React from 'react';
import { ContentPurchaseModal } from '@/src/components/content/ContentPurchaseModal';

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

/** Profile track list — delegates to ContentPurchaseModal (Stripe Elements). */
export function PurchaseModal({ isOpen, onClose, track, onPurchaseSuccess }: PurchaseModalProps) {
  return (
    <ContentPurchaseModal
      isOpen={isOpen}
      onClose={onClose}
      contentType="track"
      contentId={track.id}
      title={track.title}
      price={track.price}
      currency={track.currency}
      coverUrl={track.cover_art_url}
      creatorLabel={track.creator.display_name || track.creator.username}
      onPurchaseSuccess={onPurchaseSuccess}
    />
  );
}
