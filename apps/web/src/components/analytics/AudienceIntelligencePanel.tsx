'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarChart3, Lock, MapPin, Radio, TrendingUp, Users } from 'lucide-react';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import type { EffectiveTier } from '@/src/lib/effective-subscription-tier';

type TrackPerformance = {
  id: string;
  title: string;
  total_plays: number;
  unique_listeners: number;
  repeat_listen_rate_percent: number;
  tip_rate_percent: number;
  quality_score: number;
  live_interest_count: number;
  signal_breakdown?: {
    repeat_component: number;
    tip_component: number;
    live_interest_component: number;
    social_component: number;
  };
};

type AudiencePayload = {
  tier: EffectiveTier;
  locked: boolean;
  track_performance?: TrackPerformance[];
  audience_locations?: { city: string; engaged_listeners: number }[];
  live_interest_summary?: {
    total_yes: number;
    top_cities: { city: string; yes_count: number }[];
    top_availability: string | null;
  };
  unlimited?: {
    similar_creators: { username: string; shared_fans: number }[];
    genre_average_quality_score: number;
    growth_signals: {
      genre_average_quality_score: number;
      tracks: {
        track_id: string;
        title: string;
        quality_score: number;
        repeat_listen_rate_percent: number;
        tip_rate_percent: number;
      }[];
    };
  };
};

type AudienceIntelligencePanelProps = {
  tier: EffectiveTier;
};

export function AudienceIntelligencePanel({ tier }: AudienceIntelligencePanelProps) {
  const [data, setData] = useState<AudiencePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithSupabaseAuth('/api/discovery/audience-intelligence');
        const json = await res.json();
        if (!cancelled && res.ok) setData(json);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (tier === 'free' || data?.locked) {
    return (
      <div className="rounded-xl border border-purple-500/30 bg-purple-950/30 p-6 text-center">
        <Lock className="mx-auto mb-3 text-purple-300" size={28} />
        <h3 className="text-lg font-semibold text-white mb-2">Your Audience Intelligence</h3>
        <p className="text-sm text-gray-300 mb-4 max-w-lg mx-auto">
          Discover who your real audience is, where they are, and when they want to hear you live.
          Available on Premium and Unlimited.
        </p>
        <Link href="/pricing" className="btn-primary inline-flex items-center gap-2">
          Access Premium
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Loading audience intelligence…</p>;
  }

  const tracks = data?.track_performance || [];
  const locations = data?.audience_locations || [];
  const live = data?.live_interest_summary;
  const unlimited = data?.unlimited;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-pink-400">
        <BarChart3 size={20} />
        <h3 className="font-semibold text-white text-lg">Your Audience Intelligence</h3>
      </div>

      <section>
        <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-3">
          Track performance
        </h4>
        {tracks.length === 0 ? (
          <p className="text-sm text-gray-400">Upload tracks to start building audience signals.</p>
        ) : (
          <div className="space-y-3">
            {tracks.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm"
              >
                <div className="sm:col-span-2 lg:col-span-4 font-medium text-white">{t.title}</div>
                <div>
                  <span className="text-gray-400">Plays</span>
                  <div className="text-white">
                    {t.total_plays} ({t.unique_listeners} unique)
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Repeat rate</span>
                  <div className="text-white">{t.repeat_listen_rate_percent}%</div>
                </div>
                <div>
                  <span className="text-gray-400">Tip rate</span>
                  <div className="text-white">{t.tip_rate_percent}%</div>
                </div>
                <div>
                  <span className="text-gray-400">Quality score</span>
                  <div className="text-white">{t.quality_score}/100</div>
                </div>
                <div>
                  <span className="text-gray-400">Live interest</span>
                  <div className="text-white">{t.live_interest_count}</div>
                </div>
                {t.signal_breakdown && (
                  <div className="sm:col-span-2 lg:col-span-4 pt-2 border-t border-white/10 text-xs text-gray-400 grid grid-cols-2 md:grid-cols-4 gap-2">
                    <span>Repeat: {t.signal_breakdown.repeat_component.toFixed(1)}</span>
                    <span>Tips: {t.signal_breakdown.tip_component.toFixed(1)}</span>
                    <span>Live: {t.signal_breakdown.live_interest_component.toFixed(1)}</span>
                    <span>Social: {t.signal_breakdown.social_component.toFixed(1)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-2">
          <MapPin size={16} /> Audience locations
        </h4>
        {locations.length === 0 ? (
          <p className="text-sm text-gray-400">Engaged listeners will appear here as your audience grows.</p>
        ) : (
          <ul className="space-y-2">
            {locations.map((loc) => (
              <li key={loc.city} className="text-white text-sm">
                {loc.city} — {loc.engaged_listeners} engaged listener{loc.engaged_listeners === 1 ? '' : 's'}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Radio size={16} /> Live interest summary
        </h4>
        <p className="text-white text-sm mb-2">
          {live?.total_yes ?? 0} listeners expressed live interest across your tracks.
        </p>
        {live?.top_cities && live.top_cities.length > 0 && (
          <ul className="text-sm text-gray-300 space-y-1 mb-2">
            {live.top_cities.map((c) => (
              <li key={c.city}>
                {c.city} — {c.yes_count} yes
              </li>
            ))}
          </ul>
        )}
        {live?.top_availability && (
          <p className="text-sm text-gray-400">
            Most common availability: <span className="text-white">{live.top_availability}</span>
          </p>
        )}
      </section>

      {unlimited && (
        <>
          <section>
            <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Users size={16} /> Audience similarity
            </h4>
            {unlimited.similar_creators.length === 0 ? (
              <p className="text-sm text-gray-400">
                Listeners who engage with your music also engage with creators in your genre and mood
                space — more data will refine this insight.
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-white">
                {unlimited.similar_creators.map((c) => (
                  <li key={c.username}>
                    Listeners who engage with you also engage with @{c.username} ({c.shared_fans}{' '}
                    shared fans)
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-2">
              <TrendingUp size={16} /> Growth signals
            </h4>
            <p className="text-sm text-gray-300 mb-2">
              Genre average quality score:{' '}
              <span className="text-white">{unlimited.genre_average_quality_score}/100</span>
            </p>
            <p className="text-xs text-gray-500">
              Compare your track scores above to the genre average to see how engagement is trending.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
