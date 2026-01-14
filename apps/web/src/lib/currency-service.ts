/**
 * Currency Conversion Service
 * Handles exchange rate fetching and currency conversion
 */

const EXCHANGE_RATE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Fallback exchange rates (update monthly)
const FALLBACK_RATES: Record<string, number> = {
  'USD': 1.0,
  'GBP': 0.79,
  'EUR': 0.92,
  'NGN': 1456.75,
  'ZAR': 18.25,
  'CAD': 1.35,
  'AUD': 1.52,
  'JPY': 149.50,
  'CNY': 7.24,
  'INR': 83.12,
};

interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

class CurrencyService {
  private rates: ExchangeRates | null = null;
  private cacheTimestamp: number = 0;

  /**
   * Fetch exchange rates from API
   */
  async fetchExchangeRates(baseCurrency: string = 'USD'): Promise<ExchangeRates | null> {
    try {
      const response = await fetch(EXCHANGE_RATE_API_URL);
      if (!response.ok) {
        console.warn('Exchange rate API failed, using fallback rates');
        return null;
      }

      const data = await response.json();
      this.rates = data;
      this.cacheTimestamp = Date.now();
      return data;
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      return null;
    }
  }

  /**
   * Check if cache is expired
   */
  private isCacheExpired(): boolean {
    return Date.now() - this.cacheTimestamp > CACHE_DURATION;
  }

  /**
   * Get exchange rates (from cache or API)
   */
  async getExchangeRates(): Promise<Record<string, number>> {
    if (!this.rates || this.isCacheExpired()) {
      const fetched = await this.fetchExchangeRates();
      if (fetched) {
        return fetched.rates;
      }
      // Return fallback if API fails
      return FALLBACK_RATES;
    }
    return this.rates.rates;
  }

  /**
   * Convert currency amount
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rates = await this.getExchangeRates();

    // Convert via USD as intermediate currency
    // First convert from source currency to USD
    const usdRate = rates[fromCurrency] || FALLBACK_RATES[fromCurrency] || 1;
    const amountInUSD = amount / usdRate;

    // Then convert from USD to target currency
    const targetRate = rates[toCurrency] || FALLBACK_RATES[toCurrency] || 1;
    const convertedAmount = amountInUSD * targetRate;

    // Round to 2 decimal places
    return Math.round(convertedAmount * 100) / 100;
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number, currencyCode: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Detect user's currency based on profile/country
   */
  getUserCurrency(user: { country?: string; preferredCurrency?: string } | null): string {
    if (!user) return 'USD';

    // Priority 1: Explicit user preference
    if (user.preferredCurrency) {
      return user.preferredCurrency;
    }

    // Priority 2: Country-based
    const countryToCurrency: Record<string, string> = {
      'US': 'USD',
      'GB': 'GBP',
      'UK': 'GBP',
      'NG': 'NGN',
      'ZA': 'ZAR',
      'CA': 'CAD',
      'AU': 'AUD',
      'JP': 'JPY',
      'CN': 'CNY',
      'IN': 'INR',
      'DE': 'EUR',
      'FR': 'EUR',
      'IT': 'EUR',
      'ES': 'EUR',
      'NL': 'EUR',
      'BE': 'EUR',
      'AT': 'EUR',
      'PT': 'EUR',
      'IE': 'EUR',
      'FI': 'EUR',
      'GR': 'EUR',
    };

    if (user.country) {
      return countryToCurrency[user.country] || 'USD';
    }

    // Priority 3: Browser locale (client-side only)
    if (typeof window !== 'undefined') {
      const locale = navigator.language;
      if (locale.includes('GB')) return 'GBP';
      if (locale.includes('NG')) return 'NGN';
      if (locale.includes('ZA')) return 'ZAR';
      if (locale.includes('CA')) return 'CAD';
      if (locale.includes('AU')) return 'AUD';
      if (locale.includes('JP')) return 'JPY';
      if (locale.includes('CN')) return 'CNY';
      if (locale.includes('IN')) return 'INR';
      if (locale.includes('DE') || locale.includes('FR') || locale.includes('IT')) return 'EUR';
    }

    // Default fallback
    return 'USD';
  }
}

export const currencyService = new CurrencyService();
export default currencyService;
