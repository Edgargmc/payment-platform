import { HealthService } from './health.service';
import { DataSource } from 'typeorm';
import { IdempotencyCacheService } from '../payments/idempotency-cache.service';

describe('HealthService', () => {
  let service: HealthService;
  let dataSource: { query: jest.Mock };
  let idempotencyCache: { ping: jest.Mock };

  const originalEnv = process.env;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };

    dataSource = {
      query: jest.fn(),
    };

    idempotencyCache = {
      ping: jest.fn(),
    };

    service = new HealthService(
      dataSource as unknown as DataSource,
      idempotencyCache as unknown as IdempotencyCacheService,
    );
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns READY when database is up', async () => {
    process.env.APP_NAME = 'payments-api';
    process.env.APP_VERSION = '1.2.3';
    process.env.NODE_ENV = 'test';
    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);
    idempotencyCache.ping.mockResolvedValue(true);

    const result = await service.readiness();

    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    expect(idempotencyCache.ping).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        service: 'payments-api',
        version: '1.2.3',
        environment: 'test',
        status: 'READY',
        database: 'UP',
        redis: 'UP',
        redisRequired: false,
      }),
    );
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('returns NOT_READY when database is down', async () => {
    delete process.env.APP_NAME;
    delete process.env.APP_VERSION;
    delete process.env.NODE_ENV;
    dataSource.query.mockRejectedValue(new Error('db down'));
    idempotencyCache.ping.mockResolvedValue(false);

    const result = await service.readiness();

    expect(result).toEqual(
      expect.objectContaining({
        service: 'payment-platform',
        version: 'local',
        environment: 'development',
        status: 'NOT_READY',
        database: 'DOWN',
        redis: 'DOWN',
      }),
    );
  });
});
