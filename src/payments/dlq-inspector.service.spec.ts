import {
  GetQueueUrlCommand,
  ReceiveMessageCommand,
} from '@aws-sdk/client-sqs';
import { DlqInspectorService } from './dlq-inspector.service';

describe('DlqInspectorService', () => {
  let service: DlqInspectorService;
  let sendMock: jest.Mock;

  const originalEnv = process.env;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
    sendMock = jest.fn();

    service = new DlqInspectorService();
    (service as unknown as { client: { send: jest.Mock } }).client = {
      send: sendMock,
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns DLQ_NOT_FOUND when queue url cannot be resolved', async () => {
    process.env.SQS_QUEUE_NAME = 'payment-events';
    sendMock.mockResolvedValueOnce({ QueueUrl: undefined });

    await expect(service.peekMessages()).resolves.toEqual({
      status: 'DLQ_NOT_FOUND',
      messages: [],
    });
    expect(sendMock.mock.calls[0][0]).toBeInstanceOf(GetQueueUrlCommand);
    expect(sendMock.mock.calls[0][0].input).toEqual({
      QueueName: 'payment-events-dlq',
    });
  });

  it('returns messages from the DLQ when it exists', async () => {
    process.env.SQS_QUEUE_NAME = 'payment-events';
    sendMock
      .mockResolvedValueOnce({
        QueueUrl: 'http://localhost:4566/000000000000/payment-events-dlq',
      })
      .mockResolvedValueOnce({
        Messages: [
          {
            MessageId: 'message-1',
            Body: '{"eventId":"event-1"}',
          },
        ],
      });

    await expect(service.peekMessages()).resolves.toEqual({
      status: 'OK',
      count: 1,
      messages: [
        {
          messageId: 'message-1',
          body: '{"eventId":"event-1"}',
        },
      ],
    });
    expect(sendMock.mock.calls[1][0]).toBeInstanceOf(ReceiveMessageCommand);
    expect(sendMock.mock.calls[1][0].input).toEqual({
      QueueUrl: 'http://localhost:4566/000000000000/payment-events-dlq',
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 1,
      VisibilityTimeout: 5,
    });
  });
});
