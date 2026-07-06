import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { SqsQueueService } from './sqs-queue.service';
import { PaymentMessage } from './payment-message.interface';

describe('SqsQueueService', () => {
  let service: SqsQueueService;
  let sendMock: jest.Mock;

  const originalEnv = process.env;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
    sendMock = jest.fn();

    service = new SqsQueueService();
    (service as unknown as { client: { send: jest.Mock } }).client = {
      send: sendMock,
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws when SQS_QUEUE_URL is missing', async () => {
    delete process.env.SQS_QUEUE_URL;

    await expect(
      service.publish({
        eventId: 'event-1',
        eventType: 'PAYMENT_CREATED',
        paymentId: 'payment-1',
        payload: {},
      }),
    ).rejects.toThrow('SQS_QUEUE_URL is not configured');
  });

  it('publishes message to configured SQS queue', async () => {
    const message: PaymentMessage = {
      eventId: 'event-1',
      eventType: 'PAYMENT_CREATED',
      paymentId: 'payment-1',
      payload: { amountInCents: 1000 },
    };
    process.env.SQS_QUEUE_URL = 'http://localhost:4566/000000000000/payment-events';

    await service.publish(message);

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0]).toBeInstanceOf(SendMessageCommand);
    expect(sendMock.mock.calls[0][0].input).toEqual({
      QueueUrl: process.env.SQS_QUEUE_URL,
      MessageBody: JSON.stringify(message),
    });
  });
});
