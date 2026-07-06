import { Injectable, Logger } from '@nestjs/common';

import { PaymentMessage } from './payment-message.interface';
import { QueuePort } from './queue.interface';
import { PaymentProcessorService } from './payment-processor-service';

@Injectable()
export class LocalQueueService implements QueuePort {
  private readonly logger = new Logger(LocalQueueService.name);

  constructor(private readonly paymentProcessor: PaymentProcessorService) {}

  async publish(message: PaymentMessage): Promise<void> {
    this.logger.log(
      `Publishing local message ${message.eventId} with type ${message.eventType}`,
    );

    if (message.eventType === 'PAYMENT_CREATED') {
      await this.paymentProcessor.processPaymentCreated(message.paymentId);
      return;
    }

    this.logger.warn(`No handler found for event type ${message.eventType}`);
  }
}
