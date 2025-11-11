export const SUPPORTED_CURRENCIES = ['USD', 'GBP', 'NGN', 'EUR'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const isSupportedCurrency = (value: string | null | undefined): value is SupportedCurrency =>
  value !== undefined && value !== null && SUPPORTED_CURRENCIES.includes(value as SupportedCurrency);

