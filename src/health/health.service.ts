import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IdempotencyCacheService } from '../payments/idempotency-cache.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly idempotencyCache: IdempotencyCacheService,
  ) {}

  async readiness() {
    const databaseUp = await this.checkDatabase();
    const redisUp = await this.idempotencyCache.ping();

    return {
      service: process.env.APP_NAME || 'payment-platform',
      version: process.env.APP_VERSION || 'local',
      environment: process.env.NODE_ENV || 'development',
      status: databaseUp ? 'READY' : 'NOT_READY',
      database: databaseUp ? 'UP' : 'DOWN',
      redis: redisUp ? 'UP' : 'DOWN',
      redisRequired: false,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
