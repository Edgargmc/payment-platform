import { PaymentConsumerService } from './payment-consumer.service';
import { PaymentProcessorService } from './payment-processor.service';
import { PaymentMessage } from './payment-message.interface';

describe('PaymentConsumerService', () => {
  let service: PaymentConsumerService;
  let paymentProcessor: { processPaymentCreated: jest.Mock };

  const originalEnv = process.env;
  const message: PaymentMessage = {
    eventId: 'event-1',
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

    service = new PaymentConsumerService(
      paymentProcessor as unknown as PaymentProcessorService,
    );
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does nothing when consumer is disabled', async () => {
    process.env.PAYMENT_CONSUMER_ENABLED = 'false';

    await service.consume(message);

    expect(paymentProcessor.processPaymentCreated).not.toHaveBeenCalled();
  });

  it('processes PAYMENT_CREATED when consumer is enabled', async () => {
    process.env.PAYMENT_CONSUMER_ENABLED = 'true';

    await service.consume(message);

    expect(paymentProcessor.processPaymentCreated).toHaveBeenCalledWith(
      message.paymentId,
    );
  });

  it('ignores unsupported event types', async () => {
    process.env.PAYMENT_CONSUMER_ENABLED = 'true';

    await service.consume({
      ...message,
      eventType: 'PAYMENT_CANCELLED',
    });

    expect(paymentProcessor.processPaymentCreated).not.toHaveBeenCalled();
  });
});
