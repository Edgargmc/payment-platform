import { Injectable, Logger } from '@nestjs/common';
import { PaymentMessage } from './payment-message.interface';
import { PaymentProcessorService } from './payment-processor.service';
import { ProcessedMessageService } from './processed-message.service';

@Injectable()
export class PaymentConsumerService {
  private readonly logger = new Logger(PaymentConsumerService.name);

  constructor(
    private readonly paymentProcessor: PaymentProcessorService,
    private readonly processedMessageService: ProcessedMessageService,
  ) {}

  async consume(message: PaymentMessage): Promise<void> {
    const consumerEnabled = process.env.PAYMENT_CONSUMER_ENABLED === 'true';

    if (!consumerEnabled) {
      this.logger.log('Payment consumer disabled');
      return;
    }

    const alreadyProcessed = await this.processedMessageService.wasProcessed(
      message.eventId,
    );

    if (alreadyProcessed) {
      this.logger.warn(`Duplicated message ignored: ${message.eventId}`);
      return;
    }

    this.logger.log(
      `Consuming message ${message.eventId} | paymentId=${message.paymentId} | correlationId=${message.correlationId}`,
    );

    if (message.eventType === 'PAYMENT_CREATED') {
      await this.paymentProcessor.processPaymentCreated(
        message.paymentId,
        message.correlationId,
      );
      await this.processedMessageService.markAsProcessed(message.eventId);
      return;
    }

    this.logger.warn(`No consumer handler found for ${message.eventType}`);
  }
}
