import { redisGet, redisSet } from '../config/redis';

// Hardcoded fallback rates (to base currency INR)
const FALLBACK_RATES: Record<string, Record<string, number>> = {
  USD: { INR: 83.5 },
  EUR: { INR: 91.0 },
  GBP: { INR: 106.0 },
  INR: { USD: 1 / 83.5, EUR: 1 / 91.0, GBP: 1 / 106.0 },
};

/**
 * Fetch the exchange rate from `fromCurrency` to `toCurrency`.
 * Uses Redis cache (1-hour TTL) and falls back to hardcoded rates on failure.
 */
export async function fetchExchangeRate(
  from: string,
  to: string
): Promise<number> {
  // Same currency — rate is 1
  if (from.toUpperCase() === to.toUpperCase()) {
    return 1;
  }

  const cacheKey = `exchange_rate:${from.toUpperCase()}:${to.toUpperCase()}`;

  // 1. Try Redis cache
  const cached = await redisGet(cacheKey);
  if (cached) {
    const rate = parseFloat(cached);
    if (!isNaN(rate)) {
      return rate;
    }
  }

  // 2. Try the ExchangeRate API
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  const apiUrl = process.env.EXCHANGE_RATE_API_URL || 'https://v6.exchangerate-api.com/v6';

  if (apiKey) {
    try {
      const url = `${apiUrl}/${apiKey}/pair/${from.toUpperCase()}/${to.toUpperCase()}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json() as {
          result: string;
          conversion_rate?: number;
        };

        if (data.result === 'success' && data.conversion_rate) {
          const rate = data.conversion_rate;

          // Cache in Redis for 1 hour (3600 seconds)
          await redisSet(cacheKey, rate.toString(), 3600);

          return rate;
        }
      }
    } catch (error) {
      console.warn(
        `⚠️  Exchange rate API failed for ${from}→${to}, using fallback:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  // 3. Fallback to hardcoded rates
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  if (FALLBACK_RATES[fromUpper] && FALLBACK_RATES[fromUpper][toUpper]) {
    return FALLBACK_RATES[fromUpper][toUpper];
  }

  // If no fallback exists, return 1 and warn
  console.warn(
    `⚠️  No exchange rate available for ${from}→${to}, defaulting to 1.0`
  );
  return 1;
}
