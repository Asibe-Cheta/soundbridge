export const PLATFORM_REVENUE_CHARGE_TYPES = [
  'tip',
  'gig_payment',
  'event_ticket',
  'audio_sale',
  'album_sale',
] as const;

export type PlatformRevenueChargeType = (typeof PLATFORM_REVENUE_CHARGE_TYPES)[number];

export const CHARGE_TYPE_LABELS: Record<string, string> = {
  tip: 'Tips',
  gig_payment: 'Gig payments',
  event_ticket: 'Event tickets',
  audio_sale: 'Audio sales',
  album_sale: 'Album sales',
};

export type PlatformRevenuePeriodPreset = '7d' | '30d' | 'month' | 'year' | 'custom';

export type PlatformRevenueRow = {
  id: string;
  charge_type: string;
  gross_amount: number;
  platform_fee_amount: number;
  platform_fee_percent: number | null;
  creator_payout_amount: number;
  stripe_payment_intent_id: string | null;
  reference_id: string | null;
  creator_user_id: string | null;
  currency: string;
  created_at: string;
};

export type ChargeTypeSummary = {
  charge_type: string;
  label: string;
  transaction_count: number;
  gross_total: number;
  platform_fee_total: number;
  creator_payout_total: number;
  by_currency: Record<
    string,
    {
      gross_total: number;
      platform_fee_total: number;
      creator_payout_total: number;
      transaction_count: number;
    }
  >;
};

export type PlatformRevenueReport = {
  period: {
    preset: PlatformRevenuePeriodPreset;
    from: string;
    to: string;
    label: string;
  };
  totals: {
    transaction_count: number;
    gross_total: number;
    platform_fee_total: number;
    creator_payout_total: number;
  };
  by_charge_type: ChargeTypeSummary[];
  transactions: Array<
    PlatformRevenueRow & {
      label: string;
      gross_display: number;
      platform_fee_display: number;
      creator_payout_display: number;
    }
  >;
};

export function chargeTypeLabel(chargeType: string): string {
  return CHARGE_TYPE_LABELS[chargeType] ?? chargeType.replace(/_/g, ' ');
}

/** DB stores minor units (cents/pence). */
export function minorToMajor(minor: number): number {
  return Math.round(Number(minor || 0)) / 100;
}

export function resolvePlatformRevenueDateRange(
  preset: string | null,
  fromParam: string | null,
  toParam: string | null,
  yearParam: string | null,
): { preset: PlatformRevenuePeriodPreset; from: Date; to: Date; label: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (yearParam && /^\d{4}$/.test(yearParam)) {
    const y = parseInt(yearParam, 10);
    return {
      preset: 'custom',
      from: new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)),
      to: new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)),
      label: `Year ${y}`,
    };
  }

  const p = (preset || '30d').toLowerCase() as PlatformRevenuePeriodPreset;

  if (p === 'custom' && fromParam) {
    const from = new Date(fromParam);
    const to = toParam ? new Date(toParam) : end;
    if (!Number.isNaN(from.getTime())) {
      from.setHours(0, 0, 0, 0);
      if (!Number.isNaN(to.getTime())) to.setHours(23, 59, 59, 999);
      return {
        preset: 'custom',
        from,
        to: Number.isNaN(to.getTime()) ? end : to,
        label: `Custom (${from.toLocaleDateString()} – ${(Number.isNaN(to.getTime()) ? end : to).toLocaleDateString()})`,
      };
    }
  }

  if (p === '7d') {
    const from = new Date(end);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { preset: '7d', from, to: end, label: 'Last 7 days' };
  }

  if (p === 'month') {
    const from = new Date(end.getFullYear(), end.getMonth(), 1, 0, 0, 0, 0);
    return {
      preset: 'month',
      from,
      to: end,
      label: `This month (${from.toLocaleString('default', { month: 'long', year: 'numeric' })})`,
    };
  }

  if (p === 'year') {
    const from = new Date(end.getFullYear(), 0, 1, 0, 0, 0, 0);
    return {
      preset: 'year',
      from,
      to: end,
      label: `This year (${end.getFullYear()})`,
    };
  }

  // default 30d
  const from = new Date(end);
  from.setDate(from.getDate() - 29);
  from.setHours(0, 0, 0, 0);
  return { preset: p === '30d' ? '30d' : '30d', from, to: end, label: 'Last 30 days' };
}

export function buildPlatformRevenueReport(
  rows: PlatformRevenueRow[],
  period: { preset: PlatformRevenuePeriodPreset; from: Date; to: Date; label: string },
): PlatformRevenueReport {
  const byType = new Map<string, ChargeTypeSummary>();

  for (const ct of PLATFORM_REVENUE_CHARGE_TYPES) {
    byType.set(ct, {
      charge_type: ct,
      label: chargeTypeLabel(ct),
      transaction_count: 0,
      gross_total: 0,
      platform_fee_total: 0,
      creator_payout_total: 0,
      by_currency: {},
    });
  }

  let transaction_count = 0;
  let gross_total = 0;
  let platform_fee_total = 0;
  let creator_payout_total = 0;

  const transactions = rows.map((row) => {
    const gross = minorToMajor(row.gross_amount);
    const fee = minorToMajor(row.platform_fee_amount);
    const creator = minorToMajor(row.creator_payout_amount);
    const cur = (row.currency || 'USD').toUpperCase();

    transaction_count += 1;
    gross_total += gross;
    platform_fee_total += fee;
    creator_payout_total += creator;

    let bucket = byType.get(row.charge_type);
    if (!bucket) {
      bucket = {
        charge_type: row.charge_type,
        label: chargeTypeLabel(row.charge_type),
        transaction_count: 0,
        gross_total: 0,
        platform_fee_total: 0,
        creator_payout_total: 0,
        by_currency: {},
      };
      byType.set(row.charge_type, bucket);
    }
    bucket.transaction_count += 1;
    bucket.gross_total += gross;
    bucket.platform_fee_total += fee;
    bucket.creator_payout_total += creator;
    if (!bucket.by_currency[cur]) {
      bucket.by_currency[cur] = {
        gross_total: 0,
        platform_fee_total: 0,
        creator_payout_total: 0,
        transaction_count: 0,
      };
    }
    bucket.by_currency[cur].transaction_count += 1;
    bucket.by_currency[cur].gross_total += gross;
    bucket.by_currency[cur].platform_fee_total += fee;
    bucket.by_currency[cur].creator_payout_total += creator;

    return {
      ...row,
      label: chargeTypeLabel(row.charge_type),
      gross_display: gross,
      platform_fee_display: fee,
      creator_payout_display: creator,
    };
  });

  const by_charge_type = Array.from(byType.values())
    .filter((b) => b.transaction_count > 0)
    .sort((a, b) => b.platform_fee_total - a.platform_fee_total);

  return {
    period: {
      preset: period.preset,
      from: period.from.toISOString(),
      to: period.to.toISOString(),
      label: period.label,
    },
    totals: {
      transaction_count,
      gross_total: Math.round(gross_total * 100) / 100,
      platform_fee_total: Math.round(platform_fee_total * 100) / 100,
      creator_payout_total: Math.round(creator_payout_total * 100) / 100,
    },
    by_charge_type: by_charge_type.map((b) => ({
      ...b,
      gross_total: Math.round(b.gross_total * 100) / 100,
      platform_fee_total: Math.round(b.platform_fee_total * 100) / 100,
      creator_payout_total: Math.round(b.creator_payout_total * 100) / 100,
    })),
    transactions,
  };
}

export function platformRevenueReportToCsv(report: PlatformRevenueReport): string {
  const headers = [
    'date',
    'charge_type',
    'category',
    'gross_amount',
    'platform_fee_percent',
    'platform_fee_amount',
    'creator_payout_amount',
    'currency',
    'stripe_payment_intent_id',
    'reference_id',
    'creator_user_id',
  ];
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(',')];
  for (const t of report.transactions) {
    lines.push(
      [
        t.created_at,
        t.charge_type,
        t.label,
        t.gross_display,
        t.platform_fee_percent ?? '',
        t.platform_fee_display,
        t.creator_payout_display,
        t.currency,
        t.stripe_payment_intent_id ?? '',
        t.reference_id ?? '',
        t.creator_user_id ?? '',
      ]
        .map(escape)
        .join(','),
    );
  }
  lines.push('');
  lines.push('# Summary by category');
  lines.push('category,transactions,gross_total,platform_fee_total,creator_payout_total');
  for (const b of report.by_charge_type) {
    lines.push(
      [b.label, b.transaction_count, b.gross_total, b.platform_fee_total, b.creator_payout_total]
        .map(escape)
        .join(','),
    );
  }
  lines.push('');
  lines.push('# Period totals');
  lines.push(
    [
      'all',
      report.totals.transaction_count,
      report.totals.gross_total,
      report.totals.platform_fee_total,
      report.totals.creator_payout_total,
    ].join(','),
  );
  return lines.join('\n');
}
