'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

type OptionCounts = Record<string, number>;

type SurveyStatsPayload = {
  success: true;
  totalStarted: number;
  totalCompleted: number;
  completionRatePercent: number;
  questions: {
    q1: OptionCounts;
    q2: OptionCounts;
    q3: OptionCounts;
    q4: OptionCounts;
    q5: OptionCounts;
    q6: OptionCounts;
  };
  q7: { positive: OptionCounts; negative: OptionCounts };
  q6ByCountry: Record<string, OptionCounts>;
  q6ByRef: Record<string, OptionCounts>;
  byCountry: Record<string, { started: number; completed: number }>;
};

const QUESTION_TITLES: Record<keyof SurveyStatsPayload['questions'], string> = {
  q1: 'Q1 - Which do you actually open or reply to?',
  q2: 'Q2 - Which do you respond to more?',
  q3: 'Q3 - Ever turned off or blocked notifications?',
  q4: 'Q4 - Why? (only shown after Q3 = Yes)',
  q5: 'Q5 - What would make you keep notifications on?',
  q6: 'Q6 - Would you turn on notifications for SoundBridge?',
};

export default function AdminSurveyNotificationsPage() {
  const { theme } = useTheme();
  const [data, setData] = useState<SurveyStatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithSupabaseAuth('/api/admin/surveys/notifications');
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Request failed (${res.status})`);
        }
        if (!cancelled) setData(json as SurveyStatsPayload);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cardClass = `rounded-xl border p-4 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`;
  const sectionClass = `rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6`;
  const mutedText = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const headingText = theme === 'dark' ? 'text-white' : 'text-gray-900';

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className={`text-2xl font-bold ${headingText}`}>Notifications survey</h1>
          <p className={`text-sm mt-1 ${mutedText}`}>
            survey_key: notifications_interest_2026_11 -- /survey/notifications
          </p>
        </div>

        {loading ? (
          <p className={mutedText}>Loading…</p>
        ) : error ? (
          <div className={`${cardClass} text-red-400`}>Error: {error}</div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard theme={theme} label="Started" value={data.totalStarted} />
              <StatCard theme={theme} label="Completed" value={data.totalCompleted} />
              <StatCard theme={theme} label="Completion rate" value={`${data.completionRatePercent}%`} />
            </div>

            {(Object.keys(data.questions) as Array<keyof typeof data.questions>).map((key) => (
              <div key={key} className={sectionClass}>
                <h2 className={`text-base font-semibold mb-4 ${headingText}`}>{QUESTION_TITLES[key]}</h2>
                <OptionBarList theme={theme} counts={data.questions[key]} />
              </div>
            ))}

            <div className={sectionClass}>
              <h2 className={`text-base font-semibold mb-4 ${headingText}`}>
                Q7 - split by Q6 branch
              </h2>
              <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${mutedText}`}>
                Positive (Definitely / Probably on Q6)
              </p>
              <OptionBarList theme={theme} counts={data.q7.positive} />
              <p className={`text-xs font-medium uppercase tracking-wide mt-5 mb-2 ${mutedText}`}>
                Negative (Not sure / Probably not / No on Q6)
              </p>
              <OptionBarList theme={theme} counts={data.q7.negative} />
            </div>

            <div className={sectionClass}>
              <h2 className={`text-base font-semibold mb-4 ${headingText}`}>Completion by country</h2>
              <CountryTable theme={theme} byCountry={data.byCountry} />
            </div>

            <div className={sectionClass}>
              <h2 className={`text-base font-semibold mb-4 ${headingText}`}>Q6 by country</h2>
              <NestedBreakdown theme={theme} data={data.q6ByCountry} />
            </div>

            <div className={sectionClass}>
              <h2 className={`text-base font-semibold mb-4 ${headingText}`}>Q6 by ref</h2>
              <NestedBreakdown theme={theme} data={data.q6ByRef} />
            </div>
          </>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}

function StatCard({ theme, label, value }: { theme: string; label: string; value: number | string }) {
  return (
    <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <p className={`text-xs font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        {label}
      </p>
      <p className={`text-2xl font-semibold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function OptionBarList({ theme, counts }: { theme: string; counts: OptionCounts }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = entries.length > 0 ? entries[0][1] : 0;
  const rowText = theme === 'dark' ? 'text-gray-200' : 'text-gray-800';
  const barTrack = theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100';

  if (entries.length === 0) {
    return <p className={theme === 'dark' ? 'text-gray-500 text-sm' : 'text-gray-400 text-sm'}>No responses yet.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map(([option, count]) => (
        <div key={option} className="flex items-center gap-3">
          <span className={`w-56 shrink-0 text-sm ${rowText}`}>{option}</span>
          <div className={`flex-1 h-2 rounded-full overflow-hidden ${barTrack}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-red to-accent-pink"
              style={{ width: `${max > 0 ? (count / max) * 100 : 0}%` }}
            />
          </div>
          <span className={`w-10 text-right text-sm font-medium ${rowText}`}>{count}</span>
        </div>
      ))}
    </div>
  );
}

function CountryTable({
  theme,
  byCountry,
}: {
  theme: string;
  byCountry: Record<string, { started: number; completed: number }>;
}) {
  const rows = Object.entries(byCountry).sort((a, b) => b[1].started - a[1].started);
  const cellText = theme === 'dark' ? 'text-gray-200' : 'text-gray-800';
  const headText = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';

  if (rows.length === 0) {
    return <p className={theme === 'dark' ? 'text-gray-500 text-sm' : 'text-gray-400 text-sm'}>No responses yet.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className={`text-left border-b ${borderColor}`}>
          <th className={`py-2 font-medium uppercase text-xs tracking-wide ${headText}`}>Country</th>
          <th className={`py-2 font-medium uppercase text-xs tracking-wide ${headText}`}>Started</th>
          <th className={`py-2 font-medium uppercase text-xs tracking-wide ${headText}`}>Completed</th>
          <th className={`py-2 font-medium uppercase text-xs tracking-wide ${headText}`}>Completion %</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([country, stats]) => (
          <tr key={country} className={`border-b ${borderColor}`}>
            <td className={`py-2 ${cellText}`}>{country}</td>
            <td className={`py-2 ${cellText}`}>{stats.started}</td>
            <td className={`py-2 ${cellText}`}>{stats.completed}</td>
            <td className={`py-2 ${cellText}`}>
              {stats.started > 0 ? Math.round((stats.completed / stats.started) * 1000) / 10 : 0}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NestedBreakdown({ theme, data }: { theme: string; data: Record<string, OptionCounts> }) {
  const groups = Object.entries(data).sort(
    (a, b) => Object.values(b[1]).reduce((s, n) => s + n, 0) - Object.values(a[1]).reduce((s, n) => s + n, 0),
  );
  const headText = theme === 'dark' ? 'text-gray-300' : 'text-gray-700';

  if (groups.length === 0) {
    return <p className={theme === 'dark' ? 'text-gray-500 text-sm' : 'text-gray-400 text-sm'}>No responses yet.</p>;
  }

  return (
    <div className="space-y-5">
      {groups.map(([group, counts]) => (
        <div key={group}>
          <p className={`text-sm font-semibold mb-2 ${headText}`}>{group}</p>
          <OptionBarList theme={theme} counts={counts} />
        </div>
      ))}
    </div>
  );
}
