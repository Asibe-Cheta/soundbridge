'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useTheme } from '@/src/contexts/ThemeContext';

const DISMISS_KEY = 'soundbridge_waitlist_modal_dismissed_at';
const DISMISS_DAYS = 7;

const shouldShowModal = (pathname: string) => {
  if (pathname.startsWith('/waitlist')) return false;
  if (pathname.startsWith('/admin')) return false;
  return true;
};

export default function WaitlistJoinModal() {
  const { theme } = useTheme();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [signupCount, setSignupCount] = useState<number | null>(null);

  const canShow = useMemo(() => shouldShowModal(pathname), [pathname]);

  useEffect(() => {
    if (!canShow) return;
    const lastDismissed = localStorage.getItem(DISMISS_KEY);
    if (lastDismissed) {
      const lastDismissedAt = Number(lastDismissed);
      if (Number.isFinite(lastDismissedAt)) {
        const daysSince = (Date.now() - lastDismissedAt) / (1000 * 60 * 60 * 24);
        if (daysSince < DISMISS_DAYS) {
          return;
        }
      }
    }
    setIsOpen(true);
  }, [canShow]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/waitlist/count');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setSignupCount(result.data.total);
          }
        }
      } catch (error) {
        console.error('Failed to fetch waitlist count:', error);
      }
    };
    fetchCount();
  }, [isOpen]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const countText = signupCount ? `${signupCount.toLocaleString()} people just joined` : 'People are joining fast';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div
        className={`w-full max-w-xl rounded-2xl border shadow-2xl ${
          isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Join the SoundBridge waitlist"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/10">
          <div className="text-lg font-semibold">🎉 Join the SoundBridge Waitlist</div>
          <button
            onClick={handleDismiss}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            aria-label="Close"
          >
            <X className={isDark ? 'text-gray-300' : 'text-gray-600'} size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            🚀 Be first to get early access, exclusive creator tools, and launch updates.
            Join thousands of artists building the future of music on SoundBridge.
          </p>

          <div className={`text-2xl font-bold ${isDark ? 'text-pink-300' : 'text-pink-600'}`}>
            {countText} — join now!
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/waitlist"
              className="px-5 py-3 rounded-lg bg-gradient-to-r from-red-600 to-pink-500 text-white font-semibold hover:from-red-700 hover:to-pink-600 transition-colors"
            >
              Join Waitlist
            </Link>
            <button
              onClick={handleDismiss}
              className={`px-4 py-3 rounded-lg text-sm font-medium ${
                isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
