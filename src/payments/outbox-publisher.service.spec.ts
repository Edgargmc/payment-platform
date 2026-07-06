import { DataSource } from 'typeorm';
import { OutboxPublisherService } from './outbox-publisher.service';
import { OutboxEventStatus } from './outbox-event.entity';
import { QueuePort } from './queue.interface';

describe('OutboxPublisherService', () => {
  let service: OutboxPublisherService;
  let dataSource: { transaction: jest.Mock };
  let queuePort: { publish: jest.Mock };

  const originalEnv = process.env;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };

    dataSource = {
      transaction: jest.fn(),
    };

    queuePort = {
      publish: jest.fn(),
    };

    service = new OutboxPublisherService(
      dataSource as unknown as DataSource,
      queuePort as unknown as QueuePort,
    );
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not schedule polling when publisher is disabled', () => {
    process.env.OUTBOX_PUBLISHER_ENABLED = 'false';
    const setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockImplementation((() => 0) as typeof setInterval);

    service.onModuleInit();

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('schedules polling when publisher is enabled', () => {
    process.env.OUTBOX_PUBLISHER_ENABLED = 'true';
    const setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockImplementation((() => 0) as typeof setInterval);

    service.onModuleInit();

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
  });

  it('publishes pending outbox events and marks them as processed', async () => {
    const event = {
      id: 'event-1',
      eventType: 'PAYMENT_CREATED',
      aggregateId: 'payment-1',
      payload: { amountInCents: 1000 },
    };
    const manager = {
      query: jest
        .fn()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined),
    };

    dataSource.transaction.mockImplementation(
      async (callback: (entityManager: typeof manager) => Promise<void>) =>
        callback(manager),
    );

    await service.processPendingEvents();

    expect(queuePort.publish).toHaveBeenCalledWith({
      eventId: event.id,
      eventType: event.eventType,
      paymentId: event.aggregateId,
      payload: event.payload,
    });
    expect(manager.query).toHaveBeenNthCalledWith(2, expect.any(String), [
      OutboxEventStatus.PROCESSING,
      event.id,
    ]);
    expect(manager.query).toHaveBeenNthCalledWith(3, expect.any(String), [
      OutboxEventStatus.PROCESSED,
      event.id,
    ]);
  });
});
