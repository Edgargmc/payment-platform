import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class IdempotencyCacheService {
  private readonly logger = new Logger(IdempotencyCacheService.name);
  private readonly redis = new Redis({
    host: 'localhost',
    port: 6379,
    lazyConnect: true,
  });

  async getPaymentId(idempotencyKey: string): Promise<string | null> {
    try {
      const key = this.buildKey(idempotencyKey);
      return await this.redis.get(key);
    } catch (error) {
      this.logger.warn('Redis unavailable. Falling back to PostgreSQL.');
      return null;
    }
  }

  async savePaymentId(
    idempotencyKey: string,
    paymentId: string,
  ): Promise<void> {
    try {
      const key = this.buildKey(idempotencyKey);

      await this.redis.set(
        key,
        paymentId,
        'EX',
        60 * 60, // 1 hour
      );
    } catch (error) {
      this.logger.warn('Could not save idempotency key in Redis.');
    }
  }

  private buildKey(idempotencyKey: string): string {
    return `payment:idempotency:${idempotencyKey}`;
  }
}
