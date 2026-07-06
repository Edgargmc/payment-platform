import { LocalQueueService } from './local-queue.service';
import { PaymentConsumerService } from './payment-consumer.service';
import { PaymentMessage } from './payment-message.interface';

describe('LocalQueueService', () => {
  let service: LocalQueueService;
  let paymentConsumer: { consume: jest.Mock };

  beforeEach(() => {
    paymentConsumer = {
      consume: jest.fn(),
    };

    service = new LocalQueueService(
      paymentConsumer as unknown as PaymentConsumerService,
    );
  });

  it('delegates message consumption immediately', async () => {
    const message: PaymentMessage = {
      eventId: 'event-1',
      eventType: 'PAYMENT_CREATED',
      paymentId: 'payment-1',
      payload: { amountInCents: 1000 },
    };

    await service.publish(message);

    expect(paymentConsumer.consume).toHaveBeenCalledWith(message);
  });
});
