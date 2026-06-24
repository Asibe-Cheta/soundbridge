import { currencyService } from '@/src/lib/currency-service';
import { isFincraCurrency, type FincraCurrency } from '@/src/lib/fincra';

/** Fincra minimum destination amounts (local currency). */
export const FINCRA_MIN_DESTINATION: Record<FincraCurrency, number> = {
  NGN: 100,
  GHS: 1,
  KES: 100,
};

const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  NGN: 1456.75,
  GHS: 15.5,
  KES: 130,
};

export type ResolvedFincraPayoutAmount = {
  /** Amount sent to Fincra (destination/local currency). */
  fincraAmount: number;
  sourceAmount: number;
  sourceCurrency: string;
  destinationCurrency: FincraCurrency;
  exchangeRate: number | null;
  converted: boolean;
};

function convertWithRates(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
): number {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to) return amount;

  const fromRate = rates[from] ?? FALLBACK_RATES[from] ?? 1;
  const toRate = rates[to] ?? FALLBACK_RATES[to] ?? 1;
  const amountInUsd = amount / fromRate;
  return amountInUsd * toRate;
}

function roundFincraAmount(amount: number, currency: FincraCurrency): number {
  if (currency === 'NGN' || currency === 'KES') {
    return Math.round(amount);
  }
  return Math.round(amount * 100) / 100;
}

/**
 * Sync estimate for admin UI (uses fallback rates).
 */
export function estimateFincraPayoutAmount(
  amount: number,
  sourceCurrency: string | null | undefined,
  destinationCurrency: FincraCurrency,
): ResolvedFincraPayoutAmount {
  const source = String(sourceCurrency || 'USD').toUpperCase();
  const dest = destinationCurrency;

  if (isFincraCurrency(source) && source === dest) {
    const fincraAmount = roundFincraAmount(amount, dest);
    return {
      fincraAmount,
      sourceAmount: amount,
      sourceCurrency: source,
      destinationCurrency: dest,
      exchangeRate: 1,
      converted: false,
    };
  }

  const raw = convertWithRates(amount, source, dest, FALLBACK_RATES);
  const fincraAmount = roundFincraAmount(raw, dest);
  const exchangeRate = amount > 0 ? fincraAmount / amount : null;

  return {
    fincraAmount,
    sourceAmount: amount,
    sourceCurrency: source,
    destinationCurrency: dest,
    exchangeRate,
    converted: true,
  };
}

/**
 * Resolve wallet/request amount (USD/GBP/EUR) into Fincra local currency (NGN/GHS/KES).
 * Same-currency Fincra payouts pass through unchanged.
 */
export async function resolveFincraPayoutAmount(
  amount: number,
  sourceCurrency: string | null | undefined,
  destinationCurrency: FincraCurrency,
): Promise<ResolvedFincraPayoutAmount> {
  const source = String(sourceCurrency || 'USD').toUpperCase();
  const dest = destinationCurrency;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Payout amount must be a positive number');
  }

  if (isFincraCurrency(source) && source === dest) {
    const fincraAmount = roundFincraAmount(amount, dest);
    return {
      fincraAmount,
      sourceAmount: amount,
      sourceCurrency: source,
      destinationCurrency: dest,
      exchangeRate: 1,
      converted: false,
    };
  }

  const converted = await currencyService.convertCurrency(amount, source, dest);
  const fincraAmount = roundFincraAmount(converted, dest);
  const exchangeRate = amount > 0 ? fincraAmount / amount : null;

  return {
    fincraAmount,
    sourceAmount: amount,
    sourceCurrency: source,
    destinationCurrency: dest,
    exchangeRate,
    converted: true,
  };
}

export function assertFincraDestinationMinimum(
  fincraAmount: number,
  destinationCurrency: FincraCurrency,
): void {
  const min = FINCRA_MIN_DESTINATION[destinationCurrency];
  if (fincraAmount < min) {
    throw new Error(
      `Converted payout amount (${destinationCurrency} ${fincraAmount.toLocaleString()}) is below Fincra minimum (${destinationCurrency} ${min.toLocaleString()}).`,
    );
  }
}
