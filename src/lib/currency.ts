import { Currency } from './i18n';

const CACHE_KEY = 'hive-currency-rates';
const DAY_MS = 24 * 60 * 60 * 1000;

const FALLBACK_RATES: Record<Currency, number> = {
  RUB: 1,
};

type CachedRates = {
  timestamp: number;
  rates: Record<Currency, number>;
};

export const getCachedRates = (): Record<Currency, number> => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return FALLBACK_RATES;

    const parsed = JSON.parse(cached) as CachedRates;
    if (!parsed?.timestamp || !parsed?.rates) return FALLBACK_RATES;

    return parsed.rates;
  } catch {
    return FALLBACK_RATES;
  }
};

export const refreshCurrencyRates = async (): Promise<Record<Currency, number>> => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as CachedRates;
      if (parsed?.timestamp && Date.now() - parsed.timestamp < DAY_MS && parsed.rates) {
        return parsed.rates;
      }
    }

    const response = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=RUB');
    const data = await response.json();
    const rates: Record<Currency, number> = {
      RUB: Number(data?.rates?.RUB) || FALLBACK_RATES.RUB,
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), rates }));
    return rates;
  } catch {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), rates: FALLBACK_RATES }));
    return FALLBACK_RATES;
  }
};

export const formatCurrency = (amount: number, currency: Currency, rates: Record<Currency, number>): string => {
  const converted = amount * (rates[currency] || 1);

  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(converted);
};
