import { PaymentConsumerService } from './payment-consumer.service';
import { PaymentProcessorService } from './payment-processor.service';
import { PaymentMessage } from './payment-message.interface';
import { ProcessedMessageService } from './processed-message.service';

describe('PaymentConsumerService', () => {
  let service: PaymentConsumerService;
  let paymentProcessor: { processPaymentCreated: jest.Mock };
  let processedMessageService: {
    wasProcessed: jest.Mock;
    markAsProcessed: jest.Mock;
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
      wasProcessed: jest.fn().mockResolvedValue(false),
      markAsProcessed: jest.fn(),
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
    expect(processedMessageService.wasProcessed).not.toHaveBeenCalled();
  });

  it('processes PAYMENT_CREATED when consumer is enabled', async () => {
    process.env.PAYMENT_CONSUMER_ENABLED = 'true';

    await service.consume(message);

    expect(processedMessageService.wasProcessed).toHaveBeenCalledWith(
      message.eventId,
    );
    expect(paymentProcessor.processPaymentCreated).toHaveBeenCalledWith(
      message.paymentId,
      message.correlationId,
    );
    expect(processedMessageService.markAsProcessed).toHaveBeenCalledWith(
      message.eventId,
    );
  });

  it('ignores duplicated messages', async () => {
    process.env.PAYMENT_CONSUMER_ENABLED = 'true';
    processedMessageService.wasProcessed.mockResolvedValue(true);

    await service.consume(message);

    expect(paymentProcessor.processPaymentCreated).not.toHaveBeenCalled();
    expect(processedMessageService.markAsProcessed).not.toHaveBeenCalled();
  });

  it('ignores unsupported event types', async () => {
    process.env.PAYMENT_CONSUMER_ENABLED = 'true';

    await service.consume({
      ...message,
      eventType: 'PAYMENT_CANCELLED',
    });

    expect(paymentProcessor.processPaymentCreated).not.toHaveBeenCalled();
    expect(processedMessageService.markAsProcessed).not.toHaveBeenCalled();
  });

  it('should process the same eventId only once under concurrent consumption', async () => {
    process.env.PAYMENT_CONSUMER_ENABLED = 'true';

    await Promise.all([service.consume(message), service.consume(message)]);

    expect(paymentProcessor.processPaymentCreated).toHaveBeenCalledTimes(1);
  });
});
