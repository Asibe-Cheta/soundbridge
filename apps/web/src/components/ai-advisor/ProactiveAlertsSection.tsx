'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Lightbulb, Loader2 } from 'lucide-react';
import {
  SIGNAL_TYPE_LABELS,
  type ProactiveSignalType,
} from '@/src/lib/ai-career-proactive-constants';

export type ProactiveSignal = {
  id: string;
  signal_type: ProactiveSignalType;
  signal_data: Record<string, unknown>;
  generated_insight: string | null;
  shown_to_user: boolean;
  created_at: string;
};

function PulseDot() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-60" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-purple-500" />
    </span>
  );
}

export function ProactiveAlertsSection() {
  const [signals, setSignals] = useState<ProactiveSignal[]>([]);
  const [unshownCount, setUnshownCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/ai-adviser/proactive-signals', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) return;
      setSignals(data.signals ?? []);
      setUnshownCount(Number(data.unshownCount ?? 0));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markAllShown = async () => {
    setMarking(true);
    try {
      await fetch('/api/ai-adviser/proactive-signals', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setSignals((prev) => prev.map((s) => ({ ...s, shown_to_user: true })));
      setUnshownCount(0);
    } finally {
      setMarking(false);
    }
  };

  const openAlerts = () => {
    setExpanded((v) => !v);
    if (!expanded && unshownCount > 0) {
      void markAllShown();
    }
  };

  if (loading) return null;
  if (!signals.length) return null;

  const displayCount = unshownCount > 0 ? unshownCount : signals.filter((s) => !s.shown_to_user).length;

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={openAlerts}
        className="w-full flex items-center justify-between gap-3 rounded-2xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-left hover:bg-purple-500/15 transition"
      >
        <div className="flex items-center gap-3">
          {displayCount > 0 ? <PulseDot /> : <Lightbulb className="h-4 w-4 text-purple-300" />}
          <span className="text-sm font-medium text-white">
            {displayCount > 0
              ? `${displayCount} new career insight${displayCount === 1 ? '' : 's'} for you`
              : 'Career alerts'}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-white/50" />
        ) : (
          <ChevronDown className="h-4 w-4 text-white/50" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {signals.map((signal) => {
            const data = signal.signal_data ?? {};
            const providerId = data.provider_id as string | undefined;
            const providerName = data.provider_name as string | undefined;

            return (
              <div
                key={signal.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-300">
                  {SIGNAL_TYPE_LABELS[signal.signal_type] ?? signal.signal_type}
                </div>
                <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">
                  {signal.generated_insight || 'Insight pending…'}
                </p>
                {signal.signal_type === 'service_match' && providerId && providerName ? (
                  <Link
                    href={`/service-providers/${providerId}`}
                    className="mt-3 inline-flex text-sm font-medium text-pink-300 hover:text-pink-200"
                  >
                    Connect with {providerName} →
                  </Link>
                ) : null}
                {signal.signal_type === 'curated_opportunity' && data.source_url ? (
                  <a
                    href={String(data.source_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex text-sm font-medium text-pink-300 hover:text-pink-200"
                  >
                    View opportunity →
                  </a>
                ) : null}
              </div>
            );
          })}
          {marking ? (
            <p className="text-xs text-white/40 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Updating…
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
