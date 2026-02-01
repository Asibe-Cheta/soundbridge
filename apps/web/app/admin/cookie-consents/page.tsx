'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { useTheme } from '@/src/contexts/ThemeContext';

type ConsentRecord = {
  id: string;
  user_id: string | null;
  consent_status: 'accepted' | 'rejected' | 'customized';
  categories: {
    necessary: boolean;
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
  };
  consent_version: number;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  profile: {
    id: string;
    username: string;
    display_name: string;
  } | null;
};

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

export default function CookieConsentsAdminPage() {
  const { theme } = useTheme();
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const loadConsents = async (nextPage: number = page) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/cookie-consents?page=${nextPage}&limit=50`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load cookie consents');
      }
      setConsents(data.data || []);
      setPage(nextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cookie consents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConsents(1);
  }, []);

  return (
    <ProtectedRoute>
      <div className="p-6">
        <div className={`rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 mb-6`}>
          <div>
            <h1 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Cookie Consents</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              View consent decisions captured from the cookie toast.
            </p>
          </div>
          <button
            className={`px-3 py-2 text-sm rounded ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-gray-800'} text-white`}
            onClick={() => loadConsents(page)}
          >
            Refresh
          </button>
        </div>

        {error && <div className="mb-4 text-sm text-red-500">{error}</div>}
        {loading ? (
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading consents...</div>
        ) : (
          <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow`}>
            <table className={`min-w-full divide-y text-sm ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={theme === 'dark' ? 'bg-gray-900/40 divide-gray-700' : 'bg-gray-50 divide-gray-200'}>
                <tr>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>User</th>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Categories</th>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>IP</th>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Created</th>
                </tr>
              </thead>
              <tbody className={theme === 'dark' ? 'divide-y divide-gray-700' : 'divide-y divide-gray-100'}>
                {consents.map((consent) => (
                  <tr key={consent.id}>
                    <td className="px-4 py-3">
                      <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {consent.profile?.display_name || consent.profile?.username || consent.user_id || 'Anonymous'}
                      </div>
                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {consent.profile?.username || 'no-username'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                        {consent.consent_status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {[
                        consent.categories.functional && 'functional',
                        consent.categories.analytics && 'analytics',
                        consent.categories.marketing && 'marketing',
                      ]
                        .filter(Boolean)
                        .join(', ') || 'necessary only'}
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {consent.ip_address || '—'}
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDate(consent.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {consents.length === 0 && (
              <div className={`p-6 text-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                No consent records yet.
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
