import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { SURVEY_KEY } from '@/src/lib/survey-notifications-schema';

type ResponseRow = {
  answers: Record<string, unknown> | null;
  country: string | null;
  ref: string | null;
  completed_at: string | null;
};

type OptionCounts = Record<string, number>;

function countOption(rows: ResponseRow[], key: string, multi: boolean): OptionCounts {
  const counts: OptionCounts = {};
  for (const row of rows) {
    const val = row.answers?.[key];
    if (multi) {
      if (Array.isArray(val)) {
        for (const v of val) {
          if (typeof v === 'string') counts[v] = (counts[v] || 0) + 1;
        }
      }
    } else if (typeof val === 'string') {
      counts[val] = (counts[val] || 0) + 1;
    }
  }
  return counts;
}

/**
 * GET /api/admin/surveys/notifications
 * Aggregated, read-only breakdown of survey_responses for
 * survey_key = 'notifications_interest_2026_11' -- same figures as
 * scripts/survey-notifications-report.sql, rendered for the admin UI
 * instead of the SQL Editor.
 */
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (isAdminAccessDenied(adminCheck)) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const PAGE_SIZE = 1000;
    const rows: ResponseRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await adminCheck.serviceClient
        .from('survey_responses')
        .select('answers, country, ref, completed_at')
        .eq('survey_key', SURVEY_KEY)
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      const page = (data || []) as ResponseRow[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    const totalStarted = rows.length;
    const totalCompleted = rows.filter((r) => r.completed_at).length;

    const q7Positive: OptionCounts = {};
    const q7Negative: OptionCounts = {};
    for (const row of rows) {
      const q6val = row.answers?.q6;
      const q7val = row.answers?.q7;
      if (typeof q7val !== 'string') continue;
      const branch = q6val === 'Definitely' || q6val === 'Probably' ? q7Positive : q7Negative;
      branch[q7val] = (branch[q7val] || 0) + 1;
    }

    const q6ByCountry: Record<string, OptionCounts> = {};
    const q6ByRef: Record<string, OptionCounts> = {};
    const byCountry: Record<string, { started: number; completed: number }> = {};
    for (const row of rows) {
      const country = (row.country || '(unknown)').trim();
      byCountry[country] = byCountry[country] || { started: 0, completed: 0 };
      byCountry[country].started += 1;
      if (row.completed_at) byCountry[country].completed += 1;

      const q6val = row.answers?.q6;
      if (typeof q6val === 'string') {
        q6ByCountry[country] = q6ByCountry[country] || {};
        q6ByCountry[country][q6val] = (q6ByCountry[country][q6val] || 0) + 1;

        const ref = (row.ref || '(none)').trim();
        q6ByRef[ref] = q6ByRef[ref] || {};
        q6ByRef[ref][q6val] = (q6ByRef[ref][q6val] || 0) + 1;
      }
    }

    return NextResponse.json({
      success: true,
      totalStarted,
      totalCompleted,
      completionRatePercent:
        totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 1000) / 10 : 0,
      questions: {
        q1: countOption(rows, 'q1', true),
        q2: countOption(rows, 'q2', false),
        q3: countOption(rows, 'q3', false),
        q4: countOption(rows, 'q4', true),
        q5: countOption(rows, 'q5', true),
        q6: countOption(rows, 'q6', false),
      },
      q7: { positive: q7Positive, negative: q7Negative },
      q6ByCountry,
      q6ByRef,
      byCountry,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
