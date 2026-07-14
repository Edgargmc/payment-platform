import { PaymentConsumerService } from './payment-consumer.service';
import { PaymentProcessorService } from './payment-processor.service';
import { PaymentMessage } from './payment-message.interface';
import { ProcessedMessageService } from './processed-message.service';

describe('PaymentConsumerService', () => {
  let service: PaymentConsumerService;
  let paymentProcessor: { processPaymentCreated: jest.Mock };
  let processedMessageService: {
    executeOnce: jest.Mock;
  };

  const originalEnv = process.env;
  const message: PaymentMessage = {
    eventId: 'event-1',
    correlationId: 'corr-1',
    eventType: 'PAYMENT_CREATED',
    paymentId: 'payment-1',
    payload: {},
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };

    paymentProcessor = {
      processPaymentCreated: jest.fn(),
    };
    processedMessageService = {
      executeOnce: jest
        .fn()
        .mockImplementation(
          async (_eventId: string, callback: () => Promise<void>) => {
            await callback();
            return true;
          },
        ),
    };

    service = new PaymentConsumerService(
      paymentProcessor as unknown as PaymentProcessorService,
      processedMessageService as unknown as ProcessedMessageService,
    );
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does nothing when consumer is disabled', async () => {
    process.env.PAYMENT_CONSUMER_ENABLED = 'false';

    await service.consume(message);

    expect(paymentProcessor.processPaymentCreated).not.toHaveBeenCalled();
    expect(processedMessageService.executeOnce).not.toHaveBeenCalled();
  });

  it('processes PAYMENT_CREATED when consumer is enabled', async () => {
    process.env.PAYMENT_CONSUMER_ENABLED = 'true';

    await service.consume(message);

    expect(processedMessageService.executeOnce).toHaveBeenCalledWith(
      message.eventId,
      expect.any(Function),
    );
    expect(paymentProcessor.processPaymentCreated).toHaveBeenCalledWith(
      message.paymentId,
      message.correlationId,
    );
  });

  it('ignores duplicated messages', async () => {
    process.env.PAYMENT_CONSUMER_ENABLED = 'true';
    processedMessageService.executeOnce.mockResolvedValue(false);

    await service.consume(message);

    expect(paymentProcessor.processPaymentCreated).not.toHaveBeenCalled();
  });

  it('ignores unsupported event types', async () => {
    process.env.PAYMENT_CONSUMER_ENABLED = 'true';

    await service.consume({
      ...message,
      eventType: 'PAYMENT_CANCELLED',
    });

    expect(paymentProcessor.processPaymentCreated).not.toHaveBeenCalled();
    expect(processedMessageService.executeOnce).not.toHaveBeenCalled();
  });

  it('should process the same eventId only once under concurrent consumption', async () => {
    process.env.PAYMENT_CONSUMER_ENABLED = 'true';
    let processed = false;
    let previousExecution = Promise.resolve();

    processedMessageService.executeOnce.mockImplementation(
      async (_eventId: string, callback: () => Promise<void>) => {
        const waitForPrevious = previousExecution;
        let releaseExecution!: () => void;
        previousExecution = new Promise<void>((resolve) => {
          releaseExecution = resolve;
        });

        await waitForPrevious;

        try {
          if (processed) {
            return false;
          }

          await callback();
          processed = true;
          return true;
        } finally {
          releaseExecution();
        }
      },
    );

    await Promise.all([service.consume(message), service.consume(message)]);

    expect(paymentProcessor.processPaymentCreated).toHaveBeenCalledTimes(1);
  });
});
