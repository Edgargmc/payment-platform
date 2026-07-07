import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Payment } from './payment.entity';
import { OutboxEvent } from './outbox-event.entity';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

import { OutboxPublisherService } from './outbox-publisher.service';
import { ProviderConnectorService } from './provider-connector.service';
import { IdempotencyCacheService } from './idempotency-cache.service';
import { PaymentProcessorService } from './payment-processor.service';
import { LocalQueueService } from './local-queue.service';
import { SqsQueueService } from './sqs-queue.service';
import { QUEUE_PORT } from './queue.constants';
import { PaymentConsumerService } from './payment-consumer.service';
import { QueueBootstrapService } from './queue-bootstrap.service';
import { SqsConsumerService } from './sqs-consumer.services';
import { DlqInspectorService } from './dlq-inspector.service';
import { ProcessedMessage } from './processed-message.entity';
import { ProcessedMessageService } from './processed-message.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, OutboxEvent, ProcessedMessage])],

  controllers: [PaymentsController],

  providers: [
    PaymentsService,
    OutboxPublisherService,
    ProviderConnectorService,
    IdempotencyCacheService,
    PaymentProcessorService,
    LocalQueueService,
    SqsQueueService,
    PaymentConsumerService,
    QueueBootstrapService,
    SqsConsumerService,
    DlqInspectorService,
    ProcessedMessageService,
    {
      provide: QUEUE_PORT,
      useFactory: (
        localQueueService: LocalQueueService,
        sqsQueueService: SqsQueueService,
      ) => {
        return process.env.QUEUE_PROVIDER === 'sqs'
          ? sqsQueueService
          : localQueueService;
      },
      inject: [LocalQueueService, SqsQueueService],
    },
  ],

  exports: [IdempotencyCacheService],
})
export class PaymentsModule {}
