import { Injectable, Logger } from '@nestjs/common';
import { PaymentMessage } from './payment-message.interface';
import { QueuePort } from './queue.interface';
import { PaymentConsumerService } from './payment-consumer.service';

@Injectable()
export class LocalQueueService implements QueuePort {
  private readonly logger = new Logger(LocalQueueService.name);

  constructor(private readonly paymentConsumer: PaymentConsumerService) {}

  async publish(message: PaymentMessage): Promise<void> {
    this.logger.log(
      `Publishing local message ${message.eventId} with type ${message.eventType}`,
    );

    await this.paymentConsumer.consume(message);
  }
}
