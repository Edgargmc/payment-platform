import { DataSource, EntityManager } from 'typeorm';
import { ProcessedMessageService } from './processed-message.service';
import { ProcessedMessage } from './processed-message.entity';

describe('ProcessedMessageService', () => {
  let service: ProcessedMessageService;
  let dataSource: { transaction: jest.Mock };
  let manager: {
    query: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(() => {
    manager = {
      query: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn(
        async (callback: (entityManager: EntityManager) => Promise<boolean>) =>
          callback(manager as unknown as EntityManager),
      ),
    };

    service = new ProcessedMessageService(dataSource as unknown as DataSource);
  });

  it('does not execute the callback when the message was already processed', async () => {
    manager.findOne.mockResolvedValue({
      id: '1',
      messageId: 'event-1',
    } as ProcessedMessage);
    const callback = jest.fn();

    await expect(service.executeOnce('event-1', callback)).resolves.toBe(false);

    expect(manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock($1, $2)',
      [expect.any(Number), expect.any(Number)],
    );
    expect(manager.findOne).toHaveBeenCalledWith(ProcessedMessage, {
      where: { messageId: 'event-1' },
    });
    expect(callback).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('executes the callback and stores the marker in the same transaction', async () => {
    manager.findOne.mockResolvedValue(null);
    const entity = { messageId: 'event-2' } as ProcessedMessage;
    manager.create.mockReturnValue(entity);
    const callback = jest.fn().mockResolvedValue(undefined);

    await expect(service.executeOnce('event-2', callback)).resolves.toBe(true);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(manager.create).toHaveBeenCalledWith(ProcessedMessage, {
      messageId: 'event-2',
    });
    expect(manager.save).toHaveBeenCalledWith(entity);
  });

  it('derives the same advisory lock keys for the same event id', async () => {
    manager.findOne.mockResolvedValue(null);
    manager.create.mockReturnValue({ messageId: 'event-3' });
    const callback = jest.fn().mockResolvedValue(undefined);

    await service.executeOnce('event-3', callback);
    await service.executeOnce('event-3', callback);

    const firstKeys = manager.query.mock.calls[0][1] as number[];
    const secondKeys = manager.query.mock.calls[1][1] as number[];

    expect(secondKeys).toEqual(firstKeys);
  });

  it('propagates callback errors without storing the marker', async () => {
    manager.findOne.mockResolvedValue(null);
    const error = new Error('provider failed');

    await expect(
      service.executeOnce('event-4', async () => Promise.reject(error)),
    ).rejects.toBe(error);

    expect(manager.save).not.toHaveBeenCalled();
  });

  it('propagates PostgreSQL errors', async () => {
    const error = new Error('database unavailable');
    manager.query.mockRejectedValue(error);

    await expect(service.executeOnce('event-5', jest.fn())).rejects.toBe(error);
    expect(manager.findOne).not.toHaveBeenCalled();
  });
});
