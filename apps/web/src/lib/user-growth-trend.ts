export const USER_GROWTH_LAUNCH_DATE = '2026-04-01';

export type UserGrowthDayPoint = {
  date: string;
  cumulative: number;
  new_today: number;
};

export type UserGrowthMilestone = {
  date: string;
  label: string;
};

export type UserGrowthStats = {
  totalToday: number;
  thisMonth: number;
  dailyAverage: number;
};

export type UserGrowthTrendPayload = {
  series: UserGrowthDayPoint[];
  stats: UserGrowthStats;
  milestones: UserGrowthMilestone[];
};

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseUtcDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function buildUserGrowthTrend(createdAtTimestamps: string[]): UserGrowthTrendPayload {
  const launch = parseUtcDate(USER_GROWTH_LAUNCH_DATE);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const countsByDay = new Map<string, number>();
  for (const ts of createdAtTimestamps) {
    if (!ts) continue;
    const day = ts.slice(0, 10);
    if (day < USER_GROWTH_LAUNCH_DATE) continue;
    countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);
  }

  const series: UserGrowthDayPoint[] = [];
  let cumulative = 0;

  for (let cursor = new Date(launch); cursor <= today; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = utcDateKey(cursor);
    const newToday = countsByDay.get(date) ?? 0;
    cumulative += newToday;
    series.push({ date, cumulative, new_today: newToday });
  }

  const totalToday = series.length ? series[series.length - 1].cumulative : 0;

  const now = new Date();
  const monthPrefix = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const thisMonth = series
    .filter((point) => point.date.startsWith(monthPrefix))
    .reduce((sum, point) => sum + point.new_today, 0);

  const dayCount = Math.max(1, series.length);
  const dailyAverage = Math.round((totalToday / dayCount) * 10) / 10;

  const milestones: UserGrowthMilestone[] = [{ date: USER_GROWTH_LAUNCH_DATE, label: 'Launch' }];

  const fiveHundred = series.find((point) => point.cumulative >= 500);
  if (fiveHundred) {
    milestones.push({ date: fiveHundred.date, label: '500 users' });
  }

  const oneThousand = series.find((point) => point.cumulative >= 1000);
  if (oneThousand) {
    milestones.push({ date: oneThousand.date, label: '1,000 users' });
  }

  return {
    series,
    stats: {
      totalToday,
      thisMonth,
      dailyAverage,
    },
    milestones,
  };
}

export function formatUserGrowthAxisDate(dateKey: string): string {
  return parseUtcDate(dateKey).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function formatUserGrowthTooltipDate(dateKey: string): string {
  return parseUtcDate(dateKey).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
