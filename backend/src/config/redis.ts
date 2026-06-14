import Redis from 'ioredis';

let redisClient: Redis | null = null;
let isRedisAvailable = false;

try {
  redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      if (times > 3) {
        console.warn('⚠️  Redis: Max retries reached, giving up reconnection');
        return null; // Stop retrying
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redisClient.on('connect', () => {
    isRedisAvailable = true;
    console.log('✅ Redis connected successfully');
  });

  redisClient.on('error', (err: Error) => {
    isRedisAvailable = false;
    console.warn('⚠️  Redis error (app will work without cache):', err.message);
  });

  redisClient.on('close', () => {
    isRedisAvailable = false;
  });

  // Attempt to connect (non-blocking)
  redisClient.connect().catch((err: Error) => {
    isRedisAvailable = false;
    console.warn('⚠️  Redis not available (app will work without cache):', err.message);
  });
} catch (err) {
  console.warn('⚠️  Redis initialization failed (app will work without cache)');
  redisClient = null;
  isRedisAvailable = false;
}

/**
 * Safe wrapper to get a value from Redis.
 * Returns null if Redis is unavailable.
 */
export async function redisGet(key: string): Promise<string | null> {
  if (!redisClient || !isRedisAvailable) return null;
  try {
    return await redisClient.get(key);
  } catch {
    return null;
  }
}

/**
 * Safe wrapper to set a value in Redis with optional TTL in seconds.
 * Silently fails if Redis is unavailable.
 */
export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (!redisClient || !isRedisAvailable) return;
  try {
    if (ttlSeconds) {
      await redisClient.set(key, value, 'EX', ttlSeconds);
    } else {
      await redisClient.set(key, value);
    }
  } catch {
    // Silently fail — caching is optional
  }
}

export { redisClient, isRedisAvailable };
export default redisClient;
