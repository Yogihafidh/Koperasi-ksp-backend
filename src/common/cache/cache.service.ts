import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: any) {}

  async getJson<T>(key: string): Promise<T | null> {
    const cached = await this.cacheManager.get(key);
    if (cached === null || cached === undefined) {
      return null;
    }

    if (typeof cached === 'string') {
      try {
        return JSON.parse(cached) as T;
      } catch {
        return null;
      }
    }

    return cached as T;
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number) {
    const payload = JSON.stringify(value);
    const options = ttlSeconds ? { ttl: ttlSeconds } : undefined;
    await this.cacheManager.set(key, payload, options as never);
  }

  async getString(key: string): Promise<string | null> {
    const cached = await this.cacheManager.get(key);
    if (cached === null || cached === undefined) {
      return null;
    }
    return String(cached);
  }

  async setString(key: string, value: string, ttlSeconds?: number) {
    const options = ttlSeconds ? { ttl: ttlSeconds } : undefined;
    await this.cacheManager.set(key, value, options as never);
  }

  async del(key: string) {
    await this.cacheManager.del(key);
  }
}
