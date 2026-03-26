import React from 'react';
import { Sparkles, MapPin, Music2, Clock3, Target, TrendingUp } from 'lucide-react';

function ProgressRing({ value }: { value: number }) {
  const radius = 52;
  const stroke = 10;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative w-28 h-28">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle
          stroke="rgba(255,255,255,0.12)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#10B981"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset: offset }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <div className="text-2xl font-bold text-white">{value}%</div>
        <div className="text-xs text-white/60 -mt-1">complete</div>
      </div>
    </div>
  );
}

export default function AiAdvisorPage() {
  const mock = {
    greeting: 'Good evening, Creator',
    whatToDoToday: {
      title: 'Post a track preview today',
      subtitle:
        'Your audience is most active Tuesday afternoons — 3 days before your weekend peak. A 30-second preview is projected to add 40–60 plays by Friday.',
      projection: '+£28–42 projected',
      cta: 'Create Post',
    },
    location: {
      current: { city: 'Birmingham', fans: '4,200 fans', revenue: '£3,800/yr', competition: 'Low' },
      recommended: { city: 'Manchester', fans: '22,000 fans', revenue: '£12,400/yr', competition: 'Medium' },
      diaspora: { title: 'Nigerian Independence Day — London', line: '12,000 diaspora fans · avg tip £5 vs £0.40 locally', revenue: '£3,800–£7,200 predicted revenue' },
    },
    careerInsights: [
      { title: 'Worship bridge = 3.2× more tips', hint: 'Pattern detected' },
      { title: 'Friday evenings are your golden window', hint: 'Timing edge' },
      { title: 'You’re in the top 15% for your stage', hint: 'Top performer' },
      { title: '"The Gospel Prevails" is pulling far ahead', hint: 'Breakout track' },
    ],
    profileScore: {
      value: 40,
      headline: 'Room to grow',
      sub: 'Top earners in your genre average 85%+ profile completeness.',
      bullets: [
        { title: 'Add a professional bio', impact: '+30% service enquiries' },
        { title: 'Upload 3 more portfolio tracks', impact: '4× more collaboration requests' },
        { title: 'Add Gospel Producer + Session Singer categories', impact: '+65% discovery appearances' },
        { title: 'Professional profile photo', impact: 'Already earning +30% bookings', done: true },
        { title: 'External portfolio links added', impact: 'Completed', done: true },
      ],
    },
    releaseStrategy: {
      confidence: 78,
      recommendationTitle: 'Upbeat Gospel — Piano Intro',
      intro: 'Piano-led',
      tempo: '120–130 BPM',
      structure: 'Worship bridge ending',
      duration: '3:20–3:50',
      month1: '£480–£720',
      month1vs: '+300%',
      month1Label: 'vs your average',
      plan: [
        { step: '1', label: 'Lead single', value: 'Upbeat gospel, piano intro (your best elements)' },
        { step: '2', label: 'Feature collab', value: 'Gospel producer within 20km — expands your audience' },
        { step: '3', label: 'Mini-EP', value: '60% upbeat, 40% worship — your top performing styles' },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2B0B5B] via-[#2C0B57] to-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
            <Sparkles className="w-5 h-5 text-accent-pink" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Advisor</h1>
            <p className="text-white/70">Your next career move, distilled into one clear direction.</p>
          </div>
        </div>

        {/* Greeting + What to do today */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 rounded-3xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="text-white/60 text-sm">Career Advisor</div>
                <div className="text-2xl font-semibold">{mock.greeting}</div>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/70">
                <Clock3 className="w-4 h-4" />
                Weekly update
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-violet-500/25 to-fuchsia-500/20 border border-white/10 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold mb-2">{mock.whatToDoToday.title}</h2>
                  <p className="text-white/70 text-sm leading-relaxed">{mock.whatToDoToday.subtitle}</p>
                </div>
                <div className="hidden md:block text-right whitespace-nowrap">
                  <div className="text-emerald-300 text-sm font-medium">{mock.whatToDoToday.projection}</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-5">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Target className="w-4 h-4 text-emerald-400" />
                  Today · {new Date().toLocaleDateString('en-GB', { weekday: 'short' })}
                </div>
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#DC2626] hover:brightness-110 transition font-semibold"
                >
                  {mock.whatToDoToday.cta} →
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-accent-pink" />
              <h2 className="text-lg font-semibold">Location Analysis</h2>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl bg-black/30 border border-white/10 p-4">
                <div className="text-white/60 text-xs">Current</div>
                <div className="text-lg font-semibold">{mock.location.current.city}</div>
                <div className="text-white/70 text-sm mt-1">{mock.location.current.fans}</div>
                <div className="text-emerald-200 text-sm mt-1">{mock.location.current.revenue}</div>
                <div className="text-white/60 text-xs mt-2">Competition: {mock.location.current.competition}</div>
              </div>
              <div className="rounded-2xl bg-gradient-to-r from-violet-500/15 to-fuchsia-500/10 border border-white/10 p-4">
                <div className="text-white/60 text-xs">Recommended</div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-lg font-semibold">{mock.location.recommended.city}</div>
                  <div className="w-2.5 h-2.5 rounded-full bg-accent-pink/90" />
                </div>
                <div className="text-white/70 text-sm mt-1">{mock.location.recommended.fans}</div>
                <div className="text-violet-200 text-sm mt-1">{mock.location.recommended.revenue}</div>
                <div className="text-white/60 text-xs mt-2">Competition: {mock.location.recommended.competition}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Diaspora match */}
        <div className="rounded-3xl bg-white/5 border border-white/10 p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-200 text-xs font-semibold mb-3">
                <Music2 className="w-4 h-4" />
                Diaspora Match
              </div>
              <div className="text-xl font-semibold">{mock.location.diaspora.title}</div>
              <div className="text-white/70 text-sm mt-1">{mock.location.diaspora.line}</div>
            </div>
            <div className="text-right">
              <div className="text-emerald-200 font-semibold">{mock.location.diaspora.revenue}</div>
            </div>
          </div>
        </div>

        {/* Career insights + Profile score */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 rounded-3xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-accent-pink" />
              <h2 className="text-lg font-semibold">Career Insights</h2>
            </div>
            <div className="space-y-3">
              {mock.careerInsights.map((ins, idx) => (
                <div key={idx} className="rounded-2xl bg-black/30 border border-white/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{ins.title}</div>
                    <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs">
                      {ins.hint}
                    </div>
                  </div>
                  <div className="text-white/60 text-sm mt-2">
                    Tap to expand (demo) — in production this will show the “why” + the action impact.
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
            <div className="text-lg font-semibold mb-2">Profile Score</div>
            <div className="text-white/60 text-sm mb-5">{mock.profileScore.headline}</div>

            <div className="flex items-center gap-4 mb-4">
              <ProgressRing value={mock.profileScore.value} />
              <div className="min-w-0">
                <div className="font-semibold">Top earners average 85%+</div>
                <div className="text-sm text-white/70 mt-1">{mock.profileScore.sub}</div>
              </div>
            </div>

            <div className="space-y-3">
              {mock.profileScore.bullets.map((b, idx) => (
                <div key={idx} className="rounded-2xl bg-black/30 border border-white/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">{b.title}</div>
                    {b.done ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                        ✓
                      </div>
                    ) : (
                      <div className="text-xs text-white/60">→</div>
                    )}
                  </div>
                  <div className="text-emerald-200 text-sm mt-2">{b.impact}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Release strategy */}
        <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-white/60 text-sm mb-2">RELEASE STRATEGY</div>
              <div className="text-xl font-semibold">{mock.releaseStrategy.recommendationTitle}</div>
              <div className="text-white/70 text-sm mt-1">
                Confidence: <span className="text-emerald-200 font-semibold">{mock.releaseStrategy.confidence}%</span>
              </div>
            </div>
            <div className="hidden md:block text-right text-white/60 text-sm">
              Updated weekly · demo content
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-black/30 border border-white/10 p-4">
              <div className="text-white/60 text-xs mb-2">Intro style</div>
              <div className="text-lg font-semibold">{mock.releaseStrategy.intro}</div>
            </div>
            <div className="rounded-2xl bg-black/30 border border-white/10 p-4">
              <div className="text-white/60 text-xs mb-2">Tempo</div>
              <div className="text-lg font-semibold">{mock.releaseStrategy.tempo}</div>
            </div>
            <div className="rounded-2xl bg-black/30 border border-white/10 p-4">
              <div className="text-white/60 text-xs mb-2">Structure</div>
              <div className="text-lg font-semibold">{mock.releaseStrategy.structure}</div>
            </div>
            <div className="rounded-2xl bg-black/30 border border-white/10 p-4">
              <div className="text-white/60 text-xs mb-2">Duration</div>
              <div className="text-lg font-semibold">{mock.releaseStrategy.duration}</div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-violet-500/10 border border-white/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-white/60 text-xs">Month 1 projection</div>
              <div className="text-lg font-semibold">{mock.releaseStrategy.month1}</div>
            </div>
            <div className="text-right">
              <div className="text-white/60 text-xs">{mock.releaseStrategy.month1Label}</div>
              <div className="text-emerald-200 font-semibold">{mock.releaseStrategy.month1vs}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {mock.releaseStrategy.plan.map((p, idx) => (
              <div key={idx} className="rounded-2xl bg-black/30 border border-white/10 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm font-semibold">
                    {p.step}
                  </div>
                  <div className="text-sm font-semibold text-white/80">{p.label}</div>
                </div>
                <div className="text-white/70 text-sm leading-relaxed">{p.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs text-white/50">
            Demo only. In production, recommendations use anonymised platform benchmarks and confidence scoring.
          </div>
        </div>
      </div>
    </div>
  );
}

