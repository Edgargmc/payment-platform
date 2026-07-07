import { IdempotencyCacheService } from './idempotency-cache.service';

describe('IdempotencyCacheService', () => {
  let service: IdempotencyCacheService;
  let redisMock: {
    on: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
    ping: jest.Mock;
  };

  beforeEach(() => {
    jest.restoreAllMocks();

    service = new IdempotencyCacheService();
    redisMock = {
      on: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      ping: jest.fn(),
    };

    (service as unknown as { redis: typeof redisMock }).redis = redisMock;
  });

  it('returns cached payment id from redis', async () => {
    redisMock.get.mockResolvedValue('payment-1');

    await expect(service.getPaymentId('idem-1')).resolves.toBe('payment-1');
    expect(redisMock.get).toHaveBeenCalledWith('payment:idempotency:idem-1');
  });

  it('returns null when redis get fails', async () => {
    redisMock.get.mockRejectedValue(new Error('redis down'));

    await expect(service.getPaymentId('idem-2')).resolves.toBeNull();
  });

  it('stores payment id with ttl in redis', async () => {
    await service.savePaymentId('idem-3', 'payment-3');

    expect(redisMock.set).toHaveBeenCalledWith(
      'payment:idempotency:idem-3',
      'payment-3',
      'EX',
      3600,
    );
  });

  it('swallows redis save failures', async () => {
    redisMock.set.mockRejectedValue(new Error('redis down'));

    await expect(
      service.savePaymentId('idem-4', 'payment-4'),
    ).resolves.toBeUndefined();
  });

  it('returns true when redis ping responds with PONG', async () => {
    redisMock.ping.mockResolvedValue('PONG');

    await expect(service.ping()).resolves.toBe(true);
  });

  it('returns false when redis ping fails', async () => {
    redisMock.ping.mockRejectedValue(new Error('redis down'));

    await expect(service.ping()).resolves.toBe(false);
  });
});
