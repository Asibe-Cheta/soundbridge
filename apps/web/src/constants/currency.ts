// Comprehensive list of supported currencies for service providers
export const SUPPORTED_CURRENCIES = [
  // Major currencies
  'USD', // US Dollar
  'EUR', // Euro
  'GBP', // British Pound
  'JPY', // Japanese Yen
  'CNY', // Chinese Yuan
  'CAD', // Canadian Dollar
  'AUD', // Australian Dollar
  'CHF', // Swiss Franc
  'NZD', // New Zealand Dollar
  'SGD', // Singapore Dollar
  'HKD', // Hong Kong Dollar
  'SEK', // Swedish Krona
  'NOK', // Norwegian Krone
  'DKK', // Danish Krone
  'PLN', // Polish Zloty
  'MXN', // Mexican Peso
  'BRL', // Brazilian Real
  'INR', // Indian Rupee
  'ZAR', // South African Rand
  'KRW', // South Korean Won
  'TRY', // Turkish Lira
  'RUB', // Russian Ruble
  'THB', // Thai Baht
  'MYR', // Malaysian Ringgit
  'PHP', // Philippine Peso
  'IDR', // Indonesian Rupiah
  'VND', // Vietnamese Dong
  'AED', // UAE Dirham
  'SAR', // Saudi Riyal
  'ILS', // Israeli Shekel
  'NGN', // Nigerian Naira
  'GHS', // Ghanaian Cedi
  'KES', // Kenyan Shilling
  'EGP', // Egyptian Pound
  'ARS', // Argentine Peso
  'CLP', // Chilean Peso
  'COP', // Colombian Peso
  'PEN', // Peruvian Sol
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const isSupportedCurrency = (value: string | null | undefined): value is SupportedCurrency =>
  value !== undefined && value !== null && SUPPORTED_CURRENCIES.includes(value as SupportedCurrency);

// Currency display information
export const CURRENCY_INFO: Record<SupportedCurrency, { name: string; symbol: string }> = {
  USD: { name: 'US Dollar', symbol: '$' },
  EUR: { name: 'Euro', symbol: '€' },
  GBP: { name: 'British Pound', symbol: '£' },
  JPY: { name: 'Japanese Yen', symbol: '¥' },
  CNY: { name: 'Chinese Yuan', symbol: '¥' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$' },
  AUD: { name: 'Australian Dollar', symbol: 'A$' },
  CHF: { name: 'Swiss Franc', symbol: 'CHF' },
  NZD: { name: 'New Zealand Dollar', symbol: 'NZ$' },
  SGD: { name: 'Singapore Dollar', symbol: 'S$' },
  HKD: { name: 'Hong Kong Dollar', symbol: 'HK$' },
  SEK: { name: 'Swedish Krona', symbol: 'kr' },
  NOK: { name: 'Norwegian Krone', symbol: 'kr' },
  DKK: { name: 'Danish Krone', symbol: 'kr' },
  PLN: { name: 'Polish Zloty', symbol: 'zł' },
  MXN: { name: 'Mexican Peso', symbol: '$' },
  BRL: { name: 'Brazilian Real', symbol: 'R$' },
  INR: { name: 'Indian Rupee', symbol: '₹' },
  ZAR: { name: 'South African Rand', symbol: 'R' },
  KRW: { name: 'South Korean Won', symbol: '₩' },
  TRY: { name: 'Turkish Lira', symbol: '₺' },
  RUB: { name: 'Russian Ruble', symbol: '₽' },
  THB: { name: 'Thai Baht', symbol: '฿' },
  MYR: { name: 'Malaysian Ringgit', symbol: 'RM' },
  PHP: { name: 'Philippine Peso', symbol: '₱' },
  IDR: { name: 'Indonesian Rupiah', symbol: 'Rp' },
  VND: { name: 'Vietnamese Dong', symbol: '₫' },
  AED: { name: 'UAE Dirham', symbol: 'د.إ' },
  SAR: { name: 'Saudi Riyal', symbol: '﷼' },
  ILS: { name: 'Israeli Shekel', symbol: '₪' },
  NGN: { name: 'Nigerian Naira', symbol: '₦' },
  GHS: { name: 'Ghanaian Cedi', symbol: '₵' },
  KES: { name: 'Kenyan Shilling', symbol: 'KSh' },
  EGP: { name: 'Egyptian Pound', symbol: 'E£' },
  ARS: { name: 'Argentine Peso', symbol: '$' },
  CLP: { name: 'Chilean Peso', symbol: '$' },
  COP: { name: 'Colombian Peso', symbol: '$' },
  PEN: { name: 'Peruvian Sol', symbol: 'S/' },
};

