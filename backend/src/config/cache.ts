import { getRedis } from './redis';

const buildKey = (prefix: string, id?: string): string => {
  return id ? `${prefix}:${id}` : `${prefix}`;
};

export const cache = {
  async get<T>(prefix: string, id?: string): Promise<T | null> {
    try {
      const key = buildKey(prefix, id);
      const data = await getRedis().get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  },

  async set(prefix: string, value: unknown, ttl: number, id?: string): Promise<void> {
    try {
      const key = buildKey(prefix, id);
      await getRedis().set(key, JSON.stringify(value), 'EX', ttl);
    } catch {
    }
  },


  async del(prefix: string, id?: string): Promise<void> {
    try {
      const key = buildKey(prefix, id);
      await getRedis().del(key);
    } catch {
    }
  },

  async delPattern(prefix: string): Promise<void> {
    try {
      const pattern = `${prefix}:*`;
      const keys = await getRedis().keys(pattern);
      if (keys.length > 0) {
        await getRedis().del(...keys);
      }
    } catch {
    }
  },

  async setFlag(key: string, ttl: number): Promise<void> {
    try {
      await getRedis().set(key, '1', 'EX', ttl);
    } catch {
    }
  },

  async hasFlag(key: string): Promise<boolean> {
    try {
      const val = await getRedis().exists(key);
      return val === 1;
    } catch {
      return false;
    }
  },

  async delFlag(key: string): Promise<void> {
    try {
      await getRedis().del(key);
    } catch {
    }
  },
};
