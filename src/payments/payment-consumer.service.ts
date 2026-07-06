import { Injectable, Logger } from '@nestjs/common';
import { PaymentMessage } from './payment-message.interface';
import { PaymentProcessorService } from './payment-processor.service';


@Injectable()
export class PaymentConsumerService {
  private readonly logger = new Logger(PaymentConsumerService.name);

  constructor(private readonly paymentProcessor: PaymentProcessorService) {}

  async consume(message: PaymentMessage): Promise<void> {
    const consumerEnabled = process.env.PAYMENT_CONSUMER_ENABLED === 'true';

    if (!consumerEnabled) {
      this.logger.log('Payment consumer disabled');
      return;
    }

    this.logger.log(
      `Consuming message ${message.eventId} with type ${message.eventType}`,
    );

    if (message.eventType === 'PAYMENT_CREATED') {
      await this.paymentProcessor.processPaymentCreated(message.paymentId);
      return;
    }

    this.logger.warn(`No consumer handler found for ${message.eventType}`);
  }
}
