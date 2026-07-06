import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
} from '@aws-sdk/client-sqs';
import { SqsConsumerService } from './sqs-consumer.services';
import { PaymentConsumerService } from './payment-consumer.service';

describe('SqsConsumerService', () => {
  let service: SqsConsumerService;
  let paymentConsumer: { consume: jest.Mock };
  let sendMock: jest.Mock;

  const originalEnv = process.env;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };

    paymentConsumer = {
      consume: jest.fn(),
    };
    sendMock = jest.fn();

    service = new SqsConsumerService(
      paymentConsumer as unknown as PaymentConsumerService,
    );
    (service as unknown as { client: { send: jest.Mock } }).client = {
      send: sendMock,
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not schedule polling when disabled', () => {
    process.env.QUEUE_PROVIDER = 'local';
    process.env.PAYMENT_CONSUMER_ENABLED = 'false';
    const setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockImplementation((() => 0) as typeof setInterval);

    service.onModuleInit();

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('schedules polling when sqs consumer is enabled', () => {
    process.env.QUEUE_PROVIDER = 'sqs';
    process.env.PAYMENT_CONSUMER_ENABLED = 'true';
    const setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockImplementation((() => 0) as typeof setInterval);

    service.onModuleInit();

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
  });

  it('returns early when queue url is not configured', async () => {
    delete process.env.SQS_QUEUE_URL;

    await (
      service as unknown as { pollMessages: () => Promise<void> }
    ).pollMessages();

    expect(sendMock).not.toHaveBeenCalled();
    expect(paymentConsumer.consume).not.toHaveBeenCalled();
  });

  it('consumes and deletes valid SQS messages', async () => {
    process.env.SQS_QUEUE_URL =
      'http://localhost:4566/000000000000/payment-events';
    sendMock
      .mockResolvedValueOnce({
        Messages: [
          {
            Body: JSON.stringify({
              eventId: 'event-1',
              eventType: 'PAYMENT_CREATED',
              paymentId: 'payment-1',
              payload: { amountInCents: 1000 },
            }),
            ReceiptHandle: 'receipt-1',
          },
        ],
      })
      .mockResolvedValueOnce({});

    await (
      service as unknown as { pollMessages: () => Promise<void> }
    ).pollMessages();

    expect(sendMock.mock.calls[0][0]).toBeInstanceOf(ReceiveMessageCommand);
    expect(sendMock.mock.calls[0][0].input).toEqual({
      QueueUrl: process.env.SQS_QUEUE_URL,
      MaxNumberOfMessages: 5,
      WaitTimeSeconds: 5,
      VisibilityTimeout: 30,
    });
    expect(paymentConsumer.consume).toHaveBeenCalledWith({
      eventId: 'event-1',
      eventType: 'PAYMENT_CREATED',
      paymentId: 'payment-1',
      payload: { amountInCents: 1000 },
    });
    expect(sendMock.mock.calls[1][0]).toBeInstanceOf(DeleteMessageCommand);
    expect(sendMock.mock.calls[1][0].input).toEqual({
      QueueUrl: process.env.SQS_QUEUE_URL,
      ReceiptHandle: 'receipt-1',
    });
  });

  it('skips messages without body or receipt handle', async () => {
    process.env.SQS_QUEUE_URL =
      'http://localhost:4566/000000000000/payment-events';
    sendMock.mockResolvedValueOnce({
      Messages: [{ Body: '', ReceiptHandle: 'receipt-1' }, { Body: '{}' }],
    });

    await (
      service as unknown as { pollMessages: () => Promise<void> }
    ).pollMessages();

    expect(paymentConsumer.consume).not.toHaveBeenCalled();
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
