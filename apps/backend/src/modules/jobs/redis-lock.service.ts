import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';

// Token used to inject the raw ioredis client from BullMQ's connection
export const REDIS_CLIENT = 'REDIS_CLIENT';

@Injectable()
export class RedisLockService {
  constructor(
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  /**
   * Acquire a distributed lock via SET NX EX.
   * Returns true if the lock was acquired, false if already held.
   */
  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(
      `lock:${key}`,
      '1',
      'EX',
      ttlSeconds,
      'NX',
    );
    return result === 'OK';
  }

  async releaseLock(key: string): Promise<void> {
    await this.redis.del(`lock:${key}`);
  }
}
