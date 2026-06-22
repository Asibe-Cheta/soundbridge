'use client';

import React from 'react';
import { ArrowUp } from 'lucide-react';

type NewPostsPillProps = {
  onPress: () => void;
};

export function NewPostsPill({ onPress }: NewPostsPillProps) {
  return (
    <div className="sticky top-4 z-30 flex justify-center pointer-events-none mb-2">
      <button
        type="button"
        onClick={onPress}
        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-600 to-pink-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-red-900/30 hover:from-red-500 hover:to-pink-400 transition-colors"
      >
        <ArrowUp className="h-4 w-4" aria-hidden />
        New posts
      </button>
    </div>
  );
}
