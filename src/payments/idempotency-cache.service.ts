import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class IdempotencyCacheService {
  private readonly logger = new Logger(IdempotencyCacheService.name);

  private readonly redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  constructor() {
    this.redis.on('error', () => {
      this.logger.warn('Redis connection error');
    });
  }

  async getPaymentId(idempotencyKey: string): Promise<string | null> {
    try {
      return await this.redis.get(this.buildKey(idempotencyKey));
    } catch {
      this.logger.warn('Redis unavailable. Falling back to PostgreSQL.');
      return null;
    }
  }

  async savePaymentId(
    idempotencyKey: string,
    paymentId: string,
  ): Promise<void> {
    try {
      await this.redis.set(
        this.buildKey(idempotencyKey),
        paymentId,
        'EX',
        3600,
      );
    } catch {
      this.logger.warn('Could not save idempotency key in Redis.');
    }
  }

  private buildKey(idempotencyKey: string): string {
    return `payment:idempotency:${idempotencyKey}`;
  }
}
