import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
} from '@aws-sdk/client-sqs';
import { QueueBootstrapService } from './queue-bootstrap.service';

describe('QueueBootstrapService', () => {
  let service: QueueBootstrapService;
  let sendMock: jest.Mock;

  const originalEnv = process.env;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
    sendMock = jest.fn();

    service = new QueueBootstrapService();
    (service as unknown as { client: { send: jest.Mock } }).client = {
      send: sendMock,
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does nothing when queue provider is not sqs', async () => {
    process.env.QUEUE_PROVIDER = 'local';

    await service.onModuleInit();

    expect(sendMock).not.toHaveBeenCalled();
  });

  it('creates main queue and DLQ when queue provider is sqs', async () => {
    process.env.QUEUE_PROVIDER = 'sqs';
    process.env.SQS_QUEUE_NAME = 'payment-events';
    sendMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        QueueUrl: 'http://localhost:4566/queue/payment-events-dlq',
      })
      .mockResolvedValueOnce({
        Attributes: {
          QueueArn: 'arn:aws:sqs:us-east-1:000000000000:payment-events-dlq',
        },
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        QueueUrl: 'http://localhost:4566/queue/payment-events',
      });

    await service.onModuleInit();

    expect(sendMock).toHaveBeenCalledTimes(5);
    expect(sendMock.mock.calls[0][0]).toBeInstanceOf(CreateQueueCommand);
    expect(sendMock.mock.calls[0][0].input).toEqual({
      QueueName: 'payment-events-dlq',
    });
    expect(sendMock.mock.calls[1][0]).toBeInstanceOf(GetQueueUrlCommand);
    expect(sendMock.mock.calls[1][0].input).toEqual({
      QueueName: 'payment-events-dlq',
    });
    expect(sendMock.mock.calls[2][0]).toBeInstanceOf(GetQueueAttributesCommand);
    expect(sendMock.mock.calls[2][0].input).toEqual({
      QueueUrl: 'http://localhost:4566/queue/payment-events-dlq',
      AttributeNames: ['QueueArn'],
    });
    expect(sendMock.mock.calls[3][0]).toBeInstanceOf(CreateQueueCommand);
    expect(sendMock.mock.calls[3][0].input).toEqual({
      QueueName: 'payment-events',
      Attributes: {
        RedrivePolicy: JSON.stringify({
          deadLetterTargetArn:
            'arn:aws:sqs:us-east-1:000000000000:payment-events-dlq',
          maxReceiveCount: '3',
        }),
      },
    });
    expect(sendMock.mock.calls[4][0]).toBeInstanceOf(GetQueueUrlCommand);
    expect(sendMock.mock.calls[4][0].input).toEqual({
      QueueName: 'payment-events',
    });
    expect(process.env.SQS_QUEUE_URL).toBe(
      'http://localhost:4566/queue/payment-events',
    );
    expect(process.env.SQS_DLQ_URL).toBe(
      'http://localhost:4566/queue/payment-events-dlq',
    );
  });
});
