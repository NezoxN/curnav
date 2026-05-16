import { Redis } from 'ioredis';

let redisClient: Redis | null = null;

export const getRedis = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL!, {
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('[Redis] Max retries reached, giving up on connection attempt');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on('connect', () => console.log('[Redis] Connected'));
    redisClient.on('error', (err) => console.warn('[Redis] Error:', err.message));
  }

  return redisClient;
};

export const TTL = {
  DASHBOARD: 5 * 60,
  RECORDS: 5 * 60,
  COURSES: 60 * 60,
  SETTINGS: 60 * 60,
  JWT_BLACKLIST: 24 * 60 * 60,
  PASSWORD_RESET: 60 * 60,
  RECOMMENDATIONS: 10 * 60,
};
