'use client';

import React, { useState } from 'react';
import { MapPin, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import { createBrowserClient } from '@/src/lib/supabase';
import type { EventPollMessagePayload } from '@/src/lib/event-poll';

export function EventPollMessage({
  poll,
  isOwnMessage,
}: {
  poll: EventPollMessagePayload;
  isOwnMessage: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardCls = isOwnMessage
    ? 'bg-white/15 border-white/25'
    : 'bg-black/20 border-white/15';

  const handleVote = async (option: EventPollMessagePayload['options'][number]) => {
    if (isOwnMessage || done || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error: rpcError } = await supabase.rpc('respond_to_poll', {
        p_campaign_id: poll.campaign_id,
        p_user_id: user.id,
        p_selected_option: option.label,
        p_selected_date: option.date ?? null,
        p_selected_location: option.location ?? null,
      });

      if (rpcError) throw rpcError;
      setSelected(option.label);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit vote');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`rounded-xl border p-4 ${cardCls}`}>
      <p className="text-sm whitespace-pre-wrap mb-4 opacity-95">{poll.body}</p>
      <p className="text-xs uppercase tracking-wide opacity-70 mb-3">Pick a date &amp; place</p>
      <div className="space-y-2">
        {poll.options.map((option) => {
          const isSelected = selected === option.label;
          return (
            <button
              key={option.label}
              type="button"
              disabled={isOwnMessage || done || submitting}
              onClick={() => void handleVote(option)}
              className={`w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors border ${
                isSelected
                  ? 'border-emerald-400 bg-emerald-500/20'
                  : 'border-white/15 hover:border-pink-400/60 hover:bg-white/5'
              } disabled:opacity-60`}
            >
              <div className="flex items-start gap-2">
                {isSelected ? (
                  <CheckCircle2 size={16} className="text-emerald-300 shrink-0 mt-0.5" />
                ) : (
                  <MapPin size={16} className="opacity-60 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-medium">{option.label}</div>
                  {option.date && (
                    <div className="text-xs opacity-70 flex items-center gap-1 mt-0.5">
                      <Calendar size={12} />
                      {option.date}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {submitting && (
        <p className="text-xs mt-3 flex items-center gap-2 opacity-80">
          <Loader2 size={14} className="animate-spin" />
          Submitting your vote…
        </p>
      )}
      {done && (
        <p className="text-xs mt-3 text-emerald-300">Thanks — your vote has been recorded.</p>
      )}
      {error && <p className="text-xs mt-3 text-red-300">{error}</p>}
      {isOwnMessage && (
        <p className="text-xs mt-3 opacity-60">Poll sent to your interested listeners.</p>
      )}
    </div>
  );
}
