'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';

type ConsentStatus = 'accepted' | 'rejected' | 'customized';

type ConsentCategories = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

type ConsentRecord = {
  status: ConsentStatus;
  categories: ConsentCategories;
  timestamp: string;
  version: number;
};

const CONSENT_KEY = 'sb_cookie_consent';

const defaultCategories: ConsentCategories = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

const buildCookie = (name: string, value: string) => {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  return `${name}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
};

const safeParse = (value: string | null): ConsentRecord | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as ConsentRecord;
  } catch {
    return null;
  }
};

export function CookieConsentToast() {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [categories, setCategories] = useState<ConsentCategories>(defaultCategories);
  const [showSettingsButton, setShowSettingsButton] = useState(false);

  const isDark = theme === 'dark';

  const containerClasses = useMemo(
    () =>
      `rounded-2xl border shadow-2xl backdrop-blur-xl p-5 w-full max-w-sm ${
        isDark
          ? 'bg-gray-900/90 border-gray-700 text-white'
          : 'bg-white/90 border-gray-200 text-gray-900'
      }`,
    [isDark]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = safeParse(localStorage.getItem(CONSENT_KEY));
    if (stored) {
      setCategories(stored.categories);
      setVisible(false);
      setShowSettingsButton(true);
    } else {
      setVisible(true);
    }
  }, []);

  const persistConsent = async (status: ConsentStatus, nextCategories: ConsentCategories) => {
    const record: ConsentRecord = {
      status,
      categories: nextCategories,
      timestamp: new Date().toISOString(),
      version: 1,
    };

    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
      document.cookie = buildCookie(CONSENT_KEY, encodeURIComponent(JSON.stringify(record)));
    } catch (error) {
      console.warn('Failed to persist consent locally', error);
    }

    try {
      await fetch('/api/consent/cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent_status: status,
          categories: nextCategories,
          consent_version: 1,
        }),
      });
    } catch (error) {
      console.warn('Failed to store consent', error);
    }

    setVisible(false);
    setShowSettingsButton(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: record }));
    }
  };

  const handleAcceptAll = () => {
    const nextCategories = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    setCategories(nextCategories);
    persistConsent('accepted', nextCategories);
  };

  const handleReject = () => {
    const nextCategories = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    setCategories(nextCategories);
    persistConsent('rejected', nextCategories);
  };

  const handleSavePreferences = () => {
    persistConsent('customized', categories);
  };

  const handleToggle = (key: keyof ConsentCategories) => {
    if (key === 'necessary') return;
    setCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      {showSettingsButton && !visible && (
        <button
          type="button"
          onClick={() => {
            setShowCustomize(true);
            setVisible(true);
          }}
          className={`fixed bottom-6 right-6 z-40 px-3 py-2 text-xs rounded-full border ${
            isDark
              ? 'bg-gray-900/80 text-gray-200 border-gray-700 hover:bg-gray-800'
              : 'bg-white/90 text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Cookie settings
        </button>
      )}

      {visible && (
        <div className="fixed bottom-6 right-6 z-50 flex justify-end px-4 w-full">
          <div className={containerClasses}>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold">We use cookies</h3>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                We use cookies to run the site, improve performance, and personalize content. You can manage your
                preferences anytime.
              </p>
              <Link
                href="/legal/privacy"
                className={`text-xs underline ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
              >
                Learn more in our Privacy Policy
              </Link>
            </div>

            {showCustomize && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">Necessary</p>
                    <p className={isDark ? 'text-gray-400 text-xs' : 'text-gray-500 text-xs'}>
                      Required for basic site functionality.
                    </p>
                  </div>
                  <input type="checkbox" checked disabled className="accent-blue-600" />
                </div>

                {(['functional', 'analytics', 'marketing'] as Array<keyof ConsentCategories>).map((key) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium capitalize">{key}</p>
                      <p className={isDark ? 'text-gray-400 text-xs' : 'text-gray-500 text-xs'}>
                        {key === 'functional' && 'Helps with embedded media and login helpers.'}
                        {key === 'analytics' && 'Helps us understand usage to improve the product.'}
                        {key === 'marketing' && 'Used for ads and social tracking.'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={categories[key]}
                      onChange={() => handleToggle(key)}
                      className="accent-blue-600"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {!showCustomize ? (
                <>
                  <button
                    type="button"
                    onClick={handleReject}
                    className={`px-4 py-2 text-sm rounded-lg border ${
                      isDark
                        ? 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Deny all
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomize(true)}
                    className={`px-4 py-2 text-sm rounded-lg ${
                      isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Customize
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowCustomize(false)}
                    className={`px-4 py-2 text-sm rounded-lg border ${
                      isDark
                        ? 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    className={`px-4 py-2 text-sm rounded-lg border ${
                      isDark
                        ? 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Deny all
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePreferences}
                    className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Save preferences
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
