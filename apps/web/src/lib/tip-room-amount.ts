/**
 * Tip Room custom "Other amount" validation. Shared between the client UI
 * (disables Pay / shows inline error) and the server route (never trusts
 * the client value). Min matches the app-wide MINIMUM_TIP_AMOUNTS.gbp in
 * platform-fees.ts — Tip Room does not get its own lower floor.
 */
export const TIP_ROOM_MIN_GBP = 4;
export const TIP_ROOM_MAX_GBP = 500;

export type TipRoomAmountValidation =
  | { ok: true; amount: number }
  | { ok: false; error: string };

const UP_TO_TWO_DECIMALS = /^\d+(\.\d{1,2})?$/;

export function validateTipRoomAmount(raw: unknown): TipRoomAmountValidation {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { ok: false, error: 'Enter an amount.' };
  }
  const str = String(raw).trim();
  if (!UP_TO_TWO_DECIMALS.test(str)) {
    return { ok: false, error: 'Enter a valid amount with up to 2 decimal places.' };
  }
  const amount = Number(str);
  if (!Number.isFinite(amount)) {
    return { ok: false, error: 'Enter a valid amount with up to 2 decimal places.' };
  }
  if (amount < TIP_ROOM_MIN_GBP) {
    return { ok: false, error: `Minimum tip is £${TIP_ROOM_MIN_GBP}.` };
  }
  if (amount > TIP_ROOM_MAX_GBP) {
    return { ok: false, error: `Maximum tip is £${TIP_ROOM_MAX_GBP}.` };
  }
  return { ok: true, amount };
}
