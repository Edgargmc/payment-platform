import { Repository } from 'typeorm';
import { ProcessedMessageService } from './processed-message.service';
import { ProcessedMessage } from './processed-message.entity';

describe('ProcessedMessageService', () => {
  let service: ProcessedMessageService;
  let repository: jest.Mocked<Repository<ProcessedMessage>>;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<ProcessedMessage>>;

    service = new ProcessedMessageService(repository);
  });

  it('returns true when the message was already processed', async () => {
    repository.findOne.mockResolvedValue({
      id: '1',
      messageId: 'event-1',
    } as ProcessedMessage);

    await expect(service.wasProcessed('event-1')).resolves.toBe(true);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { messageId: 'event-1' },
    });
  });

  it('returns false when the message was not processed yet', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.wasProcessed('event-2')).resolves.toBe(false);
  });

  it('creates and saves a processed message marker', async () => {
    const entity = { messageId: 'event-3' } as ProcessedMessage;
    repository.create.mockReturnValue(entity);

    await service.markAsProcessed('event-3');

    expect(repository.create).toHaveBeenCalledWith({
      messageId: 'event-3',
    });
    expect(repository.save).toHaveBeenCalledWith(entity);
  });

  it('swallows duplicate save errors when the marker already exists', async () => {
    repository.create.mockReturnValue({
      messageId: 'event-4',
    } as ProcessedMessage);
    repository.save.mockRejectedValue(new Error('duplicate'));

    await expect(service.markAsProcessed('event-4')).resolves.toBeUndefined();
  });
});
