/**
 * Normalizes service provider API responses for mobile + web compatibility.
 * @see WEB_TEAM_SERVICE_PROVIDER_DASHBOARD_FIXES.md
 */

/** DB columns: rate_amount, rate_unit — expose aliases rate, unit + duplicate mobile names */
export function enrichServiceOfferingRow(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row || typeof row !== 'object') return row;
  const rate = row.rate_amount ?? row.rate ?? null;
  const unit = row.rate_unit ?? row.unit ?? 'hour';
  return {
    ...row,
    rate,
    unit,
    rate_amount: rate,
    rate_unit: unit,
  };
}

export function enrichServicePortfolioItemRow(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row || typeof row !== 'object') return row;
  const order = row.display_order ?? row.sort_order ?? 0;
  return {
    ...row,
    display_order: order,
    sort_order: order,
  };
}

/** DB: start_time, end_time, recurrence_rule — add start_at/end_at + start_time/end_time aliases */
export function enrichAvailabilityRow(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row || typeof row !== 'object') return row;
  const st = row.start_time ?? row.start_at;
  const et = row.end_time ?? row.end_at;
  const rr = row.recurrence_rule ?? row.recurrence ?? null;
  return {
    ...row,
    start_time: st,
    end_time: et,
    start_at: st,
    end_at: et,
    recurrence_rule: rr,
    recurrence: rr,
  };
}

function enrichNestedOffering(offering: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!offering) return null;
  return enrichServiceOfferingRow(offering) as Record<string, unknown>;
}

/** Add price_total alias; normalize nested offering */
export function enrichServiceBookingRow(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row || typeof row !== 'object') return row;
  const total = row.total_amount ?? row.price_total;
  const offering = row.offering as Record<string, unknown> | undefined;
  return {
    ...row,
    total_amount: total,
    price_total: total,
    offering: enrichNestedOffering(offering ?? null),
  };
}

/** Flatten reviewer profile fields for mobile dashboards */
export function enrichServiceReviewRow(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row || typeof row !== 'object') return row;
  const reviewer = row.reviewer as Record<string, unknown> | undefined;
  return {
    ...row,
    reviewer_display_name: reviewer?.display_name ?? null,
    reviewer_avatar_url: reviewer?.avatar_url ?? null,
    reviewer_username: reviewer?.username ?? null,
  };
}
