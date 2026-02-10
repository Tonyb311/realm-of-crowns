import Redis from 'ioredis';

let redis: Redis | null = null;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null; // stop retrying after 5 attempts
      return Math.min(times * 200, 2000);
    },
  });

  redis.on('connect', () => {
    console.log('[Redis] Connected');
  });

  redis.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });

  redis.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...');
  });
} else {
  console.log('[Redis] REDIS_URL not set — running without Redis');
}

export { redis };

export async function invalidateCache(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.error('[Redis] Cache invalidation error:', err);
  }
}
