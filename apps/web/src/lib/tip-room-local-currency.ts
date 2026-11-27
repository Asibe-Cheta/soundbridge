import { CURRENCY_INFO, isSupportedCurrency } from '@/src/constants/currency';

/**
 * Display-only formatting for Tip Room's approximate local amount.
 * Never used for anything that charges or validates -- purely cosmetic.
 */
export function formatApproxLocalAmount(gbpAmount: number, currency: string, factor: number): string {
  const converted = gbpAmount * factor;
  // Whole units once the number is large enough that 2dp is noise (fits
  // currencies like NGN without needing a per-currency allowlist).
  const useWholeUnits = converted >= 100;
  const rounded = useWholeUnits ? Math.round(converted) : Math.round(converted * 100) / 100;

  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: useWholeUnits ? 0 : 2,
      maximumFractionDigits: useWholeUnits ? 0 : 2,
    }).format(rounded);
  } catch {
    const symbol = isSupportedCurrency(currency) ? CURRENCY_INFO[currency].symbol : currency;
    return `${symbol}${useWholeUnits ? rounded : rounded.toFixed(2)}`;
  }
}
