import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: { readiness: jest.Mock };

  const originalEnv = process.env;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };

    healthService = {
      readiness: jest.fn(),
    };

    controller = new HealthController(
      healthService as unknown as HealthService,
    );
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns health information', () => {
    process.env.APP_NAME = 'payments-api';
    process.env.APP_VERSION = '9.9.9';
    process.env.NODE_ENV = 'test';
    jest.spyOn(process, 'uptime').mockReturnValue(123.45);

    const result = controller.health();

    expect(result).toEqual(
      expect.objectContaining({
        status: 'OK',
        service: 'payments-api',
        version: '9.9.9',
        environment: 'test',
        uptime: 123.45,
      }),
    );
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('delegates readiness to service', async () => {
    const readiness = { status: 'READY' };
    healthService.readiness.mockResolvedValue(readiness);

    await expect(controller.readiness()).resolves.toBe(readiness);
    expect(healthService.readiness).toHaveBeenCalledTimes(1);
  });
});
