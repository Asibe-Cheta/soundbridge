'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Loader2,
  Send,
  MessageCircle,
  Lock,
  ArrowRight,
  X,
} from 'lucide-react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { getStripeJsPromise } from '@/src/lib/stripe-js-client';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  normalizeAdviserAnalysis,
  type AdviserAnalysisResult,
  type AdviserChatMessage,
} from '@/src/lib/ai-adviser-gemini';
import { ProactiveAlertsSection } from '@/src/components/ai-advisor/ProactiveAlertsSection';

type Phase = 'idle' | 'scanning' | 'results';

type UsageSummary = {
  tier: 'free' | 'premium' | 'unlimited';
  analysesUsed: number;
  analysesLimit: number;
  analysesRemaining: number;
  chatsUsed: number;
  chatsLimit: number;
  chatsRemaining: number;
  freeDemoUsed: boolean;
  canAnalyse: boolean;
  canChat: boolean;
};

const PRESET_CHIPS = [
  'Why this city?',
  'How do I grow faster?',
  'What should I post today?',
  'Explain my earnings',
];

const stripePromise = getStripeJsPromise();

function UsageBadge({ usage }: { usage: UsageSummary }) {
  if (usage.tier === 'free') {
    return (
      <span className="text-xs text-white/60">
        {usage.freeDemoUsed ? 'Free demo used' : '1 free demo analysis'}
      </span>
    );
  }
  return (
    <span className="text-xs text-white/60">
      {usage.analysesRemaining} of {usage.analysesLimit} analyses · {usage.chatsRemaining} of{' '}
      {usage.chatsLimit} chats remaining
    </span>
  );
}

function CreditsPaymentForm({
  clientSecret,
  creatorId,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  creatorId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        const res = await fetch('/api/ai-adviser/credits/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            creatorId,
            credits: 5,
            paymentIntentId: paymentIntent.id,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Payment succeeded but credits could not be applied.');
          return;
        }
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-300">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/80 hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#DC2626] font-semibold disabled:opacity-50"
        >
          {processing ? 'Processing…' : 'Pay £1.99'}
        </button>
      </div>
    </form>
  );
}

function BuyCreditsModal({
  creatorId,
  onClose,
  onSuccess,
}: {
  creatorId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ai-adviser/credits/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ creatorId, amount: 199, currency: 'gbp', credits: 5 }),
        });
        const data = await res.json();
        if (!res.ok || !data.clientSecret) {
          if (!cancelled) setError(data.error || 'Could not start payment');
          return;
        }
        if (!cancelled) setClientSecret(data.clientSecret);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Payment error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [creatorId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#1a0a3a] border border-white/10 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Buy 5 more analyses</h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>
        <p className="text-sm text-white/60 mb-4">£1.99 for 5 additional analyses this billing period.</p>
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-accent-pink" />
          </div>
        )}
        {error && <p className="text-sm text-red-300 mb-4">{error}</p>}
        {clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CreditsPaymentForm
              clientSecret={clientSecret}
              creatorId={creatorId}
              onSuccess={onSuccess}
              onCancel={onClose}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}

export function AiAdvisorClient() {
  const { user, loading: authLoading } = useAuth();
  const [phase, setPhase] = useState<Phase>('idle');
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [analysis, setAnalysis] = useState<AdviserAnalysisResult | null>(null);
  const [messages, setMessages] = useState<AdviserChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [stateLoading, setStateLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadState = useCallback(async () => {
    if (!user) return;
    setStateLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-adviser/state', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load adviser state');
        return;
      }
      setUsage(data.usage);
      if (data.latestAnalysis?.analysis) {
        setAnalysis(normalizeAdviserAnalysis(data.latestAnalysis.analysis));
        setPhase('results');
      }
      if (Array.isArray(data.conversation?.messages)) {
        setMessages(data.conversation.messages);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setStateLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) void loadState();
    else setStateLoading(false);
  }, [user, loadState]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const runAnalysis = async () => {
    if (!user || !usage?.canAnalyse) return;
    setError(null);
    setPhase('scanning');
    try {
      const res = await fetch('/api/ai-adviser/analyse', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setPhase( analysis ? 'results' : 'idle');
        if (data.code === 'LIMIT_REACHED' && usage.tier !== 'free') {
          setShowBuyCredits(true);
        }
        setError(data.error || 'Analysis failed');
        return;
      }
      setAnalysis(normalizeAdviserAnalysis(data.analysis));
      setUsage(data.usage);
      setPhase('results');
    } catch (e) {
      setPhase(analysis ? 'results' : 'idle');
      setError(e instanceof Error ? e.message : 'Analysis failed');
    }
  };

  const sendChat = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !user || chatLoading) return;
    if (!usage?.canChat) {
      setError(usage?.tier === 'free' ? 'Chat is available on Premium and Unlimited plans.' : 'Chat limit reached.');
      return;
    }

    setChatInput('');
    setChatLoading(true);
    setError(null);
    const optimistic: AdviserChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(optimistic);

    try {
      const res = await fetch('/api/ai-adviser/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages(messages);
        setError(data.error || 'Chat failed');
        return;
      }
      setMessages(data.messages);
      setUsage(data.usage);
    } catch (e) {
      setMessages(messages);
      setError(e instanceof Error ? e.message : 'Chat failed');
    } finally {
      setChatLoading(false);
    }
  };

  const freeLocked = usage?.tier === 'free' && usage.freeDemoUsed;
  const analysisLimitReached =
    usage && usage.tier !== 'free' && !usage.canAnalyse && !freeLocked;

  if (authLoading || stateLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#2B0B5B] via-[#2C0B57] to-black text-white flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-accent-pink" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#2B0B5B] via-[#2C0B57] to-black text-white flex items-center justify-center px-4">
        <div className="max-w-md text-center rounded-3xl bg-white/5 border border-white/10 p-8">
          <Sparkles className="w-10 h-10 text-accent-pink mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">AI Career Adviser</h1>
          <p className="text-white/60 mb-6">Sign in to get personalised career guidance based on your real SoundBridge data.</p>
          <Link
            href="/login?next=/ai-advisor"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#DC2626] font-semibold"
          >
            Sign in
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2B0B5B] via-[#2C0B57] to-black text-white">
      {showBuyCredits && user && (
        <BuyCreditsModal
          creatorId={user.id}
          onClose={() => setShowBuyCredits(false)}
          onSuccess={() => {
            setShowBuyCredits(false);
            void loadState();
          }}
        />
      )}

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
            <Sparkles className="w-5 h-5 text-accent-pink" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Career Adviser</h1>
            <p className="text-white/70 text-sm">Personalised guidance from your real creator data.</p>
          </div>
        </div>

        {usage && (
          <div className="mb-6 mt-4">
            <UsageBadge usage={usage} />
          </div>
        )}

        <ProactiveAlertsSection />

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-400/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {freeLocked && (
          <div className="rounded-3xl bg-white/5 border border-white/10 p-8 text-center mb-6">
            <Lock className="w-10 h-10 text-white/40 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Free analysis used</h2>
            <p className="text-white/60 text-sm mb-6">
              You have used your free analysis. Upgrade to Premium or Unlimited for ongoing access.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#DC2626] font-semibold"
            >
              Access Premium
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}

        {analysisLimitReached && (
          <div className="rounded-3xl bg-white/5 border border-white/10 p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-white/70 text-sm">
              You have used all analyses for this billing period.
            </p>
            <button
              type="button"
              onClick={() => setShowBuyCredits(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#DC2626] font-semibold whitespace-nowrap"
            >
              Buy 5 more for £1.99
            </button>
          </div>
        )}

        {phase === 'idle' && !freeLocked && (
          <div className="rounded-3xl bg-white/5 border border-white/10 p-8 text-center">
            <MessageCircle className="w-12 h-12 text-accent-pink mx-auto mb-4 opacity-80" />
            <h2 className="text-xl font-semibold mb-2">Analyse your career</h2>
            <p className="text-white/60 text-sm mb-8 max-w-md mx-auto">
              We&apos;ll review your tracks, plays, tips, and profile — then give honest, data-backed advice. No fabricated stats.
            </p>
            <button
              type="button"
              onClick={() => void runAnalysis()}
              disabled={!usage?.canAnalyse}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#DC2626] font-semibold disabled:opacity-40"
            >
              Analyse My Career
            </button>
          </div>
        )}

        {phase === 'scanning' && (
          <div className="rounded-3xl bg-white/5 border border-white/10 p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-accent-pink mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Analysing your career…</h2>
            <p className="text-white/60 text-sm">Reading your profile, tracks, and engagement data.</p>
          </div>
        )}

        {phase === 'results' && analysis && (
          <div className="space-y-6 mb-8">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
              <h2 className="text-lg font-semibold mb-3">Overview</h2>
              <p className="text-white/80 leading-relaxed">{analysis.summary}</p>
              {analysis.whatToDoToday && (
                <div className="mt-5 rounded-2xl bg-gradient-to-r from-violet-500/25 to-fuchsia-500/20 border border-white/10 p-5">
                  <div className="text-xs text-white/50 mb-1">What to do today</div>
                  <div className="font-semibold">{analysis.whatToDoToday.title}</div>
                  <p className="text-white/70 text-sm mt-2">{analysis.whatToDoToday.subtitle}</p>
                </div>
              )}
            </div>

            {(analysis.insights?.length ?? 0) > 0 && (
              <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
                <h2 className="text-lg font-semibold mb-4">Career insights</h2>
                <div className="space-y-3">
                  {analysis.insights.slice(0, 5).map((ins, idx) => (
                    <div key={idx} className="rounded-2xl bg-black/30 border border-white/10 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">{ins.title}</div>
                        {ins.hint && (
                          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs">
                            {ins.hint}
                          </span>
                        )}
                      </div>
                      <p className="text-white/60 text-sm mt-2 leading-relaxed">{ins.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {usage?.canAnalyse && (
              <button
                type="button"
                onClick={() => void runAnalysis()}
                className="text-sm text-accent-pink hover:underline"
              >
                Run a fresh analysis
              </button>
            )}
          </div>
        )}

        {(phase === 'results' || messages.length > 0) && (
          <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5 text-accent-pink" />
              <h2 className="text-lg font-semibold">Ask your adviser</h2>
            </div>

            {usage?.tier === 'free' && (
              <p className="text-white/50 text-sm mb-4">Chat is available on Premium and Unlimited plans.</p>
            )}

            <div className="max-h-80 overflow-y-auto space-y-3 mb-4 pr-1">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-[#EC4899]/80 to-[#DC2626]/80 text-white'
                        : 'bg-black/40 border border-white/10 text-white/85'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3 bg-black/40 border border-white/10 text-white/50 text-sm">
                    Typing…
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {usage?.canChat && (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {PRESET_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => void sendChat(chip)}
                      disabled={chatLoading}
                      className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 hover:bg-white/10 disabled:opacity-50"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendChat(chatInput);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about your career…"
                    disabled={chatLoading}
                    className="flex-1 rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-sm placeholder:text-white/40 focus:outline-none focus:border-accent-pink/50"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#DC2626] disabled:opacity-40"
                    aria-label="Send"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
