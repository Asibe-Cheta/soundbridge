'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useDashboard } from '@/src/hooks/useDashboard';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import { buildEventPollCombinations } from '@/src/lib/event-poll';
import { resolveEffectiveTier } from '@/src/lib/effective-subscription-tier';
import { ArrowLeft, BarChart3, Loader2, Send } from 'lucide-react';

type PollResults = {
  total_recipients?: number;
  total_responses?: number;
  response_rate_percent?: number;
  winning_option?: { label?: string; percentage?: number; location?: string; date?: string } | null;
  options?: { label: string; votes: number; percentage: number }[];
  location_totals?: { location: string; votes: number }[];
  availability_insight?: string | null;
};

function EventPollLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="max-w-3xl mx-auto rounded-xl border border-gray-200 bg-white p-6 flex items-center gap-2 text-gray-600">
        <Loader2 className="animate-spin" size={18} />
        Loading…
      </div>
    </div>
  );
}

function DashboardEventPollContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaign');
  const { user } = useAuth();
  const { theme } = useTheme();
  const { profile } = useDashboard();

  const tier = resolveEffectiveTier(profile, 'free');
  const premiumAccess = tier === 'premium' || tier === 'unlimited';

  const [interestedCount, setInterestedCount] = useState(0);
  const [recipientPreview, setRecipientPreview] = useState(0);
  const [messageBody, setMessageBody] = useState('');
  const [dates, setDates] = useState(['', '', '', '']);
  const [locations, setLocations] = useState(['', '', '']);
  const [results, setResults] = useState<PollResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const combinations = useMemo(
    () =>
      buildEventPollCombinations(
        dates.filter(Boolean),
        locations.filter(Boolean),
      ),
    [dates, locations],
  );

  useEffect(() => {
    if (!user || !premiumAccess) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const statusRes = await fetchWithSupabaseAuth('/api/event-poll/status');
        const statusJson = await statusRes.json();
        if (!statusRes.ok) throw new Error(statusJson?.error || 'Failed to load status');
        setInterestedCount(statusJson.interestedCount ?? 0);
        setRecipientPreview(statusJson.interestedCount ?? 0);

        if (campaignId) {
          const resultsRes = await fetchWithSupabaseAuth(
            `/api/event-poll/results?campaign_id=${encodeURIComponent(campaignId)}`,
          );
          const resultsJson = await resultsRes.json();
          if (resultsRes.ok) setResults(resultsJson.results);
        } else if (statusJson.results) {
          setResults(statusJson.results);
        }

        const artistName = profile?.display_name || profile?.username || 'Artist';
        setMessageBody(
          `Hey, you mentioned you wanted to hear my music live. I am thinking of making it happen. Help me pick the best date and place.\n\n${artistName}`,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user, premiumAccess, campaignId, profile?.display_name, profile?.username]);

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      const response = await fetchWithSupabaseAuth('/api/event-poll/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageBody,
          dateOptions: dates.filter(Boolean),
          locationOptions: locations.filter(Boolean),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'Failed to send poll');
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send poll');
    } finally {
      setSending(false);
    }
  };

  const dark = theme === 'dark';
  const card = `${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6`;

  return (
    <ProtectedRoute>
      <div className={`min-h-screen ${dark ? 'bg-gray-900' : 'bg-gray-50'} px-4 py-8`}>
        <div className="max-w-3xl mx-auto space-y-6">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className={`inline-flex items-center gap-2 text-sm ${dark ? 'text-gray-300' : 'text-gray-600'}`}
          >
            <ArrowLeft size={16} />
            Back to Analytics
          </button>

          {!premiumAccess ? (
            <div className={card}>
              <h1 className={`text-2xl font-bold mb-3 ${dark ? 'text-white' : 'text-gray-900'}`}>
                Event Poll
              </h1>
              <p className={`mb-4 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                Send a poll to your interested listeners and find out exactly when and where to perform.
                Available on Premium and Unlimited.
              </p>
              <Link href="/subscription" className="text-pink-500 font-semibold">
                Access Premium
              </Link>
            </div>
          ) : loading ? (
            <div className={`${card} flex items-center gap-2 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
              <Loader2 className="animate-spin" size={18} />
              Loading…
            </div>
          ) : results && campaignId ? (
            <div className={card}>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="text-pink-500" size={20} />
                <h1 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
                  Event Poll Results
                </h1>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className={`rounded-lg p-3 ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  <div className="text-xs opacity-60">Sent</div>
                  <div className="text-xl font-semibold">{results.total_recipients ?? 0}</div>
                </div>
                <div className={`rounded-lg p-3 ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  <div className="text-xs opacity-60">Responded</div>
                  <div className="text-xl font-semibold">{results.total_responses ?? 0}</div>
                </div>
                <div className={`rounded-lg p-3 ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  <div className="text-xs opacity-60">Rate</div>
                  <div className="text-xl font-semibold">{results.response_rate_percent ?? 0}%</div>
                </div>
              </div>
              {results.winning_option?.label && (
                <div className="rounded-lg border border-pink-500/40 bg-pink-500/10 p-4 mb-4">
                  <p className="text-sm font-medium text-pink-300">Strongest option</p>
                  <p className="text-lg font-semibold">{results.winning_option.label}</p>
                </div>
              )}
              {results.options?.map((opt) => (
                <div key={opt.label} className="flex justify-between text-sm py-2 border-b border-white/10">
                  <span>{opt.label}</span>
                  <span>{opt.votes} ({opt.percentage}%)</span>
                </div>
              ))}
              {results.availability_insight && (
                <p className={`text-sm mt-4 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {results.availability_insight}
                </p>
              )}
              {results.winning_option?.label && (
                <Link
                  href={`/events/create?title=${encodeURIComponent('Live performance')}&location=${encodeURIComponent(String(results.winning_option.location || results.winning_option.label))}`}
                  className="inline-flex mt-6 rounded-lg bg-gradient-to-r from-red-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  Create This Event
                </Link>
              )}
            </div>
          ) : sent ? (
            <div className={card}>
              <h1 className={`text-2xl font-bold mb-3 ${dark ? 'text-white' : 'text-gray-900'}`}>
                Poll sent
              </h1>
              <p className={dark ? 'text-gray-400' : 'text-gray-600'}>
                Your poll has been sent. Check back to see the responses.
              </p>
              <Link href="/dashboard?tab=analytics" className="inline-block mt-4 text-pink-500 font-semibold">
                Back to Analytics
              </Link>
            </div>
          ) : (
            <div className={card}>
              <h1 className={`text-2xl font-bold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
                Ask your audience when and where
              </h1>
              <p className={`mb-6 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                {interestedCount} listeners want to hear you live. Send them a poll to find the best date and
                location.
              </p>

              <label className="block text-sm font-medium mb-2">Message preview</label>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={5}
                className={`w-full rounded-lg border px-3 py-2 mb-6 ${dark ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              />

              <label className="block text-sm font-medium mb-2">Add up to 4 date options</label>
              <div className="grid gap-2 mb-6">
                {dates.map((value, index) => (
                  <input
                    key={`date-${index}`}
                    value={value}
                    onChange={(e) => {
                      const next = [...dates];
                      next[index] = e.target.value;
                      setDates(next);
                    }}
                    placeholder={`Date option ${index + 1}`}
                    className={`rounded-lg border px-3 py-2 ${dark ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                ))}
              </div>

              <label className="block text-sm font-medium mb-2">Add up to 3 location options</label>
              <div className="grid gap-2 mb-6">
                {locations.map((value, index) => (
                  <input
                    key={`loc-${index}`}
                    value={value}
                    onChange={(e) => {
                      const next = [...locations];
                      next[index] = e.target.value;
                      setLocations(next);
                    }}
                    placeholder={`City or venue ${index + 1}`}
                    className={`rounded-lg border px-3 py-2 ${dark ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                ))}
              </div>

              {combinations.length > 0 && (
                <div className={`rounded-lg p-4 mb-6 ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  <p className="text-sm font-medium mb-2">Poll options preview</p>
                  <ul className="text-sm space-y-1">
                    {combinations.map((c) => (
                      <li key={c.label}>• {c.label}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className={`text-sm mb-4 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                Will be sent to {recipientPreview} listeners who said yes to live interest.
              </p>

              {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

              <button
                type="button"
                disabled={sending || combinations.length === 0 || interestedCount < 25}
                onClick={() => void handleSend()}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Send Poll to {recipientPreview} Listeners
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function DashboardEventPollPage() {
  return (
    <Suspense fallback={<EventPollLoading />}>
      <DashboardEventPollContent />
    </Suspense>
  );
}
