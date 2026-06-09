/**
 * Notification timing preferences — planning window, active months, preferred time-of-day.
 * See GOOGLE_CALENDAR_NUDGE.MD / MOBILE_TEAM_GOOGLE_CALENDAR_NUDGE_WEB_HANDOFF.MD
 */

import { isWithinTimeWindow } from './time-window.ts';

export type PlanningWindow =
  | 'last_minute'
  | 'few_weeks'
  | 'one_to_three_months'
  | 'any_time';

export type PreferredTimeSlot = 'morning' | 'afternoon' | 'evening' | 'any_time';

const SLOT_HOURS: Record<Exclude<PreferredTimeSlot, 'any_time'>, { start: number; end: number }> = {
  morning: { start: 0, end: 11 },
  afternoon: { start: 12, end: 16 },
  evening: { start: 17, end: 21 },
};

export function getHourInTimezone(date: Date, timezone: string): number {
  try {
    return parseInt(
      date.toLocaleString('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: timezone || 'UTC',
      }),
      10,
    );
  } catch {
    return date.getUTCHours();
  }
}

export function getMonthInTimezone(date: Date, timezone: string): number {
  try {
    const month = date.toLocaleString('en-US', {
      month: 'numeric',
      timeZone: timezone || 'UTC',
    });
    return parseInt(month, 10);
  } catch {
    return date.getUTCMonth() + 1;
  }
}

export function matchesActiveEventMonths(
  activeMonths: number[] | null | undefined,
  eventDate: Date,
  timezone: string,
): boolean {
  if (!activeMonths || activeMonths.length === 0) return true;
  const eventMonth = getMonthInTimezone(eventDate, timezone);
  return activeMonths.includes(eventMonth);
}

export function daysUntilEvent(eventDate: Date, now = new Date()): number {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEventDay = new Date(
    eventDate.getFullYear(),
    eventDate.getMonth(),
    eventDate.getDate(),
  );
  return Math.round(
    (startOfEventDay.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export type PlanningAction = 'send_now' | 'schedule' | 'skip';

export function getPlanningWindowAction(
  window: string | null | undefined,
  daysUntil: number,
): PlanningAction {
  const w = (window || 'any_time') as PlanningWindow;

  if (daysUntil < 0) return 'skip';

  switch (w) {
    case 'last_minute':
      if (daysUntil <= 7) return 'send_now';
      return 'schedule';
    case 'few_weeks':
      if (daysUntil >= 7 && daysUntil <= 28) return 'send_now';
      if (daysUntil > 28) return 'schedule';
      return 'skip';
    case 'one_to_three_months':
      if (daysUntil >= 30 && daysUntil <= 90) return 'send_now';
      if (daysUntil > 90) return 'schedule';
      return 'skip';
    case 'any_time':
    default:
      return 'send_now';
  }
}

export function getPlanningWindowScheduleDate(
  window: string | null | undefined,
  eventDate: Date,
): Date | null {
  const w = (window || 'any_time') as PlanningWindow;
  const eventMs = eventDate.getTime();

  switch (w) {
    case 'last_minute':
      return new Date(eventMs - 7 * 24 * 60 * 60 * 1000);
    case 'few_weeks':
      return new Date(eventMs - 28 * 24 * 60 * 60 * 1000);
    case 'one_to_three_months':
      return new Date(eventMs - 90 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

function hourInSlot(hour: number, slot: Exclude<PreferredTimeSlot, 'any_time'>): boolean {
  const range = SLOT_HOURS[slot];
  return hour >= range.start && hour <= range.end;
}

function isHourAllowed(hour: number, startHour: number, endHour: number): boolean {
  if (startHour <= endHour) {
    return hour >= startHour && hour <= endHour;
  }
  return hour >= startHour || hour <= endHour;
}

export function usesPreferredTimeSlots(times: string[] | null | undefined): boolean {
  if (!times || times.length === 0) return false;
  if (times.length === 1 && times[0] === 'any_time') return false;
  return times.some((t) => t !== 'any_time');
}

function isWithinHardWindowAt(
  startHour: number,
  endHour: number,
  timezone: string,
  at: Date,
): boolean {
  const hour = getHourInTimezone(at, timezone);
  return isHourAllowed(hour, startHour, endHour);
}

export function isInPreferredNotificationTime(
  times: string[] | null | undefined,
  timezone: string,
  startHour: number,
  endHour: number,
  at: Date = new Date(),
): boolean {
  const tz = timezone || 'UTC';

  if (!usesPreferredTimeSlots(times)) {
    return isWithinHardWindowAt(startHour, endHour, tz, at);
  }

  const currentHour = getHourInTimezone(at, tz);
  if (!isHourAllowed(currentHour, startHour, endHour)) return false;

  for (const raw of times ?? []) {
    if (raw === 'any_time') return true;
    if (raw === 'morning' || raw === 'afternoon' || raw === 'evening') {
      if (hourInSlot(currentHour, raw)) return true;
    }
  }

  return false;
}

/** Scan forward in 30-minute steps for the next preferred delivery window. */
export function getNextPreferredNotificationTime(
  times: string[] | null | undefined,
  timezone: string,
  startHour: number,
  endHour: number,
  now = new Date(),
): Date {
  const tz = timezone || 'UTC';

  for (let minutes = 30; minutes <= 48 * 60; minutes += 30) {
    const candidate = new Date(now.getTime() + minutes * 60 * 1000);
    if (isInPreferredNotificationTime(times, tz, startHour, endHour, candidate)) {
      return candidate;
    }
  }

  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

export function maxScheduleDate(a: Date | null, b: Date | null, now = new Date()): Date {
  const candidates = [a, b].filter((d): d is Date => d != null && d > now);
  if (candidates.length === 0) return new Date(now.getTime() + 60 * 60 * 1000);
  return candidates.reduce((latest, d) => (d > latest ? d : latest));
}
