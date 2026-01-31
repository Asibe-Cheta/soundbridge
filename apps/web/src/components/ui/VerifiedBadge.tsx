import React from 'react';
import { Check } from 'lucide-react';

interface VerifiedBadgeProps {
  className?: string;
  size?: number;
}

export function VerifiedBadge({ className = '', size = 14 }: VerifiedBadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      }}
      aria-label="Verified"
      title="Verified"
    >
      <Check size={Math.max(8, Math.round(size * 0.6))} className="text-white" />
    </span>
  );
}
