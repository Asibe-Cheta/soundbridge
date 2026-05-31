'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Lock, MapPin, Radio, Send } from 'lucide-react';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import type { EffectiveTier } from '@/src/lib/effective-subscription-tier';

type PollResults = {
  total_recipients?: number;
  total_responses?: number;
  response_rate_percent?: number;
  winning_option?: { label?: string; percentage?: number } | null;
  options?: { label: string; votes: number; percentage: number }[];
  location_totals?: { location: string; votes: number }[];
  availability_insight?: string | null;
};

type StatusPayload = {
  tierAccess: boolean;
  interestedCount: number;
  minimumToPoll: number;
  canSendPoll: boolean;
  activeCampaign: { id: string; total_recipients: number; total_responses: number } | null;
  responseRate: number;
  results: PollResults | null;
};

export function EventPollPanel({ tier }: { tier: EffectiveTier }) {
  const premiumAccess = tier === 'premium' || tier === 'unlimited';
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithSupabaseAuth('/api/event-poll/status');
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'Failed to load event poll status');
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load event poll status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!premiumAccess) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="h-5 w-5 text-pink-400" />
          <h3 className="text-lg font-semibold text-white">Event Poll</h3>
        </div>
        <p className="text-sm text-white/70 mb-4">
          Send a poll to your interested listeners and find out exactly when and where to perform.
          Available on Premium and Unlimited.
        </p>
        <Link
          href="/subscription"
          className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-red-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white"
        >
          Access Premium
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-white/60 text-sm">
        Loading live demand…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-200 text-sm">
        {error || 'Unable to load event poll data'}
      </div>
    );
  }

  const results = data.results as PollResults | null;
  const winning = results?.winning_option;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-pink-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Live Demand</h3>
            <p className="text-sm text-white/60">Event poll from live interest data</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{data.interestedCount}</div>
          <div className="text-xs text-white/50">interested listeners</div>
        </div>
      </div>

      {data.activeCampaign ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-black/20 p-3">
              <div className="text-xs text-white/50">Sent</div>
              <div className="text-lg font-semibold text-white">{data.activeCampaign.total_recipients}</div>
            </div>
            <div className="rounded-lg bg-black/20 p-3">
              <div className="text-xs text-white/50">Responded</div>
              <div className="text-lg font-semibold text-white">{data.activeCampaign.total_responses}</div>
            </div>
            <div className="rounded-lg bg-black/20 p-3 col-span-2 sm:col-span-1">
              <div className="text-xs text-white/50">Response rate</div>
              <div className="text-lg font-semibold text-white">{data.responseRate}%</div>
            </div>
          </div>

          {winning?.label && (
            <div className="rounded-lg border border-pink-500/30 bg-pink-500/10 p-4">
              <p className="text-sm text-pink-200 font-medium mb-1">Winning combination</p>
              <p className="text-white font-semibold">{winning.label}</p>
              {typeof winning.percentage === 'number' && winning.percentage > 0 && (
                <p className="text-sm text-white/70 mt-1">
                  {winning.percentage}% of respondents chose this.
                </p>
              )}
            </div>
          )}

          {results?.location_totals?.length ? (
            <div>
              <p className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <MapPin size={14} />
                Location breakdown
              </p>
              <div className="space-y-2">
                {results.location_totals.map((row) => (
                  <div key={row.location} className="flex justify-between text-sm text-white/80">
                    <span>{row.location}</span>
                    <span>{row.votes} votes</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {results?.availability_insight && (
            <p className="text-sm text-white/70">{results.availability_insight}</p>
          )}

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard/event-poll?campaign=${data.activeCampaign.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/5"
            >
              <BarChart3 size={16} />
              View Results
            </Link>
            {winning?.label && (
              <Link
                href={`/events/create?title=${encodeURIComponent('Live performance')}&location=${encodeURIComponent(String((winning as { location?: string }).location || winning.label))}`}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Create This Event
              </Link>
            )}
          </div>
        </div>
      ) : data.canSendPoll ? (
        <div>
          <p className="text-sm text-white/70 mb-4">
            {data.interestedCount} listeners want to hear you live. Send them a poll to find the best date
            and location.
          </p>
          <Link
            href="/dashboard/event-poll"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white"
          >
            <Send size={16} />
            Send Poll to Your Audience
          </Link>
        </div>
      ) : (
        <p className="text-sm text-white/60">
          Keep collecting live interest — you need at least {data.minimumToPoll} yes responses before
          sending a poll{data.interestedCount > 0 ? ` (${data.interestedCount} so far).` : '.'}
        </p>
      )}
    </div>
  );
}
